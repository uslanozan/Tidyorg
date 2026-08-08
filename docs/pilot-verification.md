# Pilot Doğrulama Raporu — `pilot-intern-web`

**Tarih:** 2026-08-07
**Kapsam:** `terraform/modules/repository` modülünün uçtan uca doğrulanması
**Repo:** https://github.com/your-org/pilot-intern-web

Bu rapor, konfigürasyondan repo üretme zincirinin gerçekten çalıştığını kanıtlar.
Sunumda "çalışıyor" demek yerine gösterilecek kayıt budur.

---

## 1. Ne Denendi

Tek bir YAML satırından — [`terraform/config/organization.yml`](../terraform/config/organization.yml) —
tam donanımlı bir repo üretilmesi:

```yaml
repositories:
  pilot-intern-web:
    description: "Pilot proje — repository modülünün uçtan uca doğrulanması"
    language: typescript
    mentors: [uslanozan]
    developers: [paitblack]
```

Geri kalan her şey (görünürlük, dallar, korumalar, label'lar, takımlar, CODEOWNERS)
`defaults` bölümünden miras alındı. Repo'ya özel tek bir kural yazılmadı.

**Sonuç:** `Apply complete! Resources: 25 added, 0 changed, 0 destroyed.`

---

## 2. Üretilen Kaynaklar

| Kaynak | Adet | Detay |
| :--- | :--- | :--- |
| Repo | 1 | `pilot-intern-web`, public |
| Dal | 2 | `main` (auto-init) + `develop` |
| Varsayılan dal ayarı | 1 | `develop` |
| Takım | 2 | `pilot-intern-web-mentors`, `pilot-intern-web-devs` |
| Takım üyeliği | 2 | Ozan → mentors (maintainer), Emre → devs (member) |
| Repo erişimi | 3 | mentors (admin), devs (write), platform-admins (admin) |
| Dal koruması | 2 | `main`, `develop` |
| Label seti | 13 | Tek `github_issue_labels` kaynağında |
| Dosya | 1 | `.github/CODEOWNERS` |

---

## 3. Doğrulama Sonuçları

Tamamı GitHub arayüzünden gözle kontrol edildi. Ekran görüntüleri
`docs/images/pilot-verification/` klasöründe, bu bölümdeki sıraya göre numaralıdır.

### Repo ve dallar
- [x] Repo oluştu, açıklama config'den geldi
- [x] Varsayılan dal **`develop`** — `main` değil
- [x] İki dal mevcut, 2 commit (initial + CODEOWNERS)

![Repo ana sayfası ve dal seçici — develop dalı default olarak işaretli, iki dal ve iki commit mevcut](images/pilot-verification/01-repo-branches.png)

`auto_init` ile doğan `main` dalının üzerine `develop` açıldı ve varsayılan yapıldı.
İkinci commit, Terraform'un yazdığı CODEOWNERS dosyasına ait.

### CODEOWNERS
- [x] `.github/CODEOWNERS` dosyası repo'da mevcut
- [x] GitHub **"This CODEOWNERS file is valid"** doğrulaması geçti
- [x] İçerik doğru: `*  @your-org/pilot-intern-web-mentors`
- [x] Dosyanın Terraform tarafından üretildiği başlıkta belirtilmiş

![CODEOWNERS dosyası — GitHub'ın geçerlilik doğrulaması geçmiş, tüm dosyalar mentör takımına yönlendirilmiş](images/pilot-verification/02-codeowners.png)

> Bu dosya kritik: `require_code_owner_review` ayarı, repo'da CODEOWNERS yoksa
> hiçbir şey zorlamaz. Dosya olmadan `main` koruması kâğıt üstünde kalırdı.
>
> GitHub'ın yeşil **"This CODEOWNERS file is valid"** bandı önemli: bu dosyadaki
> sözdizimi hatası veya var olmayan bir takım adı sessizce yok sayılır, kural da
> uygulanmaz. Doğrulamanın geçmiş olması, takım adının doğru üretildiğini kanıtlar.

### Label'lar
- [x] Tam **13 label** — ne eksik ne fazla
- [x] Türkçe açıklamalar config'den geldi
- [x] GitHub'ın varsayılan label'ları (`documentation`, `duplicate`, `enhancement`,
      `invalid`, `question`, `wontfix`) **temizlendi**

![Labels sayfası — tam 13 label, açıklamalar config'den gelen Türkçe metinler](images/pilot-verification/03-labels.png)

Başlıktaki **"13 labels"** sayısı, çoğul `github_issue_labels` kaynağının repo'nun
label setini tam olarak yönettiğini gösterir (bkz. Bölüm 4.1).

### Yetkiler
- [x] `pilot-intern-web-devs` → **write**
- [x] `pilot-intern-web-mentors` → **admin**
- [x] `platform-admins` → **admin** (head-of-engineering rolü, organizasyon kapsamı)
- [x] Base role: **Read** — org üyeleri repo'yu görebiliyor ama yazamıyor

![Collaborators and teams — üç takım ve rolleri: devs write, mentors admin, platform-admins admin](images/pilot-verification/04-collaborators-teams.png)

Üç takımın da **Direct access** sekmesinde görünmesi önemli: yetki organizasyon
genelinden değil, repo'ya doğrudan verilmiş durumda. `platform-admins` satırı
Bölüm 4.2'de anlatılan düzeltmeyle eklendi.

### Dal koruması — `develop`
- [x] PR zorunlu
- [x] **1 onay** gerekli
- [x] Stale review dismiss açık
- [x] Code Owners işareti **kapalı** → başka bir developer'ın onayı yeterli
- [x] Force push ve dal silme kapalı

![develop dal koruması — 1 onay gerekli, Require review from Code Owners işaretsiz](images/pilot-verification/05-branch-protection-develop.png)

### Dal koruması — `main`
- [x] PR zorunlu
- [x] **2 onay** gerekli
- [x] Stale review dismiss açık
- [x] **Require review from Code Owners** işaretli → mentör onayı zorunlu
- [x] Force push ve dal silme kapalı

![main dal koruması — 2 onay gerekli, Require review from Code Owners işaretli](images/pilot-verification/06-branch-protection-main.png)

> İki ekran görüntüsünü yan yana koyun: aynı modülden üretilen iki kural, farklı
> katılıkta. `main` iki onay ve mentör onayı isterken `develop` tek onayla yetiniyor.
> Bu fark config'deki `defaults` bölümünde bilinçli olarak tanımlandı ve "onay kuralı
> projeden projeye ve daldan dala değişebilir" tasarımının kanıtı.

---

## 4. Bulunan ve Düzeltilen Hatalar

Pilotun asıl değeri burada. İki gerçek kusur yalnızca canlı bir repo oluşturulunca
ortaya çıktı; ikisi de modülde kalıcı olarak düzeltildi.

### 4.1 Label çakışması (422 already_exists)

**Belirti:** İlk apply'da 23 kaynak oluştu, `good first issue` ve `help wanted`
label'ları hata verdi.

**Kök sebep:** GitHub yeni bir repo açarken kendi varsayılan label'larını da
oluşturuyor. Tekil `github_issue_label` kaynağı her label için "oluştur" çağrısı
yaptığından bu isimlerle çakıştı.

**Çözüm:** Çoğul `github_issue_labels` kaynağına geçildi. Bu kaynak repo'nun label
setinin tamamını yönetiyor: mevcutları güncelliyor, eksikleri ekliyor, listede
olmayanları siliyor. Yan fayda: GitHub'ın varsayılan label'ları da temizleniyor.

Geçiş sırasında `removed { lifecycle { destroy = false } }` bloğu kullanıldı —
ilk apply'da oluşan 11 label state'ten çıkarıldı ama GitHub'dan silinmedi, çoğul
kaynak onları devraldı. Gereksiz bir sil-yarat turu yaşanmadı.

### 4.2 Kalıcı drift — push izni yerleşmiyordu

**Belirti:** Apply başarılı olmasına rağmen her `plan` aynı iki branch protection
için "değişecek" diyordu. `push_allowances` listesinden
`your-org/platform-admins` sürekli geri düşüyordu.

**Kök sebep:** GitHub, bir takımı dal push izin listesine ancak **o takımın repo'ya
erişimi varsa** kabul ediyor. Erişimi yoksa isteği **hata vermeden yok sayıyor**.
Modül `platform-admins` takımına hiçbir repo yetkisi vermiyordu.

**Çözüm:** Modüle `github_team_repository.org_admins` eklendi. `head-of-engineering`
rolü zaten [`ACCESS-MODEL.md`](../ACCESS-MODEL.md)'de `scope: organization` ve tüm
repo'larda `admin` olarak tanımlıydı; modül bunu uygulamıyordu. Eksik olan buydu.

**Öğrenilen:** GitHub bazı istekleri sessizce yok sayıyor. Terraform olmasaydı
"push kısıtı koydum" sanıp devam edilirdi. Drift tespiti bunu ortaya çıkardı —
beyan temelli yönetimin somut faydası.

---

## 5. Ek Tespit — Commit Kimliği

CODEOWNERS commit'i GitHub'da **`paitblack`** adına görünüyor
([02-codeowners.png](images/pilot-verification/02-codeowners.png) — commit satırındaki
avatar ve kullanıcı adı). Sebebi, HCP Terraform workspace'inde tanımlı
`TF_VAR_github_token` değişkeninin Emre'nin kişisel access token'ı olması.
Terraform'un yaptığı her yazma işlemi bir kişinin adına kaydediliyor.

Sonuçları:
- Otomasyonun yaptığı değişiklikler bir insanın yaptıklarından ayırt edilemiyor
- Token sahibi ekipten ayrılırsa tüm otomasyon durur
- Denetim izinde "bunu kim yaptı" sorusunun cevabı yanıltıcı

Bu, [`docs/notes/github-auth-strategy.md`](notes/github-auth-strategy.md) içinde
önerilen **GitHub App**'e geçişin gerekçesini güçlendiriyor. App ile yapılan
commit'ler `tidyorg-bot` gibi ayrı bir kimlikle görünür ve kişiye bağımlılık ortadan
kalkar.

---

## 6. Henüz Doğrulanmayanlar

- [ ] CI workflow tetiklenmesi — pilot repo'da henüz `.github/workflows/ci.yml` yok.
      Modül CODEOWNERS yazıyor ancak workflow dosyalarını dağıtmıyor.
- [ ] `ci/test` status check'inin raporlanması
- [ ] Onay olmadan merge'in engellendiğinin fiilen görülmesi
- [ ] `restrict_pushes` kuralının gerçekten uygulandığı (mevcut plan seviyesinde
      GitHub'ın bu kısıtı ne ölçüde uyguladığı test edilmedi)

---

## 7. Doğrulamayı Tekrarlamak

```powershell
terraform -chdir=terraform plan
```

Beklenen çıktı:

```
No changes. Your infrastructure matches the configuration.
```

Bundan farklı bir çıktı, ya birinin GitHub arayüzünden elle değişiklik yaptığını
ya da modülde yerleşmeyen bir ayar kaldığını gösterir. İkisi de incelenmelidir.
