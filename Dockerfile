# =============================================================================
# tidyorg — engine (Terraform) image
# =============================================================================
#   docker build -t tidyorg:dev .
#
#   docker run --rm -v ./config:/config -v ./state:/state \
#     -v ./app.pem:/secrets/app.pem \
#     -e TF_VAR_github_org_name=your-org -e TF_VAR_github_app_id=... \
#     -e TF_VAR_github_app_installation_id=... tidyorg:dev plan
#
# Config, state, backend.tf and imports.tf are never baked in (see .dockerignore);
# the entrypoint selects the state backend (TF_STATE=local|hcp|custom, default
# local). The dashboard ships as a SEPARATE image — see dashboard/Dockerfile.
# =============================================================================
FROM hashicorp/terraform:1.9

WORKDIR /engine

# Engine only: config/, backend.tf, imports.tf, state, .terraform are excluded by
# .dockerignore. The provider lock file IS copied for reproducible versions.
COPY terraform/ /engine/
COPY docker/entrypoint.sh /usr/local/bin/tidyorg-entrypoint

# Initialize with the SAME local backend the entrypoint uses by default, so a
# runtime local `terraform init` sees no backend change and works offline. A
# non-local TF_STATE re-inits with -reconfigure at startup.
RUN chmod +x /usr/local/bin/tidyorg-entrypoint \
  && printf 'terraform {\n  backend "local" {\n    path = "/state/terraform.tfstate"\n  }\n}\n' > /engine/backend.tf \
  && terraform init -input=false

ENV TF_VAR_config_path=/config

ENTRYPOINT ["/usr/local/bin/tidyorg-entrypoint"]
CMD ["plan"]
