#!/bin/sh
# Injected into the nginx image at /docker-entrypoint.d/. Writes the runtime
# configuration the dashboard reads (window.__ENV__) before nginx starts, so one
# image serves any org without a rebuild.
set -eu

cat > /usr/share/nginx/html/env.js <<EOF
window.__ENV__ = {
  VITE_GITHUB_CLIENT_ID: "${GITHUB_CLIENT_ID:-}",
  VITE_CONFIG_OWNER: "${CONFIG_OWNER:-}",
  VITE_CONFIG_REPO: "${CONFIG_REPO:-}",
  VITE_CONFIG_BRANCH: "${CONFIG_BRANCH:-main}"
};
EOF
