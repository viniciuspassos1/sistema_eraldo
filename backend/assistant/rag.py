from pathlib import Path

import chromadb
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

NOT_FOUND_MESSAGE = (
    "Não encontrei essa informação na documentação interna disponível. "
    "Recomendo consultar o responsável pelo setor."
)

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


def answer_question(pergunta: str, top_k: int = 3) -> dict:
    """
    Busca puramente por retrieval: nenhum LLM reescreve o texto. A "resposta"
    é o(s) trecho(s) mais relevante(s) da documentação, tal como estão
    escritos — garante que o assistente nunca inventa nem extrapola.
    """
    collection = _get_collection()
    if collection.count() == 0:
        return _not_found()

    model = _get_model()
    query_embedding = model.encode([pergunta], normalize_embeddings=True).tolist()

    result = collection.query(
        query_embeddings=query_embedding,
        n_results=min(top_k, collection.count()),
    )

    documents = result["documents"][0]
    metadatas = result["metadatas"][0]
    distances = result["distances"][0]

    if not documents or distances[0] > DISTANCE_THRESHOLD:
        return _not_found()

    relevantes = [
        (doc, meta)
        for doc, meta, dist in zip(documents, metadatas, distances)
        if dist <= DISTANCE_THRESHOLD
    ][:2]

    resposta = "\n\n".join(doc for doc, _ in relevantes)

    fontes = []
    vistos = set()
    for _, meta in relevantes:
        chave = (meta.get("titulo"), meta.get("categoria"))
        if chave in vistos:
            continue
        vistos.add(chave)
        fontes.append({"documento": meta.get("titulo", "Documentação interna"), "secao": meta.get("categoria", "")})

    return {"resposta": resposta, "fontes": fontes, "encontrado": True}
