# =============================================================================
# tidyorg engine image
# =============================================================================
# Config-driven GitHub organization management. Ships the Terraform engine
# (modules, templates, root .tf). Config and state are mounted at runtime — never
# baked in. The HCP backend and install-specific import blocks are excluded (see
# .dockerignore); the entrypoint forces a local backend on a mounted volume.
#
# Build:  docker build -t tidyorg:dev .
# Run:    docker run --rm -v ./config:/config -v ./state:/state \
#           -e TF_VAR_github_org_name=your-org \
#           -e TF_VAR_github_app_id=... -e TF_VAR_github_app_installation_id=... \
#           -v ./app.pem:/secrets/app.pem tidyorg:dev plan
#
# NOTE: engine-only for now. The dashboard (static SPA + nginx) is added as a
# second stage once it is co-located with the engine (Faz 6).
# =============================================================================
FROM hashicorp/terraform:1.9

WORKDIR /engine

# Engine only: config/, backend.tf, imports.tf, state and .terraform are excluded
# by .dockerignore. The provider lock file IS copied for reproducible versions.
COPY terraform/ /engine/
COPY docker/entrypoint.sh /usr/local/bin/tidyorg-entrypoint

# Fully initialize with the SAME local backend the entrypoint uses at runtime, so
# runtime `terraform init` sees no backend change and reuses the cached providers
# offline (the container has no registry access). Config is not needed here: init
# resolves providers/modules but does not evaluate the file()-reading locals.
RUN chmod +x /usr/local/bin/tidyorg-entrypoint \
  && printf 'terraform {\n  backend "local" {\n    path = "/state/terraform.tfstate"\n  }\n}\n' > /engine/backend.tf \
  && terraform init -input=false

ENV TF_VAR_config_path=/config

ENTRYPOINT ["/usr/local/bin/tidyorg-entrypoint"]
CMD ["plan"]
