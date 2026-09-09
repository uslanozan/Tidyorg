# =============================================================================
# Organizasyon Ayarları
# =============================================================================
# ⚠️ DİKKAT — `github_organization_settings` TEK BİR ALANI değil, organizasyonun
# AYAR NESNESİNİN TAMAMINI yönetir (~25 alan: fatura e-postası, üye izinleri,
# proje ayarları, güvenlik varsayılanları...).
#
# Bu yüzden "sadece default_repository_permission'ı yönetelim" diye eklenemez.
# İzlenen sıra:
#   1. `import` bloğu ile mevcut ayarlar state'e alınır
#   2. `plan` çalıştırılır — provider varsayılanı ile gerçek arasındaki HER fark görünür
#   3. Config gerçeğe göre doldurulur; yalnızca bilerek değiştirdiğimiz alan farklı kalır
#   4. Ancak o zaman apply edilir
#
# 1–2. adımlar 2026-08-18'de yapıldı. Sonuçlar aşağıda. 3. adım TEK BİR ALAN
# yüzünden bloklu; bu yüzden blok şimdilik yorumda (bkz. "Neden bloklu").
#
# -----------------------------------------------------------------------------
# Plan'ın ortaya çıkardığı gerçek durum (import id = 313128349)
# -----------------------------------------------------------------------------
# Sadece iki alan değişiklik olarak göründü; geri kalan ~23 alan provider
# tarafından GitHub'dan okundu ve config'de yazılmadıkları için OLDUĞU GİBİ kalıyor
# (Terraform'da optional+computed alanların davranışı budur). Yani korkulan
# "hepsi varsayılana döner" senaryosu gerçekleşmiyor — tek istisna aşağıdaki.
#
# Yan ürün: import, daha önce hiç görmediğimiz org güvenlik duruşunu gösterdi.
#
#   advanced_security_enabled_for_new_repositories               = false
#   dependabot_alerts_enabled_for_new_repositories               = false
#   dependabot_security_updates_enabled_for_new_repositories     = false
#   dependency_graph_enabled_for_new_repositories                = false
#   secret_scanning_enabled_for_new_repositories                 = false
#   secret_scanning_push_protection_enabled_for_new_repositories = false
#
#   → Org düzeyinde HİÇBİR güvenlik varsayılanı açık değil. Yeni açılan her repo
#     sıfır güvenlik özelliğiyle doğuyor. Faz 6'nın "repo güvenlik ayarları"
#     maddesi bunları repo bazında açacak; org varsayılanı olarak açmak ise
#     buradan tek satırla yapılabilir hale geldi.
#
#   members_can_create_public_repositories = true
#   members_can_create_repositories        = true
#
#   → Herhangi bir org üyesi PUBLIC repo açabiliyor. Kod sızıntısı için en kısa yol
#     bu; `default_repository_permission = none` bunu KAPATMAZ (farklı eksen).
#     Ayrı bir karar gerekiyor — ROADMAP Faz 6'ya madde olarak eklendi.
#
#   members_can_fork_private_repositories  = false   ✅ (istenen durum)
#   web_commit_signoff_required            = false
#
# -----------------------------------------------------------------------------
# `billing_email` — neden elle yazıldı
# -----------------------------------------------------------------------------
# Provider şemasında REQUIRED, atlanamıyor (denendi: "The argument billing_email
# is required, but no definition was found").
#
# Ama import sonrası plan onu `+` (yeni ekleniyor) olarak gösterdi — yani Terraform
# mevcut değeri BOŞ okudu; GitHub App token'ı bu alanı okuyamıyor. Yazma yetkisi
# ise var. Yanlış bir değerle apply edilseydi org'un fatura e-postası sessizce
# değişirdi. Bu yüzden değer TAHMİN EDİLMEDİ, arayüzden okunup buraya yazıldı.
#
# ⚠️ Provider bu alanı okuyamadığı için Terraform onun DRIFT'İNİ DE GÖREMEZ.
# Arayüzden değiştirilirse plan sessiz kalır ve bir sonraki apply buradaki değeri
# geri yazar. Yani bu satır bir "kayıt" değil, tek doğruluk kaynağıdır — arayüzden
# değiştirilecekse önce burası güncellenmeli.
#
# -----------------------------------------------------------------------------
# Gereken App izni — `Organization → Administration: Read and write`
# -----------------------------------------------------------------------------
# İlk apply denemesi (2026-08-18) şununla patladı:
#
#   Error: PATCH https://api.github.com/orgs/your-org:
#          403 Resource not accessible by integration
#
# Sebep: App'te `Repository → Administration: write` VARDI ama org ayarları için
# gereken izin O DEĞİL. GitHub bunları ayrı tutuyor:
#
#   administration               → repo ayarları, branch protection    (vardı)
#   organization_administration  → org ayarları, base permission       (yoktu)
#
# Bu, `Issues` ve `Workflows` 403'lerinin ÜÇÜNCÜSÜ — üçünde de sebep aynı: geniş
# sanılan bir izin GitHub tarafında daha dar tanımlanmış. Yeni bir kaynak türüne
# ilk kez dokunulurken bu 403 beklenmeli.
#
# İzin verildi, ikinci apply geçti. Durum: `plan` temiz.
# =============================================================================

