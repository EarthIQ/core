FROM node:20-slim AS base
RUN corepack enable
WORKDIR /app

FROM base AS dependencies
COPY frontend/ /app/frontend
COPY modules/ /app/modules
WORKDIR /app/frontend
RUN pnpm install --frozen-lockfile

FROM dependencies AS development
CMD ["pnpm", "--filter", "web", "dev"]

FROM dependencies AS build
RUN pnpm --filter web build

FROM nginx:alpine AS production
COPY --from=build /app/frontend/apps/web/dist /usr/share/nginx/html
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]