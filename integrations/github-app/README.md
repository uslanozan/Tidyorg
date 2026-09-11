# tidyorg-infra-bot — GitHub App

Terraform'un GitHub organizasyonunu yönetmesi için kullanılan bot kimliği.
Kişisel token (PAT) yerine organizasyona ait bir GitHub App kullanmanın avantajları:

- **Kişi bağımlılığı yok** — kişi ayrılsa bile sistem çalışmaya devam eder
- **Audit log** — tüm işlemler `tidyorg-infra-bot[bot]` adına görünür, manuel değişikliklerle karışmaz
- **Kısa ömürlü token** — ~1 saatlik installation token otomatik yenilenir, uzun ömürlü sır saklanmaz
- **Dar kapsam** — yalnızca izin verilen repo ve org işlemleri yapılabilir

## Mevcut Kurulum

| Alan | Değer |
| :--- | :--- |
| **App ID** | `<YOUR_APP_ID>` |
| **Installation ID** | `<YOUR_INSTALLATION_ID>` |
| **Organizasyon** | `your-org` |
| **Kuruldu** | 2026-08-15 |
| **Kuran** | owner-a |

### İzinler

| Tür | İzin | Seviye | Neden |
| :--- | :--- | :--- | :--- |
| Repository | Administration | Read and write | Branch protection, takım erişimi |
| Repository | Contents | Read and write | Dosya yazma (CODEOWNERS vb.) |
| Repository | Issues | Read and write | Label seti yönetimi |
| Repository | Workflows | Read and write | `.github/workflows/*` yazmak |
| Repository | Metadata | Read-only | Repo bilgisi okuma (zorunlu) |
| Organization | Members | Read and write | Org üyeliği yönetimi |
| Organization | Administration | Read and write | Org ayarları (`github_organization_settings`) |

> ⚠️ **`Administration` iki kere geçiyor ve bunlar AYNI İZİN DEĞİL.**
> `Repository → Administration` repo ayarlarını açar; org ayarları için
> `Organization → Administration` gerekir. Manifest'te ilki `administration`,
> ikincisi `organization_administration` anahtarıyla durur.

---

## Sıfırdan Kurulum Rehberi

> Bu bölüm App silinip yeniden oluşturulması gerekirse kullanılır.
> Referans config: [`app-manifest.json`](app-manifest.json)

### 1. GitHub App Oluştur

Şu sayfaya git (org admin yetkisi gerekir):

```
https://github.com/organizations/your-org/settings/apps/new
```

Formu doldur:

| Alan | Değer |
| :--- | :--- |
| **GitHub App name** | `tidyorg-infra-bot` |
| **Homepage URL** | `https://github.com/your-org` |
| **Webhook → Active** | ❌ İşareti kaldır |
| **Where can this app be installed?** | Only on this account |

**Repository permissions:**

| İzin | Değer | Neden |
| :--- | :--- | :--- |
| Administration | Read and write | Repo ayarları, branch protection, takım erişimleri |
| Contents | Read and write | CODEOWNERS ve şablon dosyalarını repo'ya yazmak |
| Issues | Read and write | `github_issue_labels` — label seti yönetimi |
| Workflows | Read and write | `.github/workflows/*` dosyalarını yazmak |
| Metadata | Read-only (otomatik) | — |