data "github_organization" "this" {
  name = var.github_org_name
}

import {
  to = github_organization_settings.this
  id = data.github_organization.this.id
}

resource "github_organization_settings" "this" {
  # Fatura e-postası artık koddan değil, dışarıdan (HCP değişkeni
  # TF_VAR_billing_email) geliyor — kişisel bir adres repoya yazılmaz.
  # ⚠️ Provider'da bu alan ZORUNLU (null olamaz). Değer HCP'de set edilmezse boş
  # string apply edilir; apply öncesi TF_VAR_billing_email HCP'de ayarlanmalı.
  # Geçmiş kayıt: 2026-08-18'e kadar bu adres ayrılan ekip üyesineydi; offboarding'de
  # üç gün gözden kaçtı. O yüzden yönetime alındı — ama değeri artık HCP'de yaşıyor.
  billing_email = var.billing_email

  # billing_email boşsa (TF_VAR_billing_email set edilmemişse) org'un GERÇEK
  # e-postasını EZMESİN. Alan provider'da zorunlu (atlanamıyor), ama ignore_changes
  # ile Terraform bu alandaki farkı yok sayar → GitHub UI'daki değer korunur.
  # "Empty = leave unmanaged" niyeti ancak böyle GERÇEKTEN sağlanır.
  # Not: değeri yönetmek istersen var'ı doldur + bu bloğu kaldır. Eğer daha önce
  # boş apply ile silinmişse, önce UI'dan bir kez doğru değeri gir; sonrası korunur.
  lifecycle {
    ignore_changes = [billing_email]
  }

  # --- Org profili (GitHub UI'da görünen) -----------------------------------
  # Bu alanlar UI'dan elle girilmişti; config yönetmediği sürece Terraform her
  # apply'da onları SİLMEYE çalışıyordu. Config'e alarak yönetime sokuyoruz —
  # artık config ne derse o. (Rebrand'de değerler burada değişir.)
  # `try(..., null)`: profile bölümü yoksa alan yönetilmez gibi null kalır.
  name        = try(local.org_config.profile.name, null)
  description = try(local.org_config.profile.description, null)
  blog        = try(local.org_config.profile.blog, null)
  location    = try(local.org_config.profile.location, null)

  # Bugüne kadar `read` — yani org'a eklenen herkes, hiçbir takımda olmasa bile
  # bütün repo'ları okuyabiliyordu. `none` ile erişimin tek kaynağı takım
  # üyeliği olur (ROADMAP Faz 6 / ACCESS-MODEL en az yetki ilkesi).
  #
  # ⚠️ Bunu daraltmak SESSİZ bir işlem değil, bir ERİŞİM KALDIRMA işlemidir.
  # 2026-08-18'de uygulandığında `medine2906` iki pilot repo'yu görmeyi kaybetti —
  # oralara erişimi org varsayılanından geliyordu. Beklenen davranış, ama bedeli
  # bir insana düşüyor. Bu değer bir daha daraltılacaksa önce "bu varsayılana kim
  # bağımlı?" sorusu cevaplanmalı; apply'dan sonra değil, önce.
  default_repository_permission = "none"

  # --- Repo açma yetkisi ----------------------------------------------------
  # 2026-08-18 import'unda `members_can_create_public_repositories = true` çıktı:
  # herhangi bir org üyesi PUBLIC repo açabiliyordu. Kod sızıntısı için en kısa yol.
  #
  # ⚠️ GitHub "sadece mentörler açabilsin" DİYEMİYOR. Org düzeyinde repo açma yetkisi
  # ikili: ya tüm üyeler, ya yalnızca ORG OWNER'lar. Takım bazlı ara kademe yok.
  #   → https://docs.github.com/en/organizations/managing-organization-settings/restricting-repository-creation-in-your-organization
  #   → https://docs.github.com/en/organizations/managing-peoples-access-to-your-organization-with-roles/roles-in-an-organization
  #
  # `false` = yalnızca org owner. Bugün tek owner `uslanozan` olduğu için "sadece
  # mentör" ile aynı sonucu veriyor, ama owner OLMAYAN bir mentör gelirse repo
  # açamayacak — bu kabul edilen bir sınırlama, çünkü asıl kural şu:
  #
  #   Repo'lar config'den doğar, insan elinden değil. `config/repositories/*.yml`
  #   içine bir dosya eklenir, PR açılır, apply repo'yu yaratır. Elle repo açmak
  #   zaten kaçak bir yol; kapatılması modeli bozmuyor, tersine zorluyor.
  #
  # 🚨 "Mentörü org owner yapalım" ÇÖZÜMÜNÜN BEDELİ — küçük değil:
  # Org owner olmak repo açma yetkisi vermez, ORG'DAKİ HER ŞEYE tam yetki verir:
  # her repo'da admin, her korumalı dalda muaf (Karar E ile `enforce_admins = false`),
  # üye ekleme/çıkarma, org ayarlarını değiştirme, repo silme.
  # 2026-08-15'te yaşadığımız olayın kökü tam olarak buydu.
  #
  # Yani "repo açabilsin diye owner yapmak", bir kapıyı açmak için duvarı yıkmaktır.
  # Owner sayısı bilinçli tutulmalı (ACCESS-MODEL: azami 3 civarı) ve owner'lık
  # repo açma ihtiyacından DEĞİL, org yönetimi ihtiyacından verilmelidir.
  # Kim owner'sa `terraform output branch_protection_bypass` içinde görünür.
  #
  # ⚠️ DOĞRULANMADI: Bu ayar GitHub App'i etkilemiyor olmalı — App org ÜYESİ değil,
  # kurulu bir entegrasyon. Ama canlı test edilmedi. Eğer Terraform'un yeni repo
  # yaratması bundan sonra `403` verirse sebebi budur; o durumda bu üç satır geri
  # alınır. Bir sonraki repo yaratımı bu yüzden dikkatle izlenmeli.
  members_can_create_repositories         = false
  members_can_create_public_repositories  = false
  members_can_create_private_repositories = false

  # --- Yeni repo'lar için güvenlik varsayılanları --------------------------
  # 2026-08-18 import'unda ALTISI DA `false` çıktı — yani config'den açılan her
  # yeni repo sıfır güvenlik özelliğiyle doğuyordu. Modüldeki repo bazlı ayarlar
  # (`vulnerability_alerts`, `secret_scanning`) mevcut repo'ları kapsıyor; buradaki
  # değerler ise HENÜZ VAR OLMAYAN repo'ları. İkisi farklı zaman dilimini koruyor,
  # biri diğerinin yerine geçmez.
  dependabot_alerts_enabled_for_new_repositories           = true
  dependabot_security_updates_enabled_for_new_repositories = true
  dependency_graph_enabled_for_new_repositories            = true

  # ⚠️ Secret scanning org varsayılanı yalnızca PUBLIC repo'lara uygulanır;
  # private repo'lar GHAS ister. Org ayarı olarak açmak private repo yaratmayı
  # engellemez, o repo'da özellik açılmaz.
  secret_scanning_enabled_for_new_repositories                 = true
  secret_scanning_push_protection_enabled_for_new_repositories = true

  # advanced_security → GHAS (Enterprise) lisansı gerektirir. Bilerek `false`.
  # Team planına geçilirse (ROADMAP Faz 7) yeniden değerlendirilecek.
  advanced_security_enabled_for_new_repositories = false
}
