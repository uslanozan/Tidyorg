# =============================================================================
# Backend / State — DEĞİŞTİRİLEBİLİR DOSYA
# =============================================================================
# Bu dosya bilerek ayrı: motorun state'i nerede tuttuğunu belirleyen TEK yer.
#
#   Canlı (HCP)   → aşağıdaki `cloud {}` bloğu. Remote execution + ortak state.
#   Docker        → entrypoint bu dosyayı `backend "local"` ile DEĞİŞTİRİR; state
#                   `-v ./state:/state` mount volume'de tutulur, HCP gerekmez.
#
# `terraform {}` bloğu birden fazla dosyaya bölünebilir; `cloud`/`backend` yalnızca
# BİR kez görünür. required_providers/required_version main.tf'te.
#
# ⚠️ Açık kaynak kullanıcısı repoyu Docker olmadan klonlarsa buradaki HCP org'u
# kendisine ait değildir — Docker akışı (entrypoint) ya da Faz 7 fresh-repo'daki
# genel şablon bunu çözer. Bu dosya CANLI kurulumun state bağlantısıdır.
# =============================================================================

terraform {
  cloud {
    organization = "tidyorg-infra"
    workspaces {
      name = "github-management"
    }
  }
}
