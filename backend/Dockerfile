FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required for psycopg2 compilation if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Expose backend port
EXPOSE 8001

# Run backend using Uvicorn (supports default port 8001 and dynamic cloud $PORT e.g. on Render)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8001}"]
