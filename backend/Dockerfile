# Imagem de produção do backend (FastAPI).
FROM python:3.14-slim

WORKDIR /app

# libpq5: biblioteca de runtime que o psycopg2-binary espera encontrar no
# sistema em imagens slim/Debian. postgresql-client: dá o binário pg_dump
# usado pelo backup automático do banco (backend/backup.py) — sem ele, todo
# backup falharia com "pg_dump não encontrado".
RUN apt-get update && apt-get install -y --no-install-recommends libpq5 postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8010

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8010"]
