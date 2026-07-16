# ---------- build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Copy manifests first for better layer caching
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# Copy sources and build. REACT_APP_BACKEND_URL is baked in at build time.
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=${REACT_APP_BACKEND_URL}
COPY . .
RUN yarn build

# ---------- runtime stage ----------
FROM nginx:1.27-alpine AS runtime

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1
