FROM node:22.20.0-bookworm-slim AS build
WORKDIR /app

COPY client/package*.json client/

RUN npm --prefix client ci

COPY shared ./shared
COPY client ./client

RUN npm --prefix client run build

FROM nginx:1.27-alpine AS runtime

ENV BACKEND_UPSTREAM=http://tiao-server:3000
ENV ESC='$'

COPY client/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/client/build /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=5 CMD wget -q -O /dev/null http://127.0.0.1/healthz || exit 1
