# Konfigürasyon Rehberi

Organizasyonundaki her repo, takım ve yetki iki farklı yapı altında yönetilir:

1. **Global Ayarlar**: `terraform/config/organization.yml` (Roller, varsayılanlar, takımlar)
2. **Repo Tanımları**: `terraform/config/repositories/<repo-adı>.yml` (Mentörler, developer'lar, projeye özel ayarlar)

Bu doküman bu dosyaların nasıl okunacağını, nasıl değiştirileceğini ve değişikliğin
GitHub'a nasıl yansıdığını anlatır.

> **Kimin için:** mentörler ve head-of-engineering. Developer'ların bu dosyalara
> dokunması gerekmez.

---

## 1. Temel İlke — Kod ve Veri Ayrı

Sistem iki katmandan oluşur:

| Katman | Dosyalar | İçerik | Kim değiştirir | Sıklık |
| :--- | :--- | :--- | :--- | :--- |
| **Kod** | `terraform/modules/repository/*.tf` | "Repo nasıl kurulur, kural nasıl uygulanır" | Platform ekibi | Nadiren |
| **Veri (Global)** | `terraform/config/organization.yml` | Roller, varsayılan branch korumaları, genel ayarlar | Head of Engineering | Nadiren |
| **Veri (Repo)** | `terraform/config/repositories/*.yml` | "Hangi repo var, kimde hangi yetki var" | Mentör | Sık |

Yeni bir repo eklemek için Terraform kodu yazılmaz — `config/repositories/` altına yeni bir dosya eklenir.
İleride bu dosyaları bir dashboard yazacak; o zaman da değişen şey yalnızca bu veri dosyaları
olacak.

Şema referansı ve tüm alanların örnekleri:
- [`organization.example.yml`](../terraform/config/organization.example.yml)
- [`repository.example.yml`](../terraform/config/repository.example.yml)
Modelin gerekçeleri: [`ACCESS-MODEL.md`](../ACCESS-MODEL.md).

---

## 2. Dosyanın Bölümleri

### 2.1 `roles` — Yetkinin tanımı

```yaml
roles:
  head-of-engineering:
    scope: organization      # Tüm repo'lara uygulanır
    repo_permission: admin
    bypass_branch_protection: true

  mentor:
    scope: repository        # Yalnızca atandığı repo'da
    repo_permission: admin
    bypass_branch_protection: true

  developer:
    scope: repository
    repo_permission: push
    bypass_branch_protection: false
```

**Tasarım ilkesi: kurallar role bağlıdır, kişiye değil.** Bir rolün ne yapabildiği burada
bir kez tanımlanır. Kişi değiştiğinde bu bölüme dokunulmaz — yalnızca atama değişir.

`repo_permission` değerleri GitHub'ın rolleridir: `pull` (salt okuma), `triage`,
`push` (yazma), `maintain`, `admin`.

> ⚠️ Bu bölümü değiştirmek **tüm organizasyonu** etkiler. `developer` rolünün
> `repo_permission` değerini `admin` yapmak, tek satırla herkesi her repo'da admin yapar.
> Bu tür değişiklikler ikinci bir gözden geçirme ister.

### 2.2 `people` — Kişiler

```yaml
people:
  owner-a:
    org_role: admin
    roles: [head-of-engineering]

  yeni-developer:
    org_role: member
```

Anahtar, kişinin **GitHub kullanıcı adıdır** — yazım hatası sessizce yanlış kişiye yetki
verebilir, iki kez kontrol edin.

`org_role`: organizasyon seviyesindeki rol (`admin` veya `member`).
`roles`: organizasyon geneli rol atamaları (yalnızca `head-of-engineering` için gerekir).

> **Not:** Bu bölüm şu an Terraform tarafından tüketilmiyor. Organizasyon üyeliğinin
> (`github_membership`) Terraform'a devredilmesi, mevcut owner yetkilerini
> etkileyebileceği için bilinçli olarak ertelendi.

### 2.3 `defaults` — Her repo'nun mirası

```yaml
defaults:
  visibility: public
  has_issues: true
  default_branch: develop

  protected_branches:
    main:
      required_reviews: 2
      require_code_owner_review: true
      require_status_checks: [ci/test]
      allow_force_push: false
      push_allowed_roles: [mentor, head-of-engineering]
    develop:
      required_reviews: 1
      require_code_owner_review: false
      ...

  labels:
    - { name: "type: bug", color: "d73a4a", description: "Hatalı davranış" }
    ...
```

Buraya yazılan her şey **tüm repo'lara** uygulanır. Bir repo farklı davranmak isterse
yalnızca farklı olan alanı kendi bloğunda yazar.

Bu bölümün amacı şudur: yeni bir repo hiçbir güvenlik ayarı yazılmadan da **güvenli
varsayılanlarla** doğsun. Repo açan kişinin branch protection bilmesi gerekmez.

### 2.4 Repo Bazlı Konfigürasyonlar (`config/repositories/<repo-adı>.yml`)

Her projenin tanımı, kendi ismiyle oluşturulan bir `.yml` dosyasında saklanır. Örneğin, `payments-api` reposu için `config/repositories/payments-api.yml` dosyası:

```yaml
description: "Ödeme servisi"
language: go
mentors: [mentor-a]
developers: [dev-1, dev-2]
```

| Alan | Zorunlu | Açıklama |
| :--- | :--- | :--- |
| `description` | ✅ | Repo açıklaması |
| `language` | ✅ | `go` · `python` · `typescript` · `php` |
| `mentors` | — | Mentörlerin kullanıcı adları (liste; bugün tek eleman) |
| `developers` | — | Projede çalışan developer'lar (many-to-many) |
| `visibility` | — | Varsayılanı ezer (`public` \| `private`) |
| `archived` | — | `true` ise repo dondurulur |
| `protected_branches` | — | Dal kurallarını ezer (bkz. Bölüm 3) |
| `code_owners` | — | Yol bazlı review yönlendirmesi |
| `labels` | — | Label setini tamamen değiştirir |
| `files` | — | Şablon dosyalarının dağıtım modu (bkz. Bölüm 2.5) |
| `workflows` | — | Dağıtılacak workflow'lar: `ci` · `release`. Liste **tamamen ezer**, kısmi birleştirme yok. |

> ⚠️ `dependabot` bir workflow **değildir**. `.github/dependabot.yml` bir şablon
> dosyasıdır ve `files.dependabot` altında yönetilir. `workflows` listesine yazılırsa
> Terraform var olmayan bir şablon dosyası arar ve `apply` hata verir.

### 2.5 `files` — Şablon dosyalarının dağıtımı

```yaml
files:
  contributing: seed        # strict | seed | none
  security: seed
  editorconfig: seed
  pr_template: strict
  issue_templates: strict
  dependabot: strict
```

| Mod | Davranış | Kime uygun |
| :--- | :--- | :--- |
| `strict` | Terraform içeriği sahiplenir; elle yapılan değişiklik bir sonraki `apply`'da geri alınır | Yönetişim dosyaları |
| `seed` | Yalnızca ilk oluşturmada yazılır; repo sonradan kendine göre değiştirebilir | İçerik dosyaları |
| `none` | Hiç yazılmaz | — |

Bu harita **düz bir map** olduğu için repo yalnızca değiştirmek istediği anahtarı yazar;
gerisi `defaults`'tan gelir. Workflow'lar bu tablonun dışındadır ve **daima `strict`**
davranır — yönetişim dosyası sayılırlar.

---

## 3. Varsayılan ve Ezme Mantığı

Repo yalnızca **farklı olan alanı** yazar; geri kalanı `defaults`'tan gelir.

```yaml
# defaults (organization.yml)
defaults:
  protected_branches:
    main:
      required_reviews: 2
      require_code_owner_review: true
      dismiss_stale_reviews: true

# billing-web.yml (config/repositories/billing-web.yml)
protected_branches:
  main:
    required_reviews: 3      # Yalnızca bu alan farklı
```

Sonuç: `billing-web` için `main` dalı **3 onay** ister, ama `require_code_owner_review`
ve `dismiss_stale_reviews` varsayılandan gelmeye devam eder.

Birleştirme dal bazında yapılır — bir dalı ezmek o dalın diğer alanlarını silmez.

---

## 4. Yaygın İşlemler

### Yeni repo eklemek

`config/repositories/yeni-servis.yml` adında yeni bir dosya oluşturup içine şunları yazın:

```yaml
description: "Kısa açıklama"
language: go
mentors: [mentor-a]
developers: [dev-1, dev-2]
```

Dosya oluştuktan sonra dallar, korumalar, takımlar, label'lar ve CODEOWNERS otomatik oluşur.

### Projeye developer eklemek

İlgili repo'nun `developers` listesine kullanıcı adını ekle. Kişi organizasyonda yeni
ise `people` bölümüne de bir satır ekle.

### Kişiyi projeden çıkarmak

`developers` listesinden adını sil. Terraform o kişinin takım üyeliğini kaldırır ve
repo erişimi anında sona erer.

### Kişi işten ayrıldığında

Tüm repo'ların `developers` / `mentors` listelerinden ve `people` bölümünden çıkar.
Tek noktadan yönetildiği için repo repo dolaşmak gerekmez.

> ⚠️ Terraform yalnızca **GitHub'ı** yönetir. Linear, Slack ve diğer sistemlerdeki
> erişimler ayrıca kaldırılmalıdır. Tam kontrol listesi: [`runbook.md`](runbook.md).

### Mentör değiştirmek

`mentors` alanını güncelle. Eski mentörün admin yetkisi otomatik düşer, yenisininki
gelir. Kural metnine dokunulmaz.

### Bir repo'da onay kuralını gevşetmek

`config/repositories/rapid-prototype.yml` içine:

```yaml
protected_branches:
  develop:
    required_reviews: 0        # Onaysız merge serbest
    require_status_checks: []  # CI beklemeden merge
```

`push_allowed_roles` ezilmediği sürece developer'lar yine doğrudan push atamaz; katkı
PR üzerinden gelmeye devam eder — sadece bekleme kalkar.

### Repo'yu kapatmak

```yaml
# config/repositories/legacy-api.yml
archived: true
```

**Config dosyasını dizinden silmeyin.** Silmek Terraform'a "bu repo'yu yok et" demektir;
`prevent_destroy` koruması devreye girip `apply`'ı durdurur:

```
Error: Instance cannot be destroyed
```

Doğru yol arşivlemektir: repo dondurulur, içerik korunur, kimse yazamaz.

---

## 5. Değişiklik Nasıl Yürürlüğe Girer

```
config/repositories/*.yml veya organization.yml değişir
        ↓
    Pull Request
        ↓
CI: terraform plan  →  plan çıktısı PR'a yorum olarak düşer
        ↓
    Review + Merge
        ↓
   terraform apply  →  GitHub'da yetkiler güncellenir
```

**`plan` çıktısını okumadan onaylamayın.** Özellikle şu satıra bakın:

```
Plan: 3 to add, 1 to change, 0 to destroy.
```

`destroy` sayısı 0'dan büyükse ne silineceğini mutlaka kontrol edin.

### Elle çalıştırmak

```powershell
terraform -chdir=terraform plan     # Farkı göster, hiçbir şeyi değiştirme
terraform -chdir=terraform apply    # Uygula (onay ister)
```

Sistemin kararlı olduğunu doğrulamak için:

```
No changes. Your infrastructure matches the configuration.
```

Bundan farklı bir çıktı ya birinin arayüzden elle değişiklik yaptığını ya da bir ayarın
yerleşmediğini gösterir.

---

## 6. Sık Karşılaşılan Tuzaklar

**Arayüzden yaptığınız değişiklik geri alınır.** GitHub arayüzünden branch protection
değiştirirseniz bir sonraki `apply` bunu eski hâline döndürür. Kalıcı değişikliğin tek
yolu config'dir. Bu bir hata değil, standart dışına çıkışı otomatik düzelten bir
güvencedir.

**GitHub bazı istekleri sessizce yok sayar.** Örneğin bir takımı `push_allowed_roles`
listesine koyarsanız ama o takımın repo erişimi yoksa, GitHub isteği hata vermeden
görmezden gelir. Belirtisi: her `plan`'da aynı kaynağın "değişecek" görünmesi. Böyle bir
durumda ayarın gerçekten yerleşip yerleşmediğini kontrol edin.

**`require_status_checks` ile CI dağıtımı birlikte ayarlanmalı.** Bir repo'ya CI
workflow'u dağıtılmıyorsa `require_status_checks` da boşaltılmalıdır; yoksa PR'lar hiç
raporlanmayacak bir check'i sonsuza kadar bekler ve merge edilemez.

**Kullanıcı adı yazım hataları sessizdir.** Var olmayan bir kullanıcı adı `apply`
sırasında hata verir, ama var olan **yanlış** bir kullanıcıya yetki vermek hiçbir uyarı
üretmez.

**Free plan kısıtı.** Private repo'larda branch protection ve push kısıtları GitHub Team
planı gerektirir. Şu an public repo'larla çalışıldığı için bu kısıt hissedilmiyor;
private'a geçişte plan yükseltmesi gerekecek.

---

## 7. CI/CD Otomasyonu ve Kimlik Yapılandırması

Sistemde **iki ayrı kimlik** var; karıştırılmamalıdır:

| Kimlik | Neye erişir | Nerede durur |
| :--- | :--- | :--- |
| **`TF_API_TOKEN`** (HCP Team API Token) | GitHub Actions → HCP Terraform Cloud (state + run) | GitHub repository secret |
| **`tidyorg-infra-bot`** (GitHub App) | Terraform provider → GitHub organizasyonu | HCP Terraform'da sensitive environment variable |

GitHub'a yazan taraf **App**'tir; `TF_API_TOKEN` yalnızca CI'ın HCP'ye bağlanmasını
sağlar. App'in private key'i hiçbir geliştiricinin makinesine inmez ve installation
token'ı ~1 saatte bir otomatik yenilenir. Kurulum ve izin listesi:
[`../integrations/github-app/README.md`](../integrations/github-app/README.md).

### 7.1 Team API Token Oluşturma (HCP Terraform)

1. HCP Terraform'da organizasyon ayarlarına gidin:
   `https://app.terraform.io/app/tidyorg-infra/settings/organization-tokens`
2. **Team Tokens** sekmesini seçin.
3. Workspace üzerinde `Admin` veya `Write` yetkisi olan bir takımı seçin (örn: `owners` takımı).
4. **"Generate a team token"** butonuna basın, açıklama yazın ve oluşturun.
5. Oluşturulan token'ı kopyalayın.

### 7.2 GitHub Secrets Konfigürasyonu

1. GitHub'da `tidyorg` reposunun ayarlarına (**Settings**) gidin.
2. Sol menüden **Secrets and variables** -> **Actions** yolunu izleyin.
3. **"New repository secret"** butonuna tıklayın.
4. İsim alanına **`TF_API_TOKEN`** yazın.
5. Değer alanına kopyaladığınız Team API Token'ı yapıştırın ve kaydedin.

---

## 8. İlgili Dokümanlar

- [`workflow-guide.md`](workflow-guide.md) — İş akışlarının genel görünümü
- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Roller ve yetki matrisi
- [`runbook.md`](runbook.md) — Operasyonel senaryolar
- [`../ACCESS-MODEL.md`](../ACCESS-MODEL.md) — Modelin gerekçeleri ve verilen kararlar
- [`../terraform/config/organization.example.yml`](../terraform/config/organization.example.yml) — Tam şema örneği
- [`../terraform/config/repository.example.yml`](../terraform/config/repository.example.yml) — Repo şema örneği
