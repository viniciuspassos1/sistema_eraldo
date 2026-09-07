import re
import unicodedata
from pathlib import Path

import chromadb
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
CHROMA_DIR = BASE_DIR / "chroma_data"
COLLECTION_NAME = "knowledge_base"

# Multilíngue, roda em CPU — a documentação do escritório é toda em
# português. O modelo "MiniLM" menor (384-dim) testado antes tinha
# discriminação semântica fraca demais nesses documentos curtos (ex.:
# confundia "sistemas usados" com "horário de expediente"); esse aqui
# (768-dim, ~1.1GB) resolveu os casos de teste corretamente.
EMBEDDING_MODEL = "paraphrase-multilingual-mpnet-base-v2"

# Distância de cosseno (0 = idêntico, 2 = oposto). Acima disso, o trecho mais
# próximo ainda está longe demais pra virar resposta — preferimos dizer que
# não achamos a inventar ou "quase acertar".
DISTANCE_THRESHOLD = 0.65

# Peso de cada sinal na fusão (ver _pontuar_candidatos). Léxico pesa mais:
# nessa base pequena e curada, um documento cujo título tem a palavra exata
# da pergunta ("missão", "visão") quase sempre É a resposta certa — é um
# sinal mais confiável aqui do que a distância semântica, que tropeça em
# textos curtos e abstratos (ver comentário em answer_question). Testado
# com perguntas reais antes de fixar os valores; ver DISTANCE_THRESHOLD
# pro "não encontrado".
_PESO_SEMANTICO = 0.4
_PESO_LEXICO = 0.6

NOT_FOUND_MESSAGE = (
    "Não encontrei essa informação na documentação interna disponível. "
    "Recomendo consultar o responsável pelo setor."
)

# Categorias que coincidem com um setor real (usuarios.setor) são tratadas
# como restritas a esse setor; qualquer outra categoria (Atendimento,
# Sistemas, Manual Interno etc.) é considerada geral, visível a todos.
# ADMINISTRADOR sempre vê tudo, independente do próprio setor.
SETORES_CONHECIDOS = {"Jurídico", "Financeiro", "Recursos Humanos", "Previdenciário", "Administrativo"}

_model: SentenceTransformer | None = None
_collection = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(EMBEDDING_MODEL)
    return _model


def _get_collection():
    global _collection
    if _collection is None:
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        _collection = client.get_or_create_collection(
            COLLECTION_NAME, metadata={"hnsw:space": "cosine"}
        )
    return _collection


def _not_found() -> dict:
    return {"resposta": NOT_FOUND_MESSAGE, "fontes": [], "encontrado": False}


# Stopwords (artigo, preposição, pronome comum) removidas antes do BM25 —
# sem isso, palavras como "do"/"a"/"escritório" (presentes em quase todo
# título/documento do corpus) davam score léxico não-zero pra qualquer par
# pergunta/documento, o que (a) atrapalhava o ranking real ("escritório"
# dominando por frequência, em vez das palavras que realmente distinguem
# um documento do outro) e (b) quebrava o "não encontrado": uma pergunta
# totalmente fora do escopo (ex.: sobre motocicletas) ainda tinha uma
# palavra comum em comum com algum documento, então nunca batia score 0.
# Já sem acento (o filtro roda depois de _tokenizar tirar os acentos).
_STOPWORDS_PT = {
    "a", "o", "os", "as", "de", "do", "da", "dos", "das", "e", "um", "uma",
    "uns", "umas", "para", "com", "no", "na", "nos", "nas", "em", "por", "se",
    "ao", "aos", "como", "qual", "quais", "que", "quem", "sobre",
    "sao", "ser", "esta", "isso", "este", "essa", "esse", "seu",
    "sua", "seus", "suas", "nosso", "nossa", "nossos", "nossas", "ou", "mais",
    "menos", "muito", "ja", "tem", "ha", "foi", "eu", "voce",
}


def _tokenizar(texto: str) -> list[str]:
    # Sem acento e minúsculo, pra "missão" (no título) e "missao" (como a
    # pessoa costuma digitar, sem acentuação) caírem no mesmo token — o BM25
    # é busca por palavra exata, não tem a tolerância implícita do embedding.
    sem_acento = unicodedata.normalize("NFKD", texto.lower()).encode("ascii", "ignore").decode("ascii")
    tokens = re.findall(r"\w+", sem_acento)
    return [t for t in tokens if t not in _STOPWORDS_PT]


