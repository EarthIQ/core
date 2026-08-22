# Development Dockerfile for frontend with hot reload
FROM node:25-slim AS base
# Node 25 images no longer bundle corepack; install the pinned pnpm directly.
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS dependencies
COPY frontend/ /app/frontend
COPY modules/ /app/modules
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM dependencies AS development
CMD ["pnpm", "--filter", "web", "dev"]