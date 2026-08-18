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
  # 2026-08-18'e kadar bu adres AYRILAN EKİP ÜYESİNE aitti — offboarding'de
  # gözden kaçmıştı. Erişim yetkileri 2026-08-15'te alınmasına rağmen fatura
  # bildirimleri üç gün daha ona gitti. Artık Terraform'da olduğu için bir
  # sonraki ayrılışta config'den görünecek.
  billing_email = "uslanozan@gmail.com"

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
}