def _visivel(categoria: str | None, setor_usuario: str, is_admin: bool) -> bool:
    if is_admin:
        return True
    if categoria not in SETORES_CONHECIDOS:
        return True
    return categoria == setor_usuario


def answer_question(pergunta: str, setor_usuario: str, is_admin: bool, top_k: int = 2) -> dict:
    """
    Busca puramente por retrieval: nenhum LLM reescreve o texto. A "resposta"
    é o(s) trecho(s) mais relevante(s) da documentação, tal como estão
    escritos — garante que o assistente nunca inventa nem extrapola.

    Busca híbrida: combina o ranking semântico (embedding) com um ranking
    léxico (BM25). Sozinho, o embedding erra em documentos curtos e abstratos
    onde a palavra da pergunta está literalmente no título mas não tem
    correspondente direto no corpo (ex.: "qual a missão do escritório"
    perdia pra "Horário de Funcionamento", que repete a palavra "escritório"
    no corpo) — o BM25 pega exatamente esse caso.

    A fusão soma os dois scores já normalizados pro intervalo [0, 1] (ver
    _PESO_SEMANTICO/_PESO_LEXICO acima), em vez de fundir só a posição de
    cada um (Reciprocal Rank Fusion) — testado e descartado: RRF "achata"
    a vantagem de um vencedor disparado no BM25 (ex.: "missão" pontuando
    4.6 contra ~0.9 do segundo colocado) porque só enxerga posição no
    ranking, não a distância entre os candidatos, e por isso um documento
    com afinidade semântica média mas nenhuma palavra em comum de verdade
    ainda vencia. Somar os scores normalizados preserva essa margem.

    Busca no corpus inteiro (não só um top-N) porque a base de conhecimento
    é pequena — o BM25 precisa ver todo mundo pra ranquear direito, e nesse
    tamanho não há custo perceptível em rodar os dois rankings sobre tudo.
    """
    collection = _get_collection()
    total = collection.count()
    if total == 0:
        return _not_found()

    model = _get_model()
    query_embedding = model.encode([pergunta], normalize_embeddings=True).tolist()

    result = collection.query(query_embeddings=query_embedding, n_results=total)

    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]

    candidatos = [
        {"doc": doc, "meta": meta, "dist": dist}
        for doc, meta, dist in zip(documents, metadatas, distances)
        if _visivel(meta.get("categoria"), setor_usuario, is_admin)
    ]
    if not candidatos:
        return _not_found()

    corpus_tokenizado = [
        _tokenizar(f"{c['meta'].get('titulo', '')} {c['meta'].get('categoria', '')} {c['doc']}")
        for c in candidatos
    ]
    scores_lexicais = BM25Okapi(corpus_tokenizado).get_scores(_tokenizar(pergunta))
    maior_score_lexical = max(scores_lexicais, default=0) or 1  # evita divisão por zero

    # Distância de cosseno vira "similaridade" (maior = melhor, como o BM25)
    # só dividindo pela maior distância observada nesta busca — não precisa
    # do range teórico [0,2], só de uma escala comum entre os candidatos
    # desta pergunta específica.
    maior_distancia = max(c["dist"] for c in candidatos) or 1

    for i, c in enumerate(candidatos):
        c["score_lexical"] = scores_lexicais[i]
        similaridade_normalizada = 1 - (c["dist"] / maior_distancia)
        lexical_normalizado = scores_lexicais[i] / maior_score_lexical
        c["score_fundido"] = _PESO_SEMANTICO * similaridade_normalizada + _PESO_LEXICO * lexical_normalizado

    candidatos.sort(key=lambda c: c["score_fundido"], reverse=True)

    # "Não encontrado" só quando NENHUM dos dois sinais aponta relevância no
    # melhor candidato — antes, um match só léxico (sem overlap semântico
    # forte) era descartado à toa; agora qualquer um dos dois sinais basta.
    melhor = candidatos[0]
    if melhor["dist"] > DISTANCE_THRESHOLD and melhor["score_lexical"] <= 0:
        return _not_found()

    relevantes = [c for c in candidatos if c["dist"] <= DISTANCE_THRESHOLD or c["score_lexical"] > 0][:top_k]

    resposta = "\n\n".join(c["doc"] for c in relevantes)

    fontes = []
    vistos = set()
    for c in relevantes:
        meta = c["meta"]
        chave = (meta.get("titulo"), meta.get("categoria"))
        if chave in vistos:
            continue
        vistos.add(chave)
        fontes.append({"documento": meta.get("titulo", "Documentação interna"), "secao": meta.get("categoria", "")})

    return {"resposta": resposta, "fontes": fontes, "encontrado": True}
