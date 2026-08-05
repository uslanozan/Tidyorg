# Ozan — Çalışma Günlüğü

Bu dosya kendi yaptıklarımı, öğrendiklerimi ve verdiğim kararları not aldığım günlük.
Resmî dokümantasyon değil — düşünce sürecinin kaydı. Hafta 4'teki sunum hazırlığında
"bu kararı neden verdik" sorusunun cevabı burada olacak.

**Konvansiyon:** En yeni kayıt en üstte. Her kayıt bir tarih başlığı altında.

---

## 2026-08-05 — Terraform kurulumu, auth araştırması, Hafta 1 bitti

### Yapılanlar

**Terraform CLI kuruldu.** winget ile v1.15.8. Kurulumdan sonra PATH güncelleniyor ama
mevcut terminaller eski PATH'i taşıyor — VS Code'u kapatıp açmak gerekti. HashiCorp'un
VS Code eklentisini de kurdum (`hashicorp.terraform`), `terraform fmt` on save çalışıyor.

**`.gitignore` düzeltildi.** İçinde `.terraform.lock.hcl` ignore ediliyordu, bu satırı
sildim. Lock dosyası provider sürümlerini sabitliyor ve **commit edilmeli** — `npm`'in
`package-lock.json`'ı gibi. Ignore edilirse ben, Emre ve CI farklı provider sürümü indirip
farklı `plan` çıktısı alabiliyoruz.

**Issue ve PR template'leri yazıldı** — Hafta 1'in ana işi:
- [bug_report.yml](../../templates/.github/ISSUE_TEMPLATE/bug_report.yml) — 9 alan, severity dropdown, `type: bug` auto-label
- [feature_request.yml](../../templates/.github/ISSUE_TEMPLATE/feature_request.yml) — 7 alan, kabul kriterleri pre-filled, `type: feature` auto-label
- [config.yml](../../templates/.github/ISSUE_TEMPLATE/config.yml) — boş issue kapalı, 3 contact link
- [PULL_REQUEST_TEMPLATE.md](../../templates/.github/PULL_REQUEST_TEMPLATE.md) — What / Why / Type of change / Testing / Semantic commit / Release impact / Checklist

Hepsi şema doğrulamasından geçti. **Önemli:** bozuk bir issue form'unu GitHub sessizce
görmezden geliyor, hata vermiyor. O yüzden Hafta 2'de `ci.yml`'a form lint adımı eklemek
istiyorum — yoksa bozulduğunu fark etmeyiz.

**Repo organizasyona taşındı.** Org adı `your-org`. Remote'u güncelledim,
`config.yml`'daki placeholder linkleri gerçek org adresleriyle doldurdum.
