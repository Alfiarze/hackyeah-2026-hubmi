# --- build stage ------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime stage ----------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27-alpine
LABEL org.opencontainers.image.title="hubmi-landing" \
      org.opencontainers.image.description="Landing page HubMI.pl — Małopolski Hub Innowacji Społecznych (HackYeah 2026)"

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null 2>&1 || exit 1
