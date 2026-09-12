# =============================================================================
# tidyorg-dashboard — static SPA served by nginx, runtime-configurable
# =============================================================================
#   docker build -t tidyorg-dashboard:dev .
#
#   docker run --rm -p 8080:8080 \
#     -e GITHUB_CLIENT_ID=Iv23... \
#     -e CONFIG_OWNER=your-org \
#     -e CONFIG_REPO=your-config-repo \
#     tidyorg-dashboard:dev
#
# VITE_* are intentionally NOT baked in: values are injected at runtime into
# env.js (window.__ENV__), so one image serves any org. Device Flow is proxied
# same-origin under /gh-oauth/ (see nginx.conf), so no backend is needed.
# =============================================================================

# --- Stage 1: build the SPA -------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . ./
RUN npm run build

# --- Stage 2: serve ---------------------------------------------------------
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html
# The stock nginx image runs every executable script in /docker-entrypoint.d/
# before starting nginx; this one writes env.js from the runtime environment.
COPY env-entrypoint.sh /docker-entrypoint.d/40-tidyorg-env.sh
RUN chmod +x /docker-entrypoint.d/40-tidyorg-env.sh
EXPOSE 8080
