#!/bin/sh
# =============================================================================
# tidyorg engine entrypoint
# =============================================================================
# The image ships the Terraform engine (modules, templates, root .tf) but NOT any
# config or state. At runtime:
#   - config is mounted at /config       (-v ./config:/config)
#   - state lives on a mounted volume    (-v ./state:/state)
#   - the backend is forced to LOCAL here (the committed backend.tf HCP block is
#     never copied into the image; see .dockerignore)
#
# Usage:  docker run ... tidyorg <plan|apply|validate|output|version|...>
# =============================================================================
set -eu

ENGINE_DIR=/engine
CONFIG_DIR="${CONFIG_PATH:-/config}"
STATE_DIR="${STATE_PATH:-/state}"

cd "$ENGINE_DIR"

# --- 1. Backend: always local inside the container --------------------------
# State on the mounted volume, so nothing depends on HCP / Terraform Cloud.
mkdir -p "$STATE_DIR"
cat > backend.tf <<EOF
terraform {
  backend "local" {
    path = "${STATE_DIR}/terraform.tfstate"
  }
}
EOF

# --- 2. Point the engine at the mounted config ------------------------------
export TF_VAR_config_path="$CONFIG_DIR"

# --- 3. GitHub App private key ----------------------------------------------
# Prefer a mounted PEM file (-v ./app.pem:/secrets/app.pem); fall back to the
# TF_VAR_github_app_pem_file env var if the caller set it directly.
if [ -f /secrets/app.pem ]; then
  TF_VAR_github_app_pem_file="$(cat /secrets/app.pem)"
  export TF_VAR_github_app_pem_file
fi

# --- 4. Friendly checks for the required inputs ------------------------------
CMD="${1:-plan}"
case "$CMD" in
  version | validate | fmt) : ;; # these don't need credentials
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

# --- 5. Init (local backend) then dispatch ----------------------------------
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
