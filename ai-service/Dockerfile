# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv package manager
RUN pip install --no-cache-dir uv

# Copy dependency files for installation
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

# Copy source code
COPY main.py ./
COPY app ./app

# Stage 2: Production image
FROM python:3.12-slim

WORKDIR /app

# Install uv again (needed for run command)
RUN pip install --no-cache-dir uv

# Copy built project from builder
COPY --from=builder /app /app

# Expose port
EXPOSE 8000

# Run FastAPI using uv
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
