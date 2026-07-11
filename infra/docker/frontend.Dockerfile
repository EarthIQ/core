FROM node:20-slim
RUN corepack enable
COPY frontend/ /app/frontend
COPY modules/ /app/modules
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm --filter web build
CMD ["pnpm", "--filter", "web", "dev"]