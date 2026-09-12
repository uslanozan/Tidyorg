#!/bin/sh
# =============================================================================
# tidyorg engine entrypoint
# =============================================================================
#   tidyorg scaffold                           → copy starter YAML into /config
#   tidyorg plan|apply|validate|output|version  → run the Terraform engine
#
# The image ships the engine (modules, templates, root .tf). Config and state are
# mounted at runtime; TF_STATE selects the backend (local|hcp|custom, default
# local). The dashboard is a SEPARATE image — see dashboard/Dockerfile.
#
#   docker run -v ./config:/config -v ./state:/state -v ./app.pem:/secrets/app.pem \
#     -e TF_VAR_github_org_name=... -e TF_VAR_github_app_id=... \
#     -e TF_VAR_github_app_installation_id=... tidyorg plan
# =============================================================================
set -eu

CMD="${1:-plan}"

# --- Engine ------------------------------------------------------------------
ENGINE_DIR=/engine
CONFIG_DIR="${CONFIG_PATH:-/config}"
STATE_DIR="${STATE_PATH:-/state}"

cd "$ENGINE_DIR"

# --- First-run config -------------------------------------------------------
# Keep scaffolding credential-free and refuse to overwrite an existing config.
if [ "$CMD" = "scaffold" ]; then
  mkdir -p "$CONFIG_DIR"

  if find "$CONFIG_DIR" -mindepth 1 -maxdepth 1 -print -quit | grep -q .; then
    echo "error: $CONFIG_DIR is not empty; refusing to overwrite it" >&2
    exit 2
  fi

  cp -R /opt/tidyorg/config.example/. "$CONFIG_DIR/"
  echo "Starter config copied to $CONFIG_DIR"
  exit 0
fi

# --- Backend selection ------------------------------------------------------
# TF_STATE controls where Terraform keeps its state:
#   local  (default) → on the mounted /state volume; zero setup.
#   hcp              → HCP Terraform / Terraform Cloud (recommended for teams).
#                      Requires TF_CLOUD_ORGANIZATION and TF_WORKSPACE, plus a
#                      token in TF_TOKEN_app_terraform_io.
#   custom           → bring your own backend: mount a backend.tf at
#                      /engine/backend.tf (S3, GCS, azurerm, …); it is left as-is.
# The image was `terraform init`ed with a local backend at build time, so any
# non-local mode re-inits with -reconfigure (providers stay cached).
STATE_MODE="${TF_STATE:-local}"
INIT_FLAGS="-input=false"

case "$STATE_MODE" in
  local)
    mkdir -p "$STATE_DIR"
    cat > backend.tf <<EOF
terraform {
  backend "local" {
    path = "${STATE_DIR}/terraform.tfstate"
  }
}
EOF
    ;;
  hcp | cloud | remote)
    : "${TF_CLOUD_ORGANIZATION:?TF_STATE=hcp requires TF_CLOUD_ORGANIZATION}"
    : "${TF_WORKSPACE:?TF_STATE=hcp requires TF_WORKSPACE}"
    if [ -z "${TF_TOKEN_app_terraform_io:-}" ]; then
      echo "error: TF_STATE=hcp requires a token in TF_TOKEN_app_terraform_io" >&2
      exit 2
    fi
    # Cloud integration is env-driven; a backend block must NOT be present.
    rm -f backend.tf
    INIT_FLAGS="$INIT_FLAGS -reconfigure"
    ;;
  custom)
    [ -f backend.tf ] || {
      echo "error: TF_STATE=custom needs your backend config mounted at /engine/backend.tf" >&2
      exit 2
    }
    INIT_FLAGS="$INIT_FLAGS -reconfigure"
    ;;
  *)
    echo "error: unknown TF_STATE='$STATE_MODE' (use local | hcp | custom)" >&2
    exit 2
    ;;
esac

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

terraform init $INIT_FLAGS >/dev/null

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
