// Çalışma zamanı ayarları — yerel geliştirmede boş.
//
// Bu dosya build çıktısına (dist/) olduğu gibi kopyalanır. Docker image'ında
// entrypoint onu konteyner ortam değişkenlerinden yeniden üretir, örneğin:
//
//   cat > /usr/share/nginx/html/env.js <<EOF
//   window.__ENV__ = {
//     VITE_GITHUB_CLIENT_ID: "${GITHUB_CLIENT_ID}",
//     VITE_CONFIG_OWNER: "${CONFIG_OWNER}",
//     VITE_CONFIG_REPO: "${CONFIG_REPO}",
//     VITE_CONFIG_BRANCH: "${CONFIG_BRANCH:-main}"
//   };
//   EOF
//
// Yerelde .env yeterli (Vite build'e gömer); burayı boş bırak.
window.__ENV__ = {}
