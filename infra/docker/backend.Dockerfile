FROM python:3.12-slim
COPY backend/ /app/backend
COPY modules/ /app/modules
COPY modules.lock.yaml /app/modules.lock.yaml
WORKDIR /app/backend
RUN pip install uv && uv sync
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]