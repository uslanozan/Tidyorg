# =============================================================================
# Organizasyon Üyeliği — nokta atışı yönetim
# =============================================================================
# config/organization.yml içindeki `people` bölümü hâlâ Terraform tarafından
# TÜKETİLMİYOR (bkz. o dosyadaki not). Sebep bilinçli: tüm üyeliği birden devralmak,
# yanlış bir apply'da org owner'ları düşürüp kilitlenmeye yol açabilir.
#
# Bu dosya o kararı değiştirmez. Yalnızca org owner OLMAYAN, rolü kesinleşmesi
# gereken kişileri tek tek beyan eder. `uslanozan` bilerek yönetim dışında bırakıldı —
# tek org owner'ı Terraform'a bağlamak lockout riskidir.
# =============================================================================

# 2026-08-15 — Emre projeden ayrıldı, `developer` rolüne indirildi.
#
# Takım üyeliğini kaldırmak (bkz. team-memberships.tf) tek başına YETMEZ: org owner
# olan bir kişi branch protection dahil her kuralı atlar. Bu kaynak, rolün gerçekten
# `member` olduğunu beyan eder ve owner ise apply sırasında düşürür.
#
# Repo erişimi buradan gelmez; o, config/repositories/*.yml içindeki `developers`
# listelerinden üretilen `<repo>-devs` takımından (push) gelir.
resource "github_membership" "emre" {
  username = "paitblack"
  role     = "member"

  # Kaynak ileride koddan kaldırılırsa kişi organizasyondan ATILMAZ, yalnızca
  # `member`a düşürülür. Gerçekten çıkarmak gerekirse bilinçli bir adım olmalı.
  downgrade_on_destroy = true
}

# 2026-08-16 — Medine projeye katıldı, dashboard'u yazacak.
#
# Org rolü burada `member` olarak BEYAN ediliyor. Takıma eklenmek zaten otomatik org
# daveti üretiyor ve varsayılan rol `member` oluyor — ama varsayılana güvenmek ile
# beyan etmek aynı şey değil. Beyan edilmezse biri arayüzden owner'a yükseltirse hiçbir
# plan bunu yakalamaz; bu oturumun tamamı o dersin üzerineydi.
#
# Repo yetkisi buradan gelmez: config/repositories/Tidyorg.yml
# içinde `developers` listesinde — yalnızca o repo'da push. Pilot repo'lara erişimi yok.
resource "github_membership" "medine" {
  username = "medine2906"
  role     = "member"

  downgrade_on_destroy = true
}
