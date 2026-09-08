#!/bin/sh
# =============================================================================
# tidyorg entrypoint — one image, two modes
# =============================================================================
#   tidyorg serve                → serve the dashboard (nginx, static SPA)
#   tidyorg plan|apply|validate  → run the Terraform engine
#
# The image ships the engine (modules, templates, root .tf) AND the built
# dashboard. Config and state are mounted at runtime; the backend is forced local
# (the committed HCP backend.tf is never copied in — see .dockerignore).
#
#   docker run -p 8080:8080 -e GITHUB_CLIENT_ID=... -e CONFIG_OWNER=... \
#     -e CONFIG_REPO=... tidyorg serve
#
#   docker run -v ./config:/config -v ./state:/state -v ./app.pem:/secrets/app.pem \
#     -e TF_VAR_github_org_name=... -e TF_VAR_github_app_id=... \
#     -e TF_VAR_github_app_installation_id=... tidyorg plan
# =============================================================================
set -eu

CMD="${1:-plan}"

# --- Dashboard mode ---------------------------------------------------------
# Static SPA. No Terraform, no credentials. Runtime config is injected into
# env.js (window.__ENV__), which the dashboard reads before build-time values.
if [ "$CMD" = "serve" ]; then
  cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_GITHUB_CLIENT_ID: "${GITHUB_CLIENT_ID:-}",
  VITE_CONFIG_OWNER: "${CONFIG_OWNER:-}",
  VITE_CONFIG_REPO: "${CONFIG_REPO:-}",
  VITE_CONFIG_BRANCH: "${CONFIG_BRANCH:-main}"
};
EOF
  exec nginx -g 'daemon off;'
fi

# --- Engine mode ------------------------------------------------------------
ENGINE_DIR=/engine
CONFIG_DIR="${CONFIG_PATH:-/config}"
STATE_DIR="${STATE_PATH:-/state}"

cd "$ENGINE_DIR"

# Backend: always local inside the container (state on the mounted volume).
mkdir -p "$STATE_DIR"
cat > backend.tf <<EOF
terraform {
  backend "local" {
    path = "${STATE_DIR}/terraform.tfstate"
  }
}
EOF

# Point the engine at the mounted config.
export TF_VAR_config_path="$CONFIG_DIR"

# GitHub App private key: prefer a mounted file, else the env var.
if [ -f /secrets/app.pem ]; then
  TF_VAR_github_app_pem_file="$(cat /secrets/app.pem)"
  export TF_VAR_github_app_pem_file
fi

# Credentials only matter for commands that hit the API.
case "$CMD" in
  version | validate | fmt) : ;;
  *)
    : "${TF_VAR_github_org_name:?set TF_VAR_github_org_name (your GitHub org)}"
    : "${TF_VAR_github_app_id:?set TF_VAR_github_app_id}"
    : "${TF_VAR_github_app_installation_id:?set TF_VAR_github_app_installation_id}"
    if [ ! -f /secrets/app.pem ] && [ -z "${TF_VAR_github_app_pem_file:-}" ]; then
      echo "error: provide the GitHub App private key via -v ./app.pem:/secrets/app.pem or TF_VAR_github_app_pem_file" >&2
      exit 2
    fi
    ;;
esac

terraform init -input=false >/dev/null

case "$CMD" in
  plan) terraform plan -input=false ;;
  apply) terraform apply -input=false -auto-approve ;;
  validate) terraform validate ;;
  output)
    shift
    terraform output "$@"
    ;;
  version) terraform version ;;
  *) exec terraform "$@" ;;
esac
