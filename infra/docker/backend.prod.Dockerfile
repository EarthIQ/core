# Production Dockerfile with UV
FROM python:3.14.2-slim-trixie AS builder

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_SYSTEM_PYTHON=1 \
    UV_COMPILE_BYTECODE=1

# Install system dependencies and UV
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    pkg-config \
    libpq-dev \
    gdal-bin \
    libgdal-dev \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && curl -LsSf https://astral.sh/uv/install.sh | sh

# GDAL include paths
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

# Add UV to PATH
ENV PATH="/root/.local/bin:$PATH"

# Set work directory
WORKDIR /app/backend

# Copy dependency files (project lives under backend/)
COPY backend/pyproject.toml backend/uv.lock* ./

# Copy module backends so their declared runtime dependencies get installed.
COPY modules/ /app/modules/

# Install dependencies using UV (installs into system site-packages):
# 1) core backend dependencies
# 2) every installed module's backend dependencies (e.g. ai-module needs httpx)
RUN export GDAL_VERSION=$(gdalinfo --version | awk '{print $2}' | tr -d ',') && \
    echo "Building Fiona/Rasterio with GDAL_VERSION=$GDAL_VERSION" && \
    uv pip install --system -r pyproject.toml && \
    for mod_pyproject in /app/modules/*/backend/pyproject.toml; do \
      if [ -f "$mod_pyproject" ]; then \
        echo "Installing module dependencies from $mod_pyproject"; \
        uv pip install --system -r "$mod_pyproject" || \
          echo "WARN: failed to install deps from $mod_pyproject"; \
      fi; \
    done


# Production image
FROM python:3.14.2-slim-trixie

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_HOME=/app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    gdal-bin \
    tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.14/site-packages /usr/local/lib/python3.14/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Set work directory
WORKDIR $APP_HOME

# Copy application code, mirroring the module layout from the current Dockerfile
COPY --chown=appuser:appuser backend/ /app/backend/
COPY --chown=appuser:appuser modules/ /app/modules/
COPY --chown=appuser:appuser modules.lock.yaml /app/modules.lock.yaml
COPY --chown=appuser:appuser infra/scripts/ /app/infra/scripts/
# .env is read via env_file=".env" relative to the app working directory
COPY --chown=appuser:appuser .env /app/backend/.env

# Make scripts executable
RUN chmod +x /app/infra/scripts/*.sh

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 8000

# Health check (matches existing /api/health endpoint)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/health || exit 1

# Setup ENTRYPOINT for clean process management
ENTRYPOINT ["/usr/bin/tini", "--"]

# Run from the backend directory so `app.main:app` resolves
WORKDIR /app/backend

# Run the application
CMD ["/app/infra/scripts/start.sh"]