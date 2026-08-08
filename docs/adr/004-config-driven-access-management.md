# ADR-004: Erişim Yönetimi için Config-Driven Terraform

**Durum:** Kabul edildi
**Tarih:** 2026-08-08
**Karar verenler:** Ozan, Emre
**İlgili:** [`ACCESS-MODEL.md`](../../ACCESS-MODEL.md), [`config-guide.md`](../config-guide.md)

---

## Bağlam

Organizasyonda birden çok repo ve bu repo'larda rol bazlı yetkilere sahip kişiler var.
Hedeflenen model:

- **head-of-engineering** — organizasyon geneli admin (kişi değil, rol)
- **mentor** — sorumlu olduğu repo'da admin; kural değiştirebilir
- **developer** — birden çok projede yer alabilir (many-to-many); korumalı dallara
  doğrudan yazamaz

Nihai hedef, bu yetkilerin teknik olmayan kullanıcılar tarafından bir **dashboard**
üzerinden yönetilebilmesi. Yetki değişikliği sık yaşanan bir olay: kişi projeye katılır,
ayrılır, mentör değişir, yeni repo açılır.

Sorulması gereken soru: bu yönetim katmanı nasıl kurulmalı?

---

## Değerlendirilen Seçenekler

### 1. GitHub API'sini doğrudan çağıran bir uygulama

Dashboard, GitHub REST API'sini doğrudan çağırır. "Kullanıcıyı takımdan çıkar" tek bir
HTTP isteğidir.

**Artıları:** Anında etki, aracı yok, öğrenme eğrisi düşük.

**Eksileri:**
- Tek doğruluk kaynağı yok — GitHub'ın o anki hâli tek gerçek olur
- "Kim ne zaman hangi yetkiyi verdi" sorusunun cevabı kalmaz
- Drift kavramı yok; biri arayüzden bir şey değiştirirse fark edilmez
- Organizasyon sıfırdan yeniden kurulamaz
- Idempotency, sıralama, hata toparlama, sayfalama, rate limit — hepsi elle yazılır
- Dashboard'un `admin:org` kapsamında bir token taşıması gerekir; internete açık bir
  uygulamada bu yüksek risk

### 2. `github/safe-settings`

GitHub'ın yayınladığı açık kaynak uygulama. Bir yönetici repo'sunda YAML config tutulur;
uygulama org'daki repo'lara ayarları uygular. Hiyerarşik öncelik (repo > sub-org > org)
bizim `defaults` + ezme tasarımımızla neredeyse birebir örtüşüyor.

**Artıları:** Olgun, GitHub'ın kendi projesi, kurulumu hazır, aynı problemi çözüyor.

**Eksileri:**
- **Yalnızca GitHub'ı yönetir.** İleride başka sistemler (Cloudflare, AWS IAM,
  PagerDuty) eklenirse ikinci bir mekanizma gerekir
- Config'de GitHub'ın primitifleri konuşulur (`collaborators`, `permission: admin`);
  bizim rol soyutlamamız (`mentor`, `developer`) ifade edilemez
- Kendi barındırması gerekir — "hazır ürün" değil, işletilecek bir uygulama

### 3. GitHub'ın yerleşik özellikleri (org ruleset + custom properties)

Repo'lara metadata etiketi takılır, org seviyesinde ruleset'ler bu etiketlere göre
hedeflenir. Kod yazmadan "tier=critical olan tüm repo'larda min 3 onay" kurulabilir.

**Artıları:** Kod yok, bakım yok, GitHub'ın kendi modeliyle tam uyumlu, katmanlanabilir.

**Eksileri:**
- Yalnızca **kuralları** yönetir; repo oluşturma, takım üyeliği, label seti kapsam dışı
- Rol soyutlaması yok
- Denetim izi GitHub'ın audit log'una bağlı, sürüm kontrollü değil
- Çoğu özellik Team/Enterprise planı gerektiriyor

### 4. Internal Developer Portal (Backstage, Port, Cortex)

Hazır portal ürünleri; self-service ile repo oluşturma akışları sunuyorlar.

**Eksileri:**
- Backstage bir ürün değil iskelettir: kendi kod tabanın olur, barındırma, katalog
  besleme, eklenti bakımı, sürüm yükseltmeleri. 50 geliştiricinin altındaki ekipler için
  önerilmiyor — bizim ölçeğimiz çok altında
- Ticari alternatifler (Port, OpsLevel) ölçeğimiz için gereğinden kapsamlı ve maliyetli
- Hiçbiri bizim mentör/developer modelimizi kutudan çıktığı gibi bilmiyor

---

## Karar

**Terraform (`integrations/github` provider) kullanılacak, konfigürasyon YAML dosyasından
okunacak.**

Sistem iki katmana ayrılır:

| Katman | İçerik | Kim değiştirir | Sıklık |
| :--- | :--- | :--- | :--- |
| **Kod (HCL)** | "Repo nasıl kurulur, kural nasıl uygulanır" | Platform ekibi | Nadiren |
| **Veri (YAML)** | "Hangi repo var, kimde hangi yetki var" | Mentör (ileride dashboard) | Sık |

