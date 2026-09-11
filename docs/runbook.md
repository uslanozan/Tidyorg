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

**Org ayarlarında ona bağlı bir şey var mı:**
- [ ] 💳 **`billing_email` bu kişiyi mi gösteriyor?** Gösteriyorsa
      [`terraform/org-settings.tf`](../terraform/org-settings.tf) içinde değiştir.
      **2026-08-15'te bu atlandı:** kişinin tüm yetkileri alınmıştı ama fatura
      bildirimleri üç gün daha ona gitti; 08-18'de import sırasında fark edildi.
      ⚠️ Provider bu alanı **okuyamıyor** — import'ta boş geliyor. Yani drift'ini
      `plan` göstermez ve arayüzden değiştirilse kimse fark etmez. `org-settings.tf`'teki
      satır bir kayıt değil, **tek doğruluk kaynağı**; bu maddenin listede olması da
      o yüzden zorunlu.
- [ ] Org owner'ları arasında mıydı? `people.yml` → `org_role` kontrol edildi mi
      _(break-glass olarak yönetim dışı bırakılmış kişiler `people.tf` →
      `unmanaged_people` içinde; onların rolü Terraform'dan değil arayüzden alınır)_

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

`terraform/config/repositories/yeni-servis.yml` adında **yeni bir dosya** oluştur.
Dosya adı repo adı olur; içinde repo adı tekrar yazılmaz:

```yaml
description: "Kısa açıklama"
language: go
mentors: [mentor-a]
developers: [dev-1, dev-2]
```

Dört satır. Dallar, korumalar, takımlar, label'lar, şablon dosyaları, CI workflow'u ve
CODEOWNERS otomatik oluşur.

`apply` sonrası kontrol et: repo açıldı mı, default branch `develop` mü, CODEOWNERS
yerinde mi.

### 2.2 Repo'yu kapatmak

`config/repositories/eski-servis.yml` dosyasına ekle:

```yaml
archived: true
```

**Dosyayı dizinden silmeyin.** Silmek Terraform'a "yok et" demektir. `prevent_destroy`
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
3. `config/repositories/<repo-adı>.yml` dosyasını sil
4. `plan` çıktısını **dikkatle** oku — yalnızca hedeflenen repo silinmeli
5. `apply`
6. `prevent_destroy` bloğunu **geri koy**

Adım 6 unutulursa koruma tüm repo'lar için kalkmış olur.

### 2.4 Bir repo'nun kurallarını değiştirmek

`config/repositories/payments-api.yml` içine:

```yaml
protected_branches:
  main:
    required_reviews: 3
```

Yalnızca farklı olan alanı yaz; geri kalanı `defaults`'tan gelmeye devam eder.
Birleştirme dal bazında yapılır — bir dalı ezmek o dalın diğer alanlarını silmez.

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

### 3.6 Biri arayüzden bir şeyi değiştirdi ya da sildi

Mentör ve head-of-engineering rolleri arayüzden değişiklik yapabilir — `enforce_admins`
kalıcı olarak `false` ([Karar E](../ROADMAP.md)). Yani bu senaryo **istisna değil, beklenen
bir durum.** Sistemin buna verdiği cevap üç farklı davranışa ayrılır:

| Ne yapıldı | Terraform ne yapar | Sonuç |
| :--- | :--- | :--- |
| **Yönetilen bir alan değişti** _(onay sayısı 1 → 2)_ | `plan`'da `~ update in-place` çıkar | ✅ `apply` eski değere döndürür |
| **Yönetilen bir kaynak silindi** _(branch protection kuralı)_ | Refresh'te `Drift detected (delete)` | ✅ `apply` **yeniden yaratır** |
| **Yönetilmeyen bir şey silindi** _(varsayılan olmayan bir dal)_ | Hiçbir şey — haberi olmaz | ⚠️ Sessizce kaybolur |

**Üçüncü satır bu sistemin bilinen sınırı.** Modül yalnızca **varsayılan dalı** yönetir
(`github_branch.default`, yalnızca `default_branch != "main"` iken oluşur). Varsayılan
olmayan uzun ömürlü bir dal silinirse Terraform onu geri getirmez. Commit'ler git
tarafında kaybolmaz (reflog, açık PR'lar durur) ama dalın kendisi beyan edilmediği için
otomatik onarım yoktur.

> **Bilinmesi gereken ayrım — kural dala bağlı değildir.**
> Branch protection bir **isim desenine** uygulanır, dalın kendisine değil. Dal silinse
> bile kural durabilir; o isimde bir dal yeniden açıldığında **kendiliğinden devreye
> girer.** Var olmayan bir dala işaret eden kural zararsızdır ama görünmezdir — bu yüzden
> bir dalı kalıcı olarak kaldırırken config'den de düşürülmelidir
> (bkz. [`branching-strategy.md`](branching-strategy.md) Bölüm 8.1).

**Ne yapmalı:**

1. `terraform plan` çalıştırın — değişiklik yönetilen bir şeye aitse görünür.
2. Değişiklik **kalıcı olsun isteniyorsa** arayüzde bırakmayın; config'e yazıp `apply` edin.
   Aksi halde bir sonraki apply geri alır ve "ayarım kayboldu" şikayeti gelir.
3. Silinen şey yönetim dışıysa (dal, etiket, milestone) elle geri getirilmelidir.

**Yaşanmış örnek (2026-08-17):** `tidyorg` reposunda `develop` dalı
ve koruma kuralı arayüzden silindi. Dal zaten yönetilmiyordu (bu repoda varsayılan `main`),
o yüzden Terraform fark etmedi. Koruma kuralı ise yönetiliyordu — ve config'den aynı anda
düşürülmeseydi bir sonraki `apply` **var olmayan bir dal için kuralı sessizce geri
yaratacaktı.**

---

## 4. Bilinen Kısıtlar

**Terraform yalnızca GitHub'ı yönetir.** Linear, Slack ve diğer sistemler kapsam
dışıdır.

**Arayüzden yapılan değişiklikler kalıcı değildir — ama yalnızca yönetilen kaynaklar
için.** Yönetilen bir ayar değiştirilir ya da silinirse bir sonraki `apply` geri alır;
**yönetilmeyen bir şey silinirse Terraform'un haberi bile olmaz.** Varsayılan olmayan
dallar, etiketler ve milestone'lar bu ikinci gruba girer. Üç durumun tablosu ve yaşanmış
örnek: Bölüm 3.6.

Mentörlere bu davranış önceden bildirilmelidir, aksi halde "ayarım kayboldu" şikayeti
gelir.

**Süre sınırlı erişim yoktur.** Geçici erişimler elle kaldırılmalıdır.

**Free plan.** Private repo'larda branch protection ve push kısıtları GitHub Team planı
gerektirir. Şu an public repo'larla çalışılıyor.

**Repo güvenlik ayarları yönetilmiyor.** Secret scanning, push protection,
`vulnerability_alerts` ve code scanning'in hiçbiri config'den kurulmuyor — bkz.
[`security-policy.md`](security-policy.md) Bölüm 5.

**Otomasyonun kimliği: `tidyorg-infra-bot` GitHub App'i** _(2026-08-15'ten beri)_.
Terraform'un yaptığı commit'ler artık bir kişinin değil bot'un adına düşüyor; audit
log'da elle yapılan değişiklikten ayırt edilebiliyor. Kurulum:
[`../integrations/github-app/README.md`](../integrations/github-app/README.md).

---

## 5. İlgili Dokümanlar

- [`config-guide.md`](config-guide.md) — Config alanlarının tam referansı
- [`workflow-guide.md`](workflow-guide.md) — Genel iş akışı
- [`rbac-and-permissions.md`](rbac-and-permissions.md) — Roller ve yetki matrisi
- [`adr/004-config-driven-access-management.md`](adr/004-config-driven-access-management.md) — Neden bu mimari
- [`../ACCESS-MODEL.md`](../ACCESS-MODEL.md) — Model ve verilen kararlar
