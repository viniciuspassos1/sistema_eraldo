# Imagem de produção do backend (FastAPI). Builda com a mesma base de
# conhecimento já indexada (assistant/ingest.py) para o Assistente IA já
# subir pronto, sem depender de rodar o ingest manualmente no servidor.
FROM python:3.14-slim

WORKDIR /app

# libpq5: biblioteca de runtime que o psycopg2-binary espera encontrar no
# sistema em imagens slim/Debian.
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# --extra-index-url do PyTorch: sem isso, pip resolve a variante do torch
# com suporte a CUDA (usada pelo sentence-transformers), que pesa bem mais
# e é inútil aqui — o servidor não tem GPU. Com o índice extra, pip prefere
# a build CPU-only quando disponível.
RUN pip install --no-cache-dir --extra-index-url https://download.pytorch.org/whl/cpu -r requirements.txt

COPY . .

# Baixa o modelo de embeddings e já gera o rag_index/ na imagem, em vez de
# fazer isso na primeira requisição em produção (evita um cold start lento
# e a necessidade de internet no servidor depois do deploy). Repetir esse
# passo é o mesmo processo usado em dev (python -m assistant.ingest) —
# rodar de novo a cada build pega qualquer mudança em knowledge_base/.
RUN python -m assistant.ingest

EXPOSE 8010

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