Dashboard, Terraform kodunu **değiştirmez**; yalnızca config dosyasını günceller ve PR
açar. Terraform'un varlığından habersiz olabilir.

Modül, kendi domain modelimizi (`mentor`, `developer`, `head-of-engineering`) GitHub'ın
primitiflerine (`admin`, `push`, takım üyeliği, branch protection) **derler**.

---

## Gerekçe

**Tek doğruluk kaynağı.** Organizasyonun tamamı tek bir dosyada okunabilir. "Kimin neye
erişimi var" sorusunun cevabı GitHub arayüzünde gezinmek değil, bir dosyayı açmaktır.

**Drift düzeltme.** Biri arayüzden bir ayarı değiştirirse bir sonraki `apply` geri alır.
Bu özelliğin değeri pilotta somut olarak görüldü: `platform-admins` takımının push izni
GitHub tarafından **hata vermeden yok sayılıyordu** ve yalnızca drift tespiti sayesinde
fark edildi. Doğrudan API kullanan bir sistemde bu hata sessizce yaşamaya devam ederdi.

**Denetim izi.** Her yetki değişikliği bir commit, bir PR, bir `plan` çıktısı bırakır.
Git geçmişi "kim ne zaman hangi yetkiyi verdi" sorusunun cevabıdır.

**Rol soyutlaması.** Mentörün ne yapabildiği tek yerde tanımlıdır. Yetkiyi değiştirmek
için 8 repo'daki 8 satır değil, bir rol tanımı düzenlenir. Kişi değiştiğinde kural metni
hiç değişmez. Hazır araçların hiçbiri bu soyutlamayı sunmuyor.

**Blast radius.** Dashboard'un `admin:org` token'ı taşıması gerekmez; yalnızca config
dosyasına yazma yetkisi yeterlidir. Organizasyonu yönetebilen kimlik CI/HCP tarafında,
internete kapalı bir yerde durur.

**Genişleyebilirlik.** Provider'ı olan her sistem aynı akışa dahil edilebilir.
safe-settings ve org ruleset'leri mimari gereği GitHub'la sınırlı.

---

## Sonuçlar

### Olumlu

- Organizasyon konfigürasyondan sıfırdan yeniden kurulabilir
- Yetki değişiklikleri gözden geçirilebilir ve geri alınabilir
- Yeni repo açmak beş satırlık bir config değişikliği
- Güvenli varsayılanlar otomatik uygulanır; repo açan kişinin branch protection bilmesi
  gerekmez

### Olumsuz / kabul edilen tavizler

- **Gecikme.** Değişiklik anında yansımaz; `plan` + `apply` döngüsü gerekir. Acil erişim
  kesme senaryosu için ayrı bir hızlı yol düşünülmelidir.
- **Öğrenme yükü.** Ekibin Terraform'un temel kavramlarını (state, plan, apply, drift)
  bilmesi gerekir.
- **Yüksek frekanslı değişiklikler Terraform'un tasarım hedefi değil.** Her `apply` tüm
  kaynakları tazeler; organizasyon büyüdükçe bu yavaşlar. Eşik aşılırsa üyelik yönetimi
  ayrı bir mekanizmaya taşınabilir.
- **Tek state, tek kader.** Bir yerdeki bozuk config tüm `apply`'ı durdurur.
- **Dashboard yazılmalı.** Hazır bir arayüz alınmıyor; ince de olsa bir uygulama
  geliştirilecek.

### Yeniden değerlendirme koşulları

Bu karar şu durumlarda gözden geçirilmelidir:

- Repo sayısı ~100'ü aştığında (plan süreleri ve state boyutu)
- Yetki değişiklik sıklığı günde onlarca kez seviyesine çıktığında
- GitHub'ın yerleşik özellikleri (custom properties + org ruleset) ihtiyacın tamamını
  karşılar hâle geldiğinde
- Şirket bir IGA ürünü (Okta Governance, ConductorOne vb.) benimserse — o zaman erişim
  yönetimi Terraform'dan o ürüne taşınabilir

---

## Notlar

**Bu karar GitHub'ın ötesini kapsamaz.** Terraform yalnızca provider'ı olan sistemleri
yönetir. Linear, Slack gibi sistemlerdeki erişimler bu akışın dışındadır; offboarding
gibi çok sistemli senaryolarda orkestrasyon dashboard'un sorumluluğundadır. Bkz.
[`runbook.md`](../runbook.md).

**Klasik branch protection geçicidir.** Kurallar şu an `github_branch_protection` ile
yazılıyor. Provider'da `github_repository_ruleset` ve `github_organization_ruleset`
mevcut; katmanlanabilir kurallar ve `bypass_actors` desteği modelimize daha uygun.
Ruleset'e geçiş ayrı bir ADR ile kararlaştırılmalıdır.
