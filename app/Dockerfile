# Build: React 18 + TypeScript + Vite 6 (dane bundlowane z src/data/)
FROM node:20-alpine AS build
WORKDIR /app
ENV CI=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve: nginx ze SPA fallback i proxy /api + /health -> backend
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
