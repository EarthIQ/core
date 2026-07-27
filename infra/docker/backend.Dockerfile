FROM python:3.12-slim AS base
WORKDIR /app
RUN pip install uv

FROM base AS development
COPY backend/ /app/backend
COPY modules/ /app/modules
COPY modules.lock.yaml /app/modules.lock.yaml
WORKDIR /app/backend
RUN uv sync
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

FROM base AS production
COPY backend/ /app/backend
COPY modules/ /app/modules
COPY modules.lock.yaml /app/modules.lock.yaml
WORKDIR /app/backend
RUN uv sync --no-dev
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]