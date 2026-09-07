"""
Indexa backend/knowledge_base/**/*.{md,docx,pdf} no índice local do
Assistente IA (backend/rag_index/ — embeddings.npy + dados.json).

Uso:
    python -m assistant.ingest

Roda de novo a qualquer momento que a documentação mudar — reconstrói o
índice inteiro do zero, então não deixa lixo de versões antigas de um
mesmo arquivo. Basta soltar um arquivo novo em knowledge_base/ (.md, .docx
ou .pdf) e rodar de novo — não precisa mexer em código.
"""

import json
import re
from pathlib import Path

import numpy as np
from docx import Document
from pypdf import PdfReader
from sentence_transformers import SentenceTransformer

from .rag import BASE_DIR, DADOS_PATH, EMBEDDING_MODEL, EMBEDDINGS_PATH, INDEX_DIR

KNOWLEDGE_DIR = BASE_DIR / "knowledge_base"
SUPPORTED_SUFFIXES = (".md", ".docx", ".pdf")

# Chunking simples por parágrafo, com um teto de caracteres e overlap pra
# parágrafos que passarem do teto — os documentos de hoje são curtos (cabem
# num chunk só), mas isso já deixa pronto pra PDFs/DOCXs maiores.
MAX_CHUNK_CHARS = 800
CHUNK_OVERLAP = 100


def _read_md(path: Path) -> tuple[dict, str]:
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

    return metadata, body


def _read_docx(path: Path) -> tuple[dict, str]:
    doc = Document(str(path))
    paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
    return {}, "\n\n".join(paragraphs)


def _read_pdf(path: Path) -> tuple[dict, str]:
    reader = PdfReader(str(path))
    pages = [(page.extract_text() or "").strip() for page in reader.pages]
    return {}, "\n\n".join(p for p in pages if p)


def parse_document(path: Path) -> tuple[dict, str]:
    """Lê .md/.docx/.pdf e devolve (metadata, corpo). .docx e .pdf não têm
    front-matter, então título e categoria caem no nome do arquivo e da pasta."""
    if path.suffix == ".md":
        metadata, body = _read_md(path)
    elif path.suffix == ".docx":
        metadata, body = _read_docx(path)
    elif path.suffix == ".pdf":
        metadata, body = _read_pdf(path)
    else:
        raise ValueError(f"Formato não suportado: {path.suffix}")

    metadata.setdefault("titulo", path.stem.replace("-", " ").replace("_", " ").title())
    metadata.setdefault("categoria", path.parent.name.replace("-", " ").title())
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
    files = sorted(
        p for p in KNOWLEDGE_DIR.rglob("*") if p.suffix in SUPPORTED_SUFFIXES
    )
    if not files:
        print(f"Nenhum arquivo .md/.docx/.pdf encontrado em {KNOWLEDGE_DIR}")
        return

    print(f"Carregando modelo de embeddings ({EMBEDDING_MODEL})... (primeira vez baixa o modelo, pode demorar)")
    model = SentenceTransformer(EMBEDDING_MODEL)

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
    embeddings = model.encode(embed_texts, normalize_embeddings=True).astype("float32")

    INDEX_DIR.mkdir(exist_ok=True)
    np.save(EMBEDDINGS_PATH, embeddings)
    dados = [{"id": ids[i], "documento": texts[i], "metadata": metadatas[i]} for i in range(len(ids))]
    DADOS_PATH.write_text(json.dumps(dados, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Indexado: {len(texts)} trecho(s) em {INDEX_DIR}")


if __name__ == "__main__":
    run()
