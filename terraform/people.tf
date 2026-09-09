# =============================================================================
# Kişiler — organizasyon üyeliği ve org kapsamlı roller
# =============================================================================
# İki dosya, iki sahiplik. Bu ayrım YETKİ YÜKSELTME KAPISIDIR:
#
#   config/people.yml       → org üyeliği (kimler org'da). Makine-sahipli;
#                             dashboard yazar. Yetki İFADE EDEMEZ.
#   config/privileged.yml   → org owner'lar + org kapsamlı roller
#                             (head-of-engineering). İnsan-sahipli, CODEOWNERS
#                             korumalı; dashboard ASLA yazmaz.
#
# Neden bölündü (secure by construction): 2026-08-15 olayının kökü, org rolü
# owner kaldıkça kişinin her repoda admin olmaya devam etmesiydi. Yükseltme tek
# satır YAML ile ve stajyer eklemekle AYNI onay yolundan yapılabiliyordu. Artık
# yükseltmeyi ifade eden alan, dashboard'ın yazamadığı ayrı bir dosyada — kontrol
# etmeye değil, ifade edilemez kılmaya dayanıyor.
#
#   Org üyeliği   → kişi org'da mı, owner mı?  → people.yml + privileged.yml
#   Repo erişimi  → hangi repoda ne yapabilir? → config/repositories/*.yml
#
# Repo dosyası "bu kişi org owner mı" sorusunu CEVAPLAYAMAZ — ve owner ise oradaki
# her satır hükümsüzdür, çünkü org owner branch protection dahil her şeyi ezer.
# =============================================================================

locals {
  # --- Org üyeliği (makine-sahipli) -------------------------------------------
  # Basit bir liste: dashboard bir satır ekler/çıkarır. Yetki taşımaz — bir kişinin
  # burada olması yalnızca "org üyesi" demektir. Owner'lık privileged.yml'dan gelir.
  members = try(yamldecode(file("${local.config_dir}/people.yml")).members, [])

  # --- Ayrıcalıklar (insan-sahipli, CODEOWNERS korumalı) ----------------------
  privileged        = try(yamldecode(file("${local.config_dir}/privileged.yml")), {})
  privileged_owners = try(local.privileged.org_owners, [])
  privileged_roles  = try(local.privileged.roles, {}) # rol adı => [login]

  # ---------------------------------------------------------------------------
  # BREAK-GLASS — bilinçli olarak yönetim dışında bırakılanlar
  # ---------------------------------------------------------------------------
  # En az bir org owner Terraform'un DIŞINDA kalmalı. Sebep: hatalı bir config ya
  # da bozuk bir apply tüm owner'ları `member`a düşürürse organizasyonu geri
  # alacak kimse kalmaz — ve o kişiyi geri yükseltecek olan da yine bir owner
  # olmak zorundadır. Kilitlenme geri döndürülemez.
  #
  # ⚠️ Bunun bedeli görünürlüktür: buradaki kişinin org rolü Terraform tarafından
  # ZORLANMIYOR, yalnızca config'de beyan ediliyor. Arayüzden değiştirilirse plan
  # sessiz kalır. Bypass raporu (outputs.tf) bunu açıkça söylüyor.
  unmanaged_people = ["uslanozan"]

  managed_members = [
    for u in local.members : u
    if !contains(local.unmanaged_people, u)
  ]

  # ---------------------------------------------------------------------------
  # Türetilmiş org rolleri
  # ---------------------------------------------------------------------------
  # Org owner = privileged.yml'da listelenen VE gerçekten org üyesi olan kişi.
  org_owners = sort([
    for u in local.members : u
    if contains(local.privileged_owners, u)
  ])

  # head-of-engineering taşıyıcıları privileged.roles'tan gelir.
  head_of_engineering = sort(try(local.privileged_roles["head-of-engineering"], []))

  # organization.yml'da org kapsamlı olarak tanımlı rol adları. privileged.roles'a
  # yalnızca bunlar yazılabilir; kural hardcode değil, `roles.*.scope`'tan türer.
  org_scoped_roles = sort([
    for role, cfg in local.org_config.roles : role
    if try(cfg.scope, "repository") == "organization"
  ])

  # ---------------------------------------------------------------------------
  # DOĞRULAMA — sessiz çelişkileri plan aşamasında yakala
  # ---------------------------------------------------------------------------

  # 1) privileged.roles yalnızca ORG KAPSAMLI rol adı taşıyabilir. Repo kapsamlı
  #    bir rol (mentor/developer) buraya yazmak anlamsızdır — gerçek repo yetkisi
  #    config/repositories/*.yml'dadır.
  privileged_invalid_roles = sort([
    for role in keys(local.privileged_roles) : role
    if !contains(local.org_scoped_roles, role)
  ])

  # 2) privileged.yml'da adı geçen HERKES (owner ya da rol taşıyıcısı) ayrıca
  #    people.yml'da org üyesi olmalı. Ayrıcalık üyelikten önce gelemez: kişi önce
  #    organizasyona dahil olur, sonra yükseltilir. Aksi halde privileged.yml
  #    org'da olmayan birine owner der ve bu sessizce hükümsüz kalırdı.
  privileged_people = sort(distinct(concat(
    local.privileged_owners,
    flatten([for role, users in local.privileged_roles : users]),
  )))

  privileged_not_members = sort([
    for u in local.privileged_people : u
    if !contains(local.members, u)
  ])

  # 3) Repo dosyalarında geçtiği halde people.yml'da olmayan kişiler.
  #
  #    Bunlar sessizce org'a giriyordu: modül `github_team_membership` üretiyor,
  #    GitHub da kişiyi otomatik davet ediyor. Kişi org'a `member` olarak katılıyor
  #    ama merkezi listede HİÇ görünmüyor. Offboarding'de adının geçtiği HER repo
  #    dosyasını bulmak gerekir; gözden kaçan tek kayıt kişiyi org'da tutar.
  #    Otomatik üyelik üretmek yerine HATA veriyoruz (fail-fast).
  people_referenced_in_repos = toset(flatten([
    for repo_name, repo in local.repos : concat(
      try(repo.mentors, []),
      try(repo.developers, []),
    )
  ]))

  repo_people_missing_from_people = sort([
    for user in local.people_referenced_in_repos : user
    if !contains(local.members, user)
  ])
}

