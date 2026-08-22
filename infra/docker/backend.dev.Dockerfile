# Development Dockerfile for backend with hot reload
FROM python:3.14.2-slim-trixie

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
# At runtime the compose file bind-mounts ./modules over /app/modules, so the
# mounted sources always win — this copy only exists to resolve module deps.
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

# Expose port
EXPOSE 8000

# Run with hot reload for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]