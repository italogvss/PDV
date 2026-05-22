# =============================================================
# Frontend PDV-Ultra - imagem multi-estagio
#   dev    -> desenvolvimento: Vite dev server com HMR
#   final  -> producao: build estatico servido por nginx
# =============================================================

# -- Estagio de desenvolvimento (docker-compose.yml) ----------
# O codigo entra por bind mount; node_modules vem desta imagem.
FROM node:22-alpine AS dev
WORKDIR /app
COPY package*.json ./
RUN npm ci
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# -- Estagio de build de producao -----------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Variaveis VITE_* sao embutidas no bundle no momento do build.
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# -- Estagio final de producao: nginx -------------------------
FROM nginx:alpine AS final
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
