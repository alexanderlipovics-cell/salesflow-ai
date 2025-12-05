# SalesFlow AI Backend - Production Dockerfile
# Optimiert für Railway, Render, Fly.io

FROM python:3.11-slim

# Arbeitsverzeichnis
WORKDIR /app

# System Dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Python Dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Anwendungscode kopieren
COPY . .

# Port (wird von Railway/Render gesetzt)
ENV PORT=8000
EXPOSE $PORT

# Health Check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT}/health')" || exit 1

# Start Command
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

