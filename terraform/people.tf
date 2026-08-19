# =============================================================================
# Kişiler — organizasyon üyeliği ve org kapsamlı roller
# =============================================================================
# Bu dosya `config/organization.yml` → `people` bölümünü tüketir. Öncesinde
# üyelikler `org-membership.tf` içinde KİŞİ BAŞINA elle yazılıyordu; her yeni üye
# için `.tf` düzenlemek gerekiyordu ki bu, projenin "veri katmanı config'de"
# iddiasının tam tersiydi.
#
# İki katman burada birleşiyor ama karışmıyor:
#
#   Org üyeliği   → kişi org'da mı, owner mı?        → BURASI (`people`)
#   Repo erişimi  → hangi repoda ne yapabilir?       → config/repositories/*.yml
#
# Repo dosyası "bu kişi org owner mı" sorusunu CEVAPLAYAMAZ — ve owner ise oradaki
# her satır hükümsüzdür, çünkü org owner branch protection dahil her şeyi ezer.
# 2026-08-15 olayının kökü tam olarak buydu: takım üyeliği kaldırıldı ama org rolü
# owner kaldığı sürece kişi her repoda admin olmaya devam ediyordu.
# =============================================================================

locals {
  people = try(local.org_config.people, {})

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

  managed_people = {
    for user, cfg in local.people : user => cfg
    if !contains(local.unmanaged_people, user)
  }

  # ---------------------------------------------------------------------------
  # Org kapsamlı roller — hardcode DEĞİL, config'den türetiliyor
  # ---------------------------------------------------------------------------
  # `roles:` bloğundaki her rolün bir `scope`'u var. "Hangi rol `people`'a
  # yazılabilir" sorusunun cevabı orada zaten duruyor; buraya ikinci kez yazmak
  # iki kaynağın zamanla ayrışması demekti.
  org_scoped_roles = sort([
    for role, cfg in local.org_config.roles : role
    if try(cfg.scope, "repository") == "organization"
  ])

  org_owners = sort([
    for user, cfg in local.people : user
    if try(cfg.org_role, "member") == "admin"
  ])

  head_of_engineering = sort([
    for user, cfg in local.people : user
    if contains(try(cfg.roles, []), "head-of-engineering")
  ])

  # ---------------------------------------------------------------------------
  # DOĞRULAMA — sessiz çelişkileri plan aşamasında yakala
  # ---------------------------------------------------------------------------
  # 1) `people.roles` içine repo kapsamlı bir rol (`mentor`/`developer`) yazmak.
  #    Bu, config'in sessizce yalan söylediği durumdur: kimse okumaz, hiçbir şey
  #    olmaz, ama dosyaya bakan "bu kişi mentör" sanır. Gerçek yetki repo
  #    dosyalarındadır.
  people_with_repo_scoped_roles = flatten([
    for user, cfg in local.people : [
      for role in try(cfg.roles, []) :
      "${user} → ${role}"
      if !contains(local.org_scoped_roles, role)
    ]
  ])

  # 2) `org_role` yazılmamış kişi. Varsayılana düşürmek yerine hata veriyoruz:
  #    org rolü, kişinin branch protection'ı atlayıp atlayamayacağını belirleyen
  #    alandır — unutulmuş olması ile `member` olması aynı şey değildir.
  people_without_org_role = sort([
    for user, cfg in local.people : user
    if !can(cfg.org_role)
  ])
}

