# Runbook — Operasyonel Senaryolar

Bir şey yapman gerektiğinde bakılacak yer burası. Her senaryo adım adım, "neden"
açıklamasıyla birlikte.

> **Kimin için:** mentörler ve head-of-engineering.
> Alan referansı için: [`config-guide.md`](config-guide.md).

---

## 1. Kişi İşlemleri

### 1.1 Yeni kişi organizasyona katılıyor

1. `terraform/config/organization.yml` → `people` bölümüne ekle:
   ```yaml
   people:
     yeni-kullanici:
       org_role: member
   ```
2. Çalışacağı repo'ların `developers` listesine kullanıcı adını ekle
3. PR aç → `plan` çıktısını kontrol et → merge → `apply`
4. Kişiye [`onboarding.md`](onboarding.md) bağlantısını gönder

GitHub daveti otomatik gider. Kişi daveti kabul edip 2FA'yı açana kadar erişim aktifleşmez.

### 1.2 Kişi yeni bir projeye katılıyor

İlgili repo'nun `developers` listesine ekle. Başka bir şey gerekmez — `people` bölümünde
zaten kayıtlıdır.

Bir kişi aynı anda birden fazla projede yer alabilir (many-to-many).

### 1.3 Kişi bir projeden ayrılıyor

İlgili repo'nun `developers` listesinden çıkar. Takım üyeliği kalkar, repo erişimi
`apply` ile birlikte sona erer. Diğer projelerindeki erişimi etkilenmez.

### 1.4 Kişi şirketten ayrılıyor (offboarding)

> ⚠️ **Terraform yalnızca GitHub'ı yönetir.** Aşağıdaki listenin GitHub dışı maddeleri
> elle yapılmalıdır. Bu, sistemin bilinen bir kapsam sınırıdır — bkz.
> [`adr/004`](adr/004-config-driven-access-management.md).

**GitHub (config üzerinden):**
- [ ] Tüm repo'ların `developers` ve `mentors` listelerinden çıkar
- [ ] `people` bölümünden kaydını sil
- [ ] Mentördü ise sorumlu olduğu repo'lara **yeni mentör ata** — repo mentörsüz kalmamalı
- [ ] PR aç, hızlıca merge et, `apply` çalıştır
- [ ] Kişisel access token'ları (PAT) ve SSH anahtarları — kendi hesabında oldukları için
      hesap erişimi kesilince geçersizleşir, ancak organizasyon adına oluşturulmuş
      token'lar varsa iptal edilmeli

**GitHub dışı (elle):**
- [ ] Linear erişimi
- [ ] Slack kanalları
- [ ] Varsa bulut hesapları (AWS, Cloudflare vb.)
- [ ] Paylaşılan hesapların şifreleri değiştirildi mi

**Devir:**
- [ ] Açık PR'ları ve issue'ları başka birine ata
- [ ] Üzerinde çalıştığı dallar gözden geçirildi mi

### 1.5 Acil erişim kesme

Normal akış PR + review gerektirir ve dakikalar sürer. Güvenlik gerektiren bir durumda
(hesap ele geçirilmiş, kişi aniden ayrılmış) beklemeyin:

1. **Önce GitHub arayüzünden** kişiyi organizasyondan çıkarın — erişim anında kesilir
2. **Sonra** config'i güncelleyin ve PR açın

Bu sıralama önemlidir. Config'i güncellemeden bırakırsanız bir sonraki `apply` kişiyi
geri ekler.

---

## 2. Repo İşlemleri

### 2.1 Yeni repo açmak

```yaml
repositories:
  yeni-servis:
    description: "Kısa açıklama"
    language: go
    mentors: [mentor-a]
    developers: [dev-1, dev-2]
```

Beş satır. Dallar, korumalar, takımlar, label'lar ve CODEOWNERS otomatik oluşur.

`apply` sonrası kontrol et: repo açıldı mı, default branch `develop` mü, CODEOWNERS
yerinde mi.

### 2.2 Repo'yu kapatmak

```yaml
repositories:
  eski-servis:
    archived: true
```

**Config'den satırı silmeyin.** Silmek Terraform'a "yok et" demektir. `prevent_destroy`
koruması devreye girer ve `apply` şu hatayla durur:

```
Error: Instance cannot be destroyed
```

Bu koruma bilinçlidir: dashboard'da yanlışlıkla silinen bir satır repo'yu yok etmemeli.

Arşivleme repo'yu salt okunur yapar; kod, issue'lar ve geçmiş korunur.

### 2.3 Repo'yu gerçekten silmek

Nadiren gerekir. Sırasıyla:

