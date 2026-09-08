# =============================================================================
# tidyorg — single image: engine (Terraform) + dashboard (static SPA via nginx)
# =============================================================================
#   docker build -t tidyorg:dev .
#
#   # Dashboard:
#   docker run --rm -p 8080:8080 \
#     -e GITHUB_CLIENT_ID=Iv23... -e CONFIG_OWNER=your-org \
#     -e CONFIG_REPO=your-config-repo tidyorg:dev serve
#
#   # Engine:
#   docker run --rm -v ./config:/config -v ./state:/state \
#     -v ./app.pem:/secrets/app.pem \
#     -e TF_VAR_github_org_name=your-org -e TF_VAR_github_app_id=... \
#     -e TF_VAR_github_app_installation_id=... tidyorg:dev plan
#
# Config, state, backend.tf and imports.tf are never baked in (see .dockerignore);
# the entrypoint forces a local backend and injects dashboard runtime config.
# =============================================================================

# --- Stage 1: build the dashboard -------------------------------------------
FROM node:22-alpine AS dashboard
WORKDIR /app
COPY dashboard/package.json dashboard/package-lock.json ./
RUN npm ci
COPY dashboard/ ./
# VITE_* are intentionally NOT set here: values are injected at runtime via
# env.js (window.__ENV__), so one image serves any org.
RUN npm run build

# --- Stage 2: engine + nginx ------------------------------------------------
FROM hashicorp/terraform:1.9
RUN apk add --no-cache nginx

WORKDIR /engine

# Engine only: config/, backend.tf, imports.tf, state, .terraform excluded by
# .dockerignore. The provider lock file IS copied for reproducible versions.
COPY terraform/ /engine/
COPY docker/entrypoint.sh /usr/local/bin/tidyorg-entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=dashboard /app/dist /usr/share/nginx/html

# Fully initialize with the SAME local backend the entrypoint uses at runtime, so
# runtime `terraform init` sees no backend change and works offline.
RUN chmod +x /usr/local/bin/tidyorg-entrypoint \
  && printf 'terraform {\n  backend "local" {\n    path = "/state/terraform.tfstate"\n  }\n}\n' > /engine/backend.tf \
  && terraform init -input=false

ENV TF_VAR_config_path=/config
EXPOSE 8080

ENTRYPOINT ["/usr/local/bin/tidyorg-entrypoint"]
CMD ["plan"]
