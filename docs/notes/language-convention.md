# Not: Dil Konvansiyonu

> **Durum:** Karar verildi (Ozan, 2026-08-05) · Emre'nin de uyması gerekiyor
> **Neden bu not var:** Hafta 3'te ikimiz de doküman yazacağız. Kural yazılı olmazsa
> `docs/` klasörü yarı İngilizce yarı Türkçe bir karmaşaya dönüşür.

## Kural

| Dosya türü | Dil | Gerekçe |
|---|---|---|
| `docs/**/*.md` | **Türkçe** | Okunan içerik. Ekip ve stajyerler Türkçe konuşuyor; giriş bariyerini düşürüyor. Tek kaynak → drift yok. |
| `terraform/templates/.github/**` (issue formları, PR template) | **Tek dosya içinde iki dilli, English first** (`EN · TR`) | Doldurulan içerik. İki ayrı dosya yapmak drift üretir; PR template'te GitHub zaten tek dosyaya izin veriyor. |
| Terraform kodu, HCL yorumları | **İngilizce** | Kod. `variable`/`output` `description` alanları `terraform-docs` çıktısına giriyor. |
| GitHub Actions workflow'ları | **İngilizce** | Kod. Log çıktıları ve action isimleri İngilizce. |
| Commit mesajları, branch adları, PR başlıkları | **İngilizce** | Conventional Commits konvansiyonu; changelog üretimine giriyor. |
| Kod içi yorumlar, değişken isimleri | **İngilizce** | Sektör standardı. |

Özet: **okunan şeyler Türkçe, çalıştırılan şeyler İngilizce, doldurulan şeyler iki dilli.**

## İki dilli formatı

Template'lerde ayraç olarak ` · ` kullanılıyor ve **İngilizce her zaman önce gelir**
(English first). Bu sıra `docs/` dışındaki her iki dilli dosyada geçerli:

```yaml
label: Bug description · Hata açıklaması
description: |
  EN — What is broken? One or two sentences — details go in the fields below.
  TR — Ne bozuk? Bir iki cümle; detaylar aşağıdaki alanlara.
```

Checkbox ve tek satırlık maddelerde her dil **kendi içinde tam bir cümle** olarak yazılıyor,
kelime kelime araya sokuşturulmuyor — okunurluğu bu koruyor:

```markdown
- [ ] Automated tests added or updated — which ones? · Otomatik test eklendi/güncellendi — hangileri?
```

Placeholder ve örnek metinler tek dilli (İngilizce) bırakıldı — bunlar kullanıcının sileceği
örnekler, ikiye katlamak formu okunmaz hâle getiriyor. Çevrilen kısım **talimatlar**.

## Bilinen açık

`docs/` Türkçe olduğu için plandaki `external-collaborators` takımı ([implementation plan.md](../../implementation%20plan.md))
bu dokümanları okuyamaz. Şu an dış paydaş yok, o yüzden sorun değil; ihtiyaç doğarsa
`docs/en/` altına yalnızca gerekli dokümanların İngilizce karşılığı eklenir — hepsinin değil.

## Aksiyon

- [ ] **Emre:** Hafta 3 dokümanlarını (`branching-strategy.md`, `commit-convention.md`,
      `security-policy.md`, `rbac-and-permissions.md`) **Türkçe** yaz
- [ ] **Emre:** `terraform/templates/CONTRIBUTING.md`, `SECURITY.md`, `CODEOWNERS` yorumları → **iki dilli**
- [ ] **Ozan:** README.md taslağını yazarken bu konvansiyonu README'de de belirt
