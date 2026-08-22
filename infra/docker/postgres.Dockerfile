FROM postgis/postgis:18-3.6 AS builder

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    build-essential \
    postgresql-server-dev-18 \
    ca-certificates \
    && git clone --branch v0.8.1 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make OPTFLAGS="" \
    && make install

FROM postgis/postgis:18-3.6

# Copy only the compiled extension files from the builder stage
COPY --from=builder /usr/share/postgresql/18/extension/vector* /usr/share/postgresql/18/extension/
COPY --from=builder /usr/lib/postgresql/18/lib/vector.so /usr/lib/postgresql/18/lib/