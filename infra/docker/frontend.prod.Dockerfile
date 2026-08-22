# Production Dockerfile for frontend
FROM node:25-slim AS base
# Node 25 images no longer bundle corepack; install the pinned pnpm directly.
RUN npm install -g pnpm@9.15.0
WORKDIR /app

FROM base AS dependencies
COPY frontend/ /app/frontend
COPY modules/ /app/modules
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile

FROM dependencies AS build
RUN pnpm build

FROM nginx:alpine AS production
COPY --from=build /app/frontend/apps/web/dist /usr/share/nginx/html
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]