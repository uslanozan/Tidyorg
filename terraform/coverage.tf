# =============================================================================
# Kapsama Kontrolü — Yönetim Dışı Repo'lar (GIT-34)
# =============================================================================
# Bu dosya ŞU soruyu cevaplıyor: "yönetmediğim ne var?"
#
# Dikkat: bu, drift tespitinden FARKLI bir şey. İkisi sürekli karıştırılıyor:
#
#   Drift tespiti    → "yönettiğim şey değişmiş mi?"   → state'te OLANLARA bakar
#   Kapsama tespiti  → "yönetmediğim ne var?"          → state'te OLMAYANLARA bakar
#
# `terraform plan` state'te olmayan bir repo'yu ASLA göstermez — onun için o repo
# yoktur. Bugüne kadar org'a sessizce bir repo girip hiçbir kontrolün kapsamına
# girmeden durabiliyordu:
#
#   - Terraform onu görmüyor (state'te yok)
#   - Org güvenlik varsayılanları uygulanmıyor (`*_for_new_repositories` yalnızca
#     YENİ repo'lara; mevcut olana dokunmuyor)
#   - Bypass raporunda çıkmıyor (o rapor `local.repos`'tan, yani CONFIG'ten üretiliyor)
#   - Ve fark edilmiyor, çünkü bakılacak bir yer yok
#
# İki kez canlı örneği yaşandı:
#   1. `vulnerability_alerts` bu repo'da KAPALIYDI (2026-08-18) — elle açılmış tek
#      repo, denetlenmeyen tek repo oydu.
#   2. `tmp-app-create-test` `state rm` sonrası GitHub'da öksüz kaldı (2026-08-18).
#
# Sektördeki adı: IaC coverage / unmanaged resources.
# Bkz. docs/notes/industry-terms.md §3, ROADMAP.md → "Geçmişi kim koruyacak?"
# =============================================================================

locals {
  # `data.github_organization.this` org-settings.tf'te TANIMLI — orada org ayarlarını
  # yönetmek için kullanılıyor ve `repositories` alanı bugüne kadar hiç okunmadı.
  # Yeni bir data source eklemek gerekmiyor; ekstra API çağrısı da doğmuyor.
  #
  # ⚠️ Alanın `org/repo` mu yoksa yalnızca `repo` mu döndürdüğü provider sürümüne
  # göre değişebiliyor. İkisini de tolere etmek için son bölüm alınıyor: `split`
  # sonucunun son elemanı, ayraç yoksa dizinin kendisidir. Bu, alan biçimi değişirse
  # kontrolün sessizce YANLIŞ sonuç vermesini engelliyor — normalize edilmezse
  # "your-org/foo" ile "foo" eşleşmez ve HER repo yönetim dışı görünürdü.
  org_repo_names = sort([
    for full_name in data.github_organization.this.repositories :
    element(split("/", full_name), length(split("/", full_name)) - 1)
  ])

  managed_repo_names = sort(keys(local.repos))

  # ASIL SORU: org'da var, config'de yok.
  unmanaged_repos = sort(setsubtract(
    toset(local.org_repo_names),
    toset(local.managed_repo_names),
  ))

  # Ters yön: config'de var, org'da yok. Normal koşulda bu liste
  # "henüz apply edilmemiş yeni repo" demektir — data source plan sırasında
  # okunuyor, yani repo daha yaratılmamış olur. Alarm DEĞİL, bilgi.
  # Apply sonrası boş olmalı; boş kalmıyorsa repo GitHub'dan elle silinmiştir.
  declared_but_absent_repos = sort(setsubtract(
    toset(local.managed_repo_names),
    toset(local.org_repo_names),
  ))
}

# -----------------------------------------------------------------------------
# `check` bloğu — neden error değil, WARNING
# -----------------------------------------------------------------------------
# `check` bloğunun başarısız assert'i plan'da **Warning** üretir, plan'ı KIRMAZ.
# Bu bilinçli:
#
#   - Bu bir CONFIG hatası değil, dünyayla ilgili bir GÖZLEM. Org'a birinin repo
#     transfer etmesi, alakasız bir stajyer eklemesinin apply'ını bloklamamalı.
#     `people.tf`'teki precondition'lar fail-closed, çünkü onlar config hatası;
#     bu fail-loud, çünkü bu bir bulgu.
#   - Ve uyarı KAYBOLMUYOR: 2026-08-18'de kurulan mekanizma Terraform uyarılarını
#     PR yorumuna (sayılıp listelenerek) ve apply'da `::warning::` annotation +
#     step summary'ye taşıyor. Yani bu blok hiç yeni CI kodu gerektirmiyor.
#
# ⚠️ Plan yorumundaki uyarı BAŞLIĞI Terraform'un kendi metni olur — "Check block
# assertion failed". Repo adları başlıkta değil, uyarının gövdesinde ve
# `terraform output repository_coverage` içinde. Bugün tek `check` bloğu var, yani
# başlık belirsizlik yaratmıyor; ikincisi eklenirse yorumdaki başlık ayırt edici
# olmaz ve plan yorumundaki çıkarıcı `check` adını da alacak şekilde genişletilmeli.
# -----------------------------------------------------------------------------

check "repository_coverage" {
  assert {
    condition = length(local.unmanaged_repos) == 0
    error_message = join(" ", [
      "${length(local.unmanaged_repos)} repository/repositories exist in the organization",
      "but are NOT in config/repositories/:",
      "${join(", ", local.unmanaged_repos)}.",
      "Nothing manages them: org security defaults do not apply (those only touch NEW",
      "repositories), they never appear in the branch protection bypass report, and no",
      "plan will ever mention them. Adopt each one (write config/repositories/<name>.yml,",
      "see TODO.md -> GIT-34 for the four-step procedure) or delete it deliberately.",
    ])
  }
}

output "repository_coverage" {
  description = <<-EOT
    Which repositories in the organization are outside Terraform's management.

    Answers a different question than drift detection: drift asks "did what I
    manage change?", coverage asks "what am I not managing at all?". A plan can
    never answer the second one, because an unmanaged repository does not exist
    as far as Terraform is concerned.

    Reading order:
      unmanaged -> the alarm. Present in the organization, absent from config.
                   Nothing enforces anything on these.
      declared_but_absent -> informational. Usually a repository declared in
                   config that has not been applied yet.
  EOT

  value = {
    unmanaged = {
      list  = local.unmanaged_repos
      count = length(local.unmanaged_repos)
      note = length(local.unmanaged_repos) == 0 ? join(" ", [
        "Every repository in the organization is managed from config.",
        "This is a real check, not an assumption: the list comes from the GitHub API,",
        "not from config.",
        ]) : join(" ", [
        "These repositories are in the organization but not in config/repositories/.",
        "Org security defaults do NOT cover them - those settings only apply to newly",
        "created repositories. They are also invisible to the bypass report, which is",
        "generated from config. Adopt or delete them deliberately; see TODO.md GIT-34.",
      ])
    }

    declared_but_absent = {
      list  = local.declared_but_absent_repos
      count = length(local.declared_but_absent_repos)
      note = length(local.declared_but_absent_repos) == 0 ? "Every repository declared in config exists in the organization." : join(" ", [
        "Declared in config but not present in the organization. During a plan this",
        "normally means 'not applied yet' - the data source is read before creation.",
        "If it persists after apply, the repository was deleted outside Terraform.",
      ])
    }

    # Bu iki sayı raporun kendi kapsamını beyan ediyor: bir gün org'da 40 repo
    # olup burada 4 görünüyorsa, sorun repo'larda değil bu kontroldedir.
    _scope = {
      repositories_in_organization = length(local.org_repo_names)
      repositories_in_config       = length(local.managed_repo_names)
      note = join(" ", [
        "Archived repositories are included in the organization count and cannot be",
        "told apart here - the data source returns names only. An archived repository",
        "outside config still shows up as unmanaged, which is correct: archived is not",
        "the same as governed.",
      ])
    }
  }
}