# --- Organizasyon üyeliği ----------------------------------------------------
#
# `github_membership` var olan bir üyede rolü GÜNCELLER, yeni bir kişide DAVET
# gönderir. Yani `people.yml`'a bir satır eklemek gerçek bir org daveti üretir.
#
# ⚠️ `config/organization.example.yml` bu yüzden asla `for_each`'e sokulmamalı:
# içindeki örnek kullanıcılara gerçek davet gider. Okunan config dizini
# `var.config_path` (local.config_dir) ile belirlenir; örnek dosyalar burada değil.
resource "github_membership" "people" {
  for_each = toset(local.managed_members)

  username = each.key

  # Org rolü ARTIK privileged.yml'dan türüyor: owner listesindeyse `admin`, değilse
  # `member`. Üyelik dosyasının kendisi rolü ifade edemez (secure by construction).
  role = contains(local.privileged_owners, each.key) ? "admin" : "member"

  # people.yml'dan çıkarılan kişi organizasyondan GERÇEKTEN çıkarılır (evict).
  # Bu güvenli: (a) her değişiklik PR + apply'dan geçer, ani/kazara değil; (b) üye
  # atımı GERİ ALINABİLİR — tekrar people.yml'a eklemek yeni bir davet gönderir.
  # (Repo silme geri alınamaz olduğu için orada ayrı, bilinçli bir yol var; üyelik
  # için gerekmiyor.) Böylece dashboard'ın "org'dan çıkar" işlemi söz verdiğini yapar.
  downgrade_on_destroy = false
}

# --- head-of-engineering takımı ----------------------------------------------
#
# `platform-admins`, head-of-engineering rolünün teknik taşıyıcısıdır (teams.tf):
# modül bu takıma her repo'da admin veriyor ve `push_allowed_roles` içindeki
# `head-of-engineering` buna çözümleniyor.
#
# Üyelik privileged.roles["head-of-engineering"]'ten üretiliyor. Bu rolün
# privileged.yml'da (CODEOWNERS korumalı) yaşamasının sebebi: taşıyıcısına her
# repoda admin + branch protection bypass veriyor — yani people.yml'dan tek satırla
# verilebilecek bir yükseltme olmamalı.
resource "github_team_membership" "platform_admins" {
  for_each = toset(local.head_of_engineering)

  team_id  = github_team.platform_admins.id
  username = each.value
  role     = "maintainer"
}
