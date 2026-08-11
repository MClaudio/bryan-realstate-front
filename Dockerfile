# syntax=docker/dockerfile:1
# ---- Etapa 1: build (compila TS y genera el bundle con Vite) ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Variables de build de Vite: se hornean en el bundle, por eso van como ARG
# y se pasan con --build-arg desde el workflow (no son secrets en runtime).
ARG VITE_API_URL
ARG VITE_APP_NAME
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}

COPY . .
RUN npm run build

RUN echo "Build completed at $(date)" > dist/build-info.txt

# ---- Etapa 2: runtime (nginx sirviendo el build estático) ----
FROM nginx:stable-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