> ⚠️ **Son iki satır sonradan, hata alınarak eklendi — atlama.**
>
> - **Issues** yoksa label senkronizasyonu `403 Resource not accessible by integration`
>   ile patlar (2026-08-15'te yaşandı).
> - **Workflows** yoksa `.github/workflows/` altına dosya yazmak 403 verir.
>   GitHub bu yolu ayrı bir izne bağlamıştır; `Contents: write` **tek başına yetmez.**
>   Şablon dağıtımı (Faz 2) bu izin olmadan çalışmaz.

**Organization permissions:**

| İzin | Değer | Neden |
| :--- | :--- | :--- |
| Members | Read and write | `github_membership` — org üyeliği ve owner rolü |
| Administration | Read and write | `github_organization_settings` — base permission, üye izinleri, güvenlik varsayılanları |

> ⚠️ **`Organization → Administration` sonradan, hata alınarak eklendi — atlama.**
> Yukarıdaki `Repository → Administration` **bunu karşılamaz**; ikisi ayrı izindir.
> Yoksa `PATCH /orgs/{org}` isteği `403 Resource not accessible by integration`
> ile patlar (2026-08-18'de yaşandı, `default_repository_permission` apply'ında).
>
> 📌 **Örüntü:** bu, `Issues` ve `Workflows` 403'lerinin üçüncüsü. Üçünde de sebep
> aynı: **GitHub, geniş sanılan bir izni daha dar tanımlamış.** Yeni bir kaynak
> türüne ilk kez dokunurken bu 403'ü beklemek gerekiyor — App izinleri en az yetkiyle
> kurulduğu için normal davranış, hata değil.

"Create GitHub App" butonuna tıkla.

---

### 2. App ID'yi Not Al

App oluşturulduktan sonra açılan sayfada üstte:

```
App ID: <YOUR_APP_ID>
```

Bu sayıyı bir yere not al.

---

### 3. Private Key Oluştur ve İndir

Aynı sayfada aşağı kaydır → **"Private keys"** bölümü:

1. **"Generate a private key"** butonuna tıkla
2. `.pem` uzantılı dosya otomatik iner (örn: `tidyorg-infra-bot.2026-08-15.private-key.pem`)
3. Bu dosyayı güvenli bir yerde sakla — **bir daha indiremezsin**

> ⚠️ `.pem` dosyası RSA özel anahtarıdır. Asla repoya commit etme, paylaşma.
> İçeriği HCP Terraform'a girdikten sonra dosyayı güvenli şekilde sil veya şifreli sakla.

---

### 4. PEM Dosyasını HCP Formatına Çevir

GitHub App'in `.pem` dosyası çok satırlı RSA özel anahtarıdır:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA1234...
abcd...
...
-----END RSA PRIVATE KEY-----
```

HCP Terraform bunu **tek satır** olarak bekler; satır sonları `\n` karakteriyle temsil edilmeli.

**PowerShell ile çevir:**

```powershell
# Dosya adını kendi indirilen dosyanla değiştir
$pem = Get-Content "$env:USERPROFILE\Downloads\tidyorg-infra-bot.2026-08-15.private-key.pem" -Raw
$oneLine = $pem -replace "`r`n", "\n" -replace "`n", "\n"
$oneLine | Set-Clipboard
Write-Host "Kopyalandı! HCP Terraform'a yapıştırabilirsin."
```

Çıktı şöyle görünmeli:
```
-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA1234...\n...\n-----END RSA PRIVATE KEY-----\n
```

---

### 5. App'i Organizasyona Kur

App settings sayfasında sol menüde **"Install App"**:

1. `your-org` organizasyonunu seç
2. **"Install"** tıkla
3. "All repositories" seç → **"Install"**

Kurulumdan sonra Installation ID'yi al:

```
https://github.com/organizations/your-org/settings/installations
```

→ `tidyorg-infra-bot` → "Configure" tıkla → URL'ye bak:

```
https://github.com/settings/installations/<YOUR_INSTALLATION_ID>
                                          ^^^^^^^^^^
                                          Installation ID
```

---

### 6. HCP Terraform'a Değişkenleri Gir

```
https://app.terraform.io → tidyorg-infra org → github-management workspace → Variables
```

"Add variable" ile şu üç değişkeni ekle:

| Key | Category | Value | Sensitive |
| :--- | :--- | :--- | :--- |
| `github_app_id` | terraform | `<YOUR_APP_ID>` | Hayır |
| `github_app_installation_id` | terraform | `<YOUR_INSTALLATION_ID>` | Hayır |
| `github_app_pem_file` | terraform | *(4. adımda kopyalanan tek satır)* | **Evet** |

> **Önemli:** Category "terraform" olmalı — "environment variable" değil.
> Key ismi `TF_VAR_` prefix'i **olmadan** yazılır.

---

### 7. Terraform Kodunu Kontrol Et

[`terraform/main.tf`](../../terraform/main.tf) dosyasında provider şöyle olmalı:

```hcl
provider "github" {
  owner = var.github_org_name

  app_auth {
    id              = var.github_app_id
    installation_id = var.github_app_installation_id
    pem_file        = var.github_app_pem_file
  }
}
```

[`terraform/variables.tf`](../../terraform/variables.tf) dosyasında:

```hcl
variable "github_app_id" {
  type        = string
  description = "GitHub App ID (tidyorg-infra-bot)"
}

variable "github_app_installation_id" {
  type        = string
  description = "GitHub App Installation ID (org kurulumu)"
}

variable "github_app_pem_file" {
  type        = string
  description = "GitHub App private key (PEM içeriği, newline'lar \\n olarak)"
  sensitive   = true
}
```

---

### 8. Test Et

```powershell
cd terraform/
terraform init
terraform plan
```

Başarılı çıktı şöyle görünür:
```
Terraform used the selected providers to generate the following execution plan.
...
No changes. Your infrastructure matches the configuration.
```

Veya drift varsa değişiklik listesi gelir — `No changes` olana kadar `apply` yapılabilir.

---

## Sorun Giderme

### "401 Unauthorized" veya "Could not authenticate"

- HCP'deki `github_app_pem_file` değerini kontrol et: `-----BEGIN RSA PRIVATE KEY-----` ile başlamalı
- Satır sonlarının `\n` olarak yazıldığından emin ol (`\\n` değil — iki backslash değil, bir backslash + n)
- App'in organizasyona kurulu olduğunu doğrula: https://github.com/organizations/your-org/settings/installations

### "Variable not declared" uyarısı

HCP değişken key'inde `TF_VAR_` prefix'i varsa kaldır. `github_app_id` olmalı, `TF_VAR_github_app_id` değil.

### Private key kayboldu

GitHub App settings sayfasında eski key'i iptal edip yeni bir tane üretebilirsin:
```
https://github.com/organizations/your-org/settings/apps/tidyorg-infra-bot
```
→ "Private keys" → "Generate a private key" → 4. adımı tekrarla → HCP'de güncelle.
