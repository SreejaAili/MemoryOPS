# Multi-stage Dockerfile for MemoryOps Backend API
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy backend dependencies and install
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application code and initial database directory
COPY backend/ ./backend/
COPY data/ ./data/

# Default environment configuration
ENV DATABASE_URL="sqlite:///../data/incidentiq.db"
ENV HINDSIGHT_BANK_ID="memoryops"
ENV GROQ_MODEL="openai/gpt-oss-20b"

EXPOSE 8000

WORKDIR /app/backend
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