# --- Organizasyon üyeliği ----------------------------------------------------
#
# `github_membership` var olan bir üyede rolü GÜNCELLER, yeni bir kişide DAVET
# gönderir. Yani `people`'a bir satır eklemek gerçek bir org daveti üretir.
#
# ⚠️ `config/organization.example.yml` bu yüzden asla `for_each`'e sokulmamalı:
# içindeki `mentor-a`, `dev-1` gibi örnek kullanıcılara gerçek davet gider.
# Okunan dosya `var.config_file` ile belirleniyor ve örnek dosyayı göstermiyor.
resource "github_membership" "people" {
  for_each = local.managed_people

  username = each.key

  # `try` burada varsayılan üretmek için DEĞİL, hata sırasını düzeltmek için var.
  # Doğrudan `each.value.org_role` yazıldığında alan eksikse Terraform bu satırda
  # çöküyor ve kullanıcı şunu görüyordu:
  #   "This object does not have an attribute named org_role."
  # Yani teams.tf'teki açıklayıcı precondition hiç çalışmadan plan patlıyordu.
  #
  # `try` sayesinde ifade değerlenebiliyor, plan precondition'a ulaşıyor ve hata
  # "hangi kişide eksik, neden zorunlu" bilgisiyle geliyor. Aşağıdaki "member"
  # değeri asla uygulanmaz: precondition o durumda plan'ı zaten durdurur.
  role = try(each.value.org_role, "member")

  # Kaynak koddan kaldırılırsa kişi organizasyondan ATILMAZ, yalnızca `member`a
  # düşürülür. Birini gerçekten çıkarmak bilinçli bir adım olmalı — yanlışlıkla
  # silinen bir YAML satırının sonucu değil.
  downgrade_on_destroy = true
}

# --- head-of-engineering takımı ----------------------------------------------
#
# `platform-admins`, head-of-engineering rolünün teknik taşıyıcısıdır (teams.tf):
# modül bu takıma her repo'da admin veriyor ve `push_allowed_roles` içindeki
# `head-of-engineering` buna çözümleniyor.
#
# Üyelik artık elle değil `people.roles`'tan üretiliyor. Kazanç offboarding'de
# görünüyor: 2026-08-15'te bir kişiyi indirmek İKİ ayrı `.tf` dosyası düzenlemeyi
# gerektirdi (takım üyeliği + org rolü) ve ikisinden birini atlamak sessizce
# yetkiyi bırakırdı. Artık tek satır YAML.
#
# --- 2026-08-15 kaydı (eski team-memberships.tf'ten taşındı) -----------------
# `paitblack` (Emre) bu takımdan çıkarıldı. Neden kritikti: takım
# head-of-engineering rolünün taşıyıcısı olduğu için üyelik durduğu sürece kişi
# HER repo'da admin oluyordu; `enforce_admins = false` olduğundan da korumalı
# dallara doğrudan push atıp PR onay kuralını atlayabiliyordu. Yani "direct push
# yasağı" ona hiç uygulanmıyordu — sorun kuralda değil, rol atamasındaydı.
#
# Ve takımdan çıkarmak TEK BAŞINA yetmedi: org rolü owner kalsaydı yetki aynen
# devam ederdi. İki katmanın da kapatılması gerekti. Bu dosyanın ikisini birden
# tek kaynaktan üretmesinin sebebi tam olarak budur.
resource "github_team_membership" "platform_admins" {
  for_each = toset(local.head_of_engineering)

  team_id  = github_team.platform_admins.id
  username = each.value
  role     = "maintainer"
}

# --- State taşımasının kaydı -------------------------------------------------
# 2026-08-18'de bu kaynaklar tek tek yazılı hallerinden `for_each` anahtarlarına
# taşındı:
#
#   github_membership.emre            → github_membership.people["paitblack"]
#   github_membership.medine          → github_membership.people["medine2906"]
#   github_team_membership.ozan_admin → github_team_membership.platform_admins["uslanozan"]
#
# Taşıma `moved` blokları ile yapıldı; sonuç `0 to add, 0 to change, 0 to destroy`
# oldu — tek bir API çağrısı bile yapılmadı, yalnızca state'teki adresler değişti.
# `moved` olmasaydı Terraform bunu "eskiyi yok et, yenisini yarat" diye okur ve
# üyelikler bir an için düşerdi.
#
# Bloklar sonradan KALDIRILDI. Sebep: `moved` bildirimseldir ve taşıma bir kez
# uygulandıktan sonra sessiz bir no-op'a döner. Burası KÖK MODÜL ve tek bir state'i
# var (HCP workspace), taşıma orada uygulandı — yani blokların işi bitti.
#
# ⚠️ Bu karar paylaşılan modüllerde AYNI DEĞİL: `modules/repository/` içine bir gün
# `moved` yazılırsa orada tutulmalıdır, çünkü modülü kimin hangi state ile
# kullandığını bilemezsin. Faz 8'de modül başka bir repodan `ref` ile tüketilecek;
# o gün bu ayrım pratik hale gelecek.