1. Repo'nun gerçekten silinmesi gerektiğini teyit et — arşivleme yetmiyor mu?
2. `terraform/modules/repository/main.tf` içindeki `lifecycle { prevent_destroy = true }`
   bloğunu geçici olarak kaldır
3. Config'den repo satırını sil
4. `plan` çıktısını **dikkatle** oku — yalnızca hedeflenen repo silinmeli
5. `apply`
6. `prevent_destroy` bloğunu **geri koy**

Adım 6 unutulursa koruma tüm repo'lar için kalkmış olur.

### 2.4 Bir repo'nun kurallarını değiştirmek

```yaml
repositories:
  payments-api:
    protected_branches:
      main:
        required_reviews: 3
```

Yalnızca farklı olan alanı yaz; geri kalanı `defaults`'tan gelmeye devam eder.

### 2.5 Mentör değiştirmek

`mentors` alanını güncelle. Eski mentörün admin yetkisi otomatik düşer, yenisi gelir.

---

## 3. Terraform İşlemleri

### 3.1 Sistemin sağlıklı olduğunu doğrulamak

```powershell
terraform -chdir=terraform plan
```

Beklenen:

```
No changes. Your infrastructure matches the configuration.
```

Bundan farklı bir çıktı iki anlama gelebilir: biri arayüzden elle değişiklik yapmıştır,
ya da bir ayar GitHub tarafından kabul edilmemiştir.

Bu kontrolü haftada bir çalıştırmak iyi bir alışkanlıktır.

### 3.2 Drift — "değişecek" diyen ama hiç bitmeyen kaynak

**Belirti:** Her `plan`'da aynı kaynak "değişecek" görünüyor, `apply` sorunsuz bitiyor
ama sonraki `plan` yine aynı şeyi diyor.

**Sebep:** GitHub isteği kabul ediyor gibi görünüp **sessizce yok sayıyor.**

**Bilinen örnek:** Bir takımı `push_allowed_roles` listesine koydunuz ama o takımın
repo'ya erişimi yok. GitHub hata vermiyor, sadece uygulamıyor.

**Ne yapmalı:** İlgili ayarın ön koşulunu kontrol edin — takımın repo erişimi var mı,
kullanıcı organizasyon üyesi mi, plan seviyesi bu özelliği destekliyor mu.

### 3.3 Apply yarıda kaldı

Terraform oluşturduklarını geri almaz; state'e yazıp durur. Hatayı düzeltip tekrar
`apply` demek yeterlidir — yalnızca eksikleri tamamlar. Baştan kurmaya gerek yoktur.

### 3.4 `plan` çıktısında `destroy` görüyorum

**Dur.** Ne silineceğini oku. Beklenmedik bir silme genelde şu üçünden biridir:

- Config'den bir satır yanlışlıkla silinmiş
- Bir alanın adı yanlış yazılmış (Terraform onu "kaldırılmış" sayar)
- Bir kaynak elle GitHub'dan silinmiş, Terraform yeniden yaratmaya çalışıyor

Emin değilsen merge etme.

### 3.5 State kilidi

Aynı anda iki `apply` çalışamaz. "Workspace is locked" hatası alırsanız birinin işlemi
devam ediyordur. HCP Terraform arayüzünden çalışan run'ı görebilirsiniz.

---

## 4. Bilinen Kısıtlar

**Terraform yalnızca GitHub'ı yönetir.** Linear, Slack ve diğer sistemler kapsam
dışıdır.

**Arayüzden yapılan değişiklikler kalıcı değildir.** Bir sonraki `apply` geri alır.
Mentörlere bu davranış önceden bildirilmelidir, aksi halde "ayarım kayboldu" şikayeti
gelir.

**Süre sınırlı erişim yoktur.** Geçici erişimler elle kaldırılmalıdır.

**Free plan.** Private repo'larda branch protection ve push kısıtları GitHub Team planı
gerektirir. Şu an public repo'larla çalışılıyor.

**Terraform commit'leri kişisel token üzerinden gidiyor.** Otomasyonun yaptığı
değişiklikler bir kişinin adına görünür. GitHub App'e geçiş planlanmaktadır —
[`notes/github-auth-strategy.md`](notes/github-auth-strategy.md).

---

## 5. İlgili Dokümanlar

- [`config-guide.md`](config-guide.md) — Config alanlarının tam referansı
- [`workflow-guide.md`](workflow-guide.md) — Genel iş akışı
- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Roller ve yetki matrisi
- [`adr/004-config-driven-access-management.md`](adr/004-config-driven-access-management.md) — Neden bu mimari
- [`../ACCESS-MODEL.md`](../ACCESS-MODEL.md) — Model ve verilen kararlar
