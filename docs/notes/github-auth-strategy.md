# Not: Terraform → GitHub Kimlik Doğrulama Stratejisi

> **Durum:** Karar verildi ve uygulandı (2026-08-15)
> **Yazan:** Ozan · **Tarih:** 2026-08-05 (Güncelleme: 2026-08-15)
> **İlgili:** Ozan & Medine
> **Sonrasında:** Karar netleştiği için [ADR-002](../adr/002-terraform-for-github.md)'ye taşındı / güncellendi.


---

## TL;DR

**Mevcut plan:** Kişisel classic PAT (`repo`, `admin:org`, `read:org`, `delete_repo`).
**Önerim:** Pilot için ayrı test org + fine-grained PAT → gerçek org için **organizasyona ait GitHub App**.

Classic PAT'in problemi güvenlik paranoyası değil; projenin kendi tezini çürütmesi. Denetlenebilir altyapı kurduğumuzu iddia edip altyapıyı kişisel bir anahtarla yönetmek sunumda ilk sorulacak soru olur.

---

## Neden kişisel classic PAT olmaz

| Problem | Sonuç |
|---|---|
| Classic PAT **hesap genelinde** geçerli, org'a scope'lanamaz | Token üyesi olduğumuz *tüm* org'ları kapsar — sızarsa hasar Tidyorg ile sınırlı kalmaz |
| Audit log'da her işlem kişi adına görünür | Terraform'un `apply`'ı ile elle yapılan değişiklik **ayırt edilemez** — denetlenebilirlik sıfır |
| Token kişiye bağlı | Kişi ayrılınca token ölür, altyapı yönetilemez hale gelir |
| Uzun/sınırsız ömür | Kalıcı bir sır taşımak zorundayız |

## Seçenekler

| Yöntem | Kime ait | Ömür | Kapsam | Verdict |
|---|---|---|---|---|
| Classic PAT | Kişiye | Uzun/sınırsız | Hesabın **tüm** org'ları | ❌ |
| Fine-grained PAT | Kişiye (org onaylı) | Expiry zorunlu, max 1 yıl | Tek org, resource bazlı | 🟡 Pilot için yeterli |
| **GitHub App** | **Organizasyona** | **~1 saat, otomatik yenilenir** | Kurulu olduğu org + verilen izinler | ✅ Hedef |
| Machine user (bot hesap) | Sahte kullanıcıya | Uzun | Org | 🟡 Eski usül, ekstra koltuk maliyeti |

GitHub'da org'a ait bir "service account token" **yok**. Org'a ait bir *kimlik* üretmenin yolu GitHub App.

## GitHub App neden doğru cevap

- **Org'a ait, kişiye değil** → biri ayrılsa app çalışmaya devam eder
- Terraform private key ile imzalayıp **~1 saatlik** installation token alır → elimizde uzun ömürlü sır yok
- Audit log'da işlemler app adına görünür → Terraform vs. manuel ayrımı net
- İzinler resource bazında (Administration: write, Members: write, Metadata: read) — `delete_repo` karşılığını **hiç vermiyoruz**
- GitHub Free planda kullanılabilir, ek maliyet yok

### Provider konfigürasyonu

`integrations/github` provider'ı native destekliyor:

```hcl
provider "github" {
  owner = var.github_org_name   # app_auth ile ZORUNLU — yazmazsan 403

  app_auth {
    id              = var.github_app_id              # GITHUB_APP_ID
    installation_id = var.github_app_installation_id # GITHUB_APP_INSTALLATION_ID
    pem_file        = var.github_app_pem_file         # GITHUB_APP_PEM_FILE
  }
}
```

Notlar:
- `pem_file` dosya **yolu değil, içeriği** bekliyor (satır sonları `\n` olarak)
- Private key HCP Terraform'da sensitive environment variable → laptoplarımıza hiç inmez
- **Bilinen kısıt**, provider dokümanında açıkça yazılı: *"Some API operations may not be available when using a GitHub App installation configuration."* Yani bazı resource'lar app auth ile çalışmayabilir. Hangileri kullandığımız resource setine bağlı, ilk `plan`/`apply`'da görürüz. Böyle bir duvara çarparsak çözüm **o tek işlem için** fine-grained PAT'e düşmek — tüm mimariyi kişisel token'a çevirmek değil.

Kaynak: [provider auth dokümanı](https://github.com/integrations/terraform-provider-github/blob/main/docs/index.md)

---

## Ayrı bir konu: Terraform ile kendimizi patlatma riski

Bu risk token seçiminden bağımsız, `apply`'ın kendisiyle ilgili. Rahatlatıcı kısım:

**Terraform, state'inde olmayan bir şeye dokunamaz.** Org'da elle açılmış bir repo state'te değilse `apply` onu ne siler ne değiştirir. "Tüm org'u tek komutla uçurmak" gerçekçi bir senaryo değil.

Gerçek footgun'lar:
- Koddan bir `resource` bloğunu silip `apply` yapmak → Terraform "demek ki istemiyorsun" der ve **siler**
- Yanlış workspace'te `terraform destroy`
- `-auto-approve`

### Korunma önlemleri

Repository modülünde (benim dosyam, bunları ben ekliyorum):

```hcl
resource "github_repository" "this" {
  # ...
  archive_on_destroy = true   # destroy → silmek yerine arşivle. Varsayılan KAPALI, açıkça yazmak gerekiyor.

  lifecycle {
    prevent_destroy = true    # yanlışlıkla silinmeye karşı sert kilit
  }
}
```

`archive_on_destroy = true` ile "repo silme" riski "repo arşivleme"ye, yani geri alınabilir bir hataya dönüşüyor.

Süreç tarafında:
- Pilot için **ayrı test organizasyonu** — [implementation plan.md](../../implementation%20plan.md)'de bu soru cevapsız duruyor; cevabı "ayrı org" olsun
- HCP workspace **manual apply** modunda kalsın
- Local'de asla `-auto-approve` yok
- `apply` yalnızca CI'dan (`terraform-apply.yml`) — kimse laptopundan gerçek org'a `apply` atmaz

---

## Önerilen iki fazlı yol

**Faz 1 — öğrenme + pilot (şimdi)**
Ayrı test org + fine-grained PAT (tek org'a scope'lu, 30 gün expiry, silme izni yok). En kötü senaryo bir test org'unun bozulması; yeniden kurarız.

**Faz 2 — gerçek org (pilot çalıştıktan sonra)**
Org'a ait GitHub App + private key HCP'de sensitive + `apply` sadece CI'dan.

---