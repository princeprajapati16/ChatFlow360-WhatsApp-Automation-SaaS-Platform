FROM python:3.12-slim

# System deps
RUN apt-get update && apt-get install -y \
    libpq-dev gcc curl netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Create app user (don't run as root)
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Install Python deps first (layer cache)
COPY requirements.txt .
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . .

# Create dirs
RUN mkdir -p /app/staticfiles /app/media && \
    chown -R appuser:appuser /app

USER appuser

EXPOSE 8000
