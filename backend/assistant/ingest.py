"""
Indexa backend/knowledge_base/**/*.md no ChromaDB.

Uso:
    python -m assistant.ingest

Roda de novo a qualquer momento que a documentação mudar — reconstrói a
coleção inteira do zero, então não deixa lixo de versões antigas de um
mesmo arquivo.
"""

import re
from pathlib import Path

import chromadb
from sentence_transformers import SentenceTransformer

from .rag import BASE_DIR, CHROMA_DIR, COLLECTION_NAME, EMBEDDING_MODEL

KNOWLEDGE_DIR = BASE_DIR / "knowledge_base"

# Chunking simples por parágrafo, com um teto de caracteres e overlap pra
# parágrafos que passarem do teto — os documentos de hoje são curtos (cabem
# num chunk só), mas isso já deixa pronto pra PDFs/DOCXs maiores no futuro,
# sem precisar mexer no pipeline.
MAX_CHUNK_CHARS = 800
CHUNK_OVERLAP = 100


def parse_document(path: Path) -> tuple[dict, str]:
    """Lê um .md com front-matter simples (---\\nchave: valor\\n---) e devolve (metadata, corpo)."""
    text = path.read_text(encoding="utf-8")
    metadata: dict[str, str] = {}
    body = text

    if text.startswith("---"):
        end = text.find("---", 3)
        if end != -1:
            front = text[3:end].strip()
            body = text[end + 3 :].strip()
            for line in front.splitlines():
                if ":" in line:
                    key, value = line.split(":", 1)
                    metadata[key.strip()] = value.strip()

    metadata.setdefault("titulo", path.stem.replace("-", " ").title())
    metadata.setdefault("categoria", "Documentação")
    return metadata, body


def chunk_text(text: str, max_chars: int = MAX_CHUNK_CHARS, overlap: int = CHUNK_OVERLAP) -> list[str]:
    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for paragraph in paragraphs:
        candidate = f"{current}\n\n{paragraph}".strip() if current else paragraph
        if len(candidate) <= max_chars:
            current = candidate
            continue

        if current:
            chunks.append(current)
            current = ""

        if len(paragraph) <= max_chars:
            current = paragraph
            continue

        start = 0
        while start < len(paragraph):
            chunks.append(paragraph[start : start + max_chars])
            start += max_chars - overlap

    if current:
        chunks.append(current)

    return chunks or ([text.strip()] if text.strip() else [])


def run() -> None:
    files = sorted(KNOWLEDGE_DIR.rglob("*.md"))
    if not files:
        print(f"Nenhum arquivo .md encontrado em {KNOWLEDGE_DIR}")
        return

    print(f"Carregando modelo de embeddings ({EMBEDDING_MODEL})... (primeira vez baixa o modelo, pode demorar)")
    model = SentenceTransformer(EMBEDDING_MODEL)

    client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    existing = {c.name for c in client.list_collections()}
    if COLLECTION_NAME in existing:
        client.delete_collection(COLLECTION_NAME)
    collection = client.get_or_create_collection(COLLECTION_NAME, metadata={"hnsw:space": "cosine"})

    ids: list[str] = []
    texts: list[str] = []
    embed_texts: list[str] = []
    metadatas: list[dict] = []

    for path in files:
        metadata, body = parse_document(path)
        for i, chunk in enumerate(chunk_text(body)):
            ids.append(f"{path.stem}-{i}")
            texts.append(chunk)
            # O título carrega bastante sinal semântico ("FAQ - Sistemas
            # utilizados pelo escritório") que se perde se só o corpo do
            # parágrafo for embedado — inclui no texto usado pro embedding,
            # mas guarda o chunk original (sem o título) como "documents",
            # que é o que vira a resposta mostrada ao usuário.
            embed_texts.append(f"{metadata.get('titulo', '')} — {metadata.get('categoria', '')}\n{chunk}")
            metadatas.append({**metadata, "arquivo": path.name})

    print(f"Gerando embeddings para {len(texts)} trecho(s) de {len(files)} documento(s)...")
    embeddings = model.encode(embed_texts, normalize_embeddings=True).tolist()

    collection.upsert(ids=ids, embeddings=embeddings, documents=texts, metadatas=metadatas)
    print(f"Indexado: {len(texts)} trecho(s) em {CHROMA_DIR}")


if __name__ == "__main__":
    run()
