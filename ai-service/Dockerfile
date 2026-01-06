# ===========================================
# Stage 1: Builder - Install dependencies
# ===========================================
FROM python:3.13-slim-bookworm AS builder

WORKDIR /app

# Install build dependencies only in builder stage
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast dependency management
RUN pip install --no-cache-dir uv

# Copy dependency files
COPY pyproject.toml uv.lock* ./

# Create virtual environment
RUN uv venv

# Install all dependencies EXCEPT PyTorch first (from PyPI)
RUN uv pip install --no-cache-dir \
    fastapi>=0.121.2 \
    langchain>=0.3.0 \
    langchain-google-genai>=2.0.0 \
    langchain-core>=0.3.0 \
    pydantic>=2.12.4 \
    pydantic-settings>=2.0.0 \
    python-dotenv>=1.2.1 \
    "uvicorn[standard]>=0.38.0" \
    google-generativeai>=0.3.0

# Install PyTorch CPU-only version FIRST (smallest option ~800MB vs ~8GB CUDA)
RUN uv pip install --no-cache-dir \
    torch \
    --extra-index-url https://download.pytorch.org/whl/cpu

# Then install sentence-transformers with all dependencies
RUN uv pip install --no-cache-dir \
    sentence-transformers>=2.2.2

# Pre-download sentence-transformers model during build
RUN mkdir -p /tmp/model-cache && \
    .venv/bin/python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', cache_folder='/tmp/model-cache')" && \
    chown -R 1001:1001 /tmp/model-cache

# Clean pip cache to save space
RUN rm -rf /root/.cache/pip /root/.cache/uv

# ===========================================
# Stage 2: Runtime - Minimal production image
# ===========================================
FROM python:3.13-slim-bookworm AS runner

WORKDIR /app

# Install only runtime dependencies (wget for healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user for security
RUN groupadd --system --gid 1001 python && \
    useradd --system --uid 1001 --gid python python && \
    mkdir -p /home/python/.cache && \
    chown -R python:python /home/python/.cache

# Copy virtual environment from builder
COPY --from=builder --chown=python:python /app/.venv /app/.venv

# Copy pre-downloaded models from builder
COPY --from=builder --chown=python:python /tmp/model-cache /home/python/.cache/huggingface

# Copy application code
COPY --chown=python:python main.py ./
COPY --chown=python:python app ./app

# Set PATH to use virtual environment
ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV HF_HOME=/home/python/.cache/huggingface
ENV TRANSFORMERS_CACHE=/home/python/.cache/huggingface

USER python

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
