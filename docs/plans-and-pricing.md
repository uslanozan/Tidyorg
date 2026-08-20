# GitHub Planları ve Fiyatlandırma — Bu Proje İçin Ne Anlama Geliyor

> **Durum:** 📄 Bilgi dokümanı · İlk yazım: 2026-08-20 (Ozan)
> **Kaynak:** [github.com/pricing](https://github.com/pricing) ve GitHub Docs — bağlantılar Bölüm 10'da.
> **Neden bu doküman var:** Bu repo'nun kod tabanında **plan kaynaklı kısıtlar var** —
> `organization.yml` içindeki `visibility: public` satırı teknik bir tercih değil, Free
> planın dayattığı bir uzlaşma. Hangi kısıtın hangi planla kalktığını bilmeden Faz 7
> kararı verilemez.

> ⚠️ **Bu bir fiyat listesi kopyası değil.** GitHub'ın özellik matrisi onlarca satır ve
> çoğu bizi ilgilendirmiyor (Codespaces, Copilot koltukları, Enterprise Server…).
> Aşağıdaki tablolar **bu projenin kodunda gerçekten karşılığı olan** özelliklere
> indirgenmiştir. "Bizi ilgilendirmiyor" dediğim her şey Bölüm 9'da ayrıca listelendi ki
> atlandığı sanılmasın.

---

## 1. Fiyatlar

| Plan | Fiyat | Faturalama |
| :--- | :--- | :--- |
| **Free** | $0 | — |
| **Team** | **$4 / kullanıcı / ay** | Aylık veya yıllık |
| **Enterprise (Cloud)** | **$21 / kullanıcı / ay**'dan başlıyor | Aylık veya yıllık |

> ⚠️ **Fiyat sayfasındaki yıldız işareti.** 2026-08-20 itibarıyla sayfa Team için
> *"$4 USD per user/month **for the first 12 months\***"*, Enterprise için
> *"Starting at $21 USD per user/month **for the first 12 months\***"* yazıyor.
> 13. aydaki yenileme fiyatını **doğrulayamadım** — ne fiyat sayfasının dipnotu ne de
> GitHub Docs bunu açıkça yazıyor. Satın alma öncesi checkout ekranında teyit edilmeli.
> Tarihsel referans: Team planı 2020'de $9'dan $4'e indirilmişti, yani $4 uzun süredir
> standart fiyat — ama bu bir çıkarım, kaynak değil.

### Güvenlik eklentileri (ayrı satın alınır)

| Ürün | Fiyat | Hangi planlarda alınabilir |
| :--- | :--- | :--- |
| **GitHub Secret Protection** | **$19 / ay / aktif committer** | **Team** ve Enterprise |
| **GitHub Code Security** | $30 / ay / aktif committer | **Team** ve Enterprise |

**Aktif committer**, son **90 gün** içinde bu özelliğin açık olduğu bir repo'ya en az bir
commit push etmiş kişidir. **Kişi başına tek lisans** — org genelinde sayılır, repo başına
değil. Kullandığın kadar öde (metered); önceden lisans satın alınmıyor, aşım durumu yok.
**Public repo'larda her şey ücretsiz**, ücret yalnızca private repo'lar için işliyor.

---

## 2. Bu projenin tek gerçek duvarı

Free planın bizi durduran **tek bir** kısıtı var. Diğer her şey yaşanabilir:

> **Free planda private repo'da ne branch protection ne de ruleset çalışıyor.**

GitHub Docs'un kelimeleriyle: korumalı dallar ve ruleset'ler *"GitHub Free ve GitHub Free
for organizations'ta **public** repo'larda; GitHub Pro, Team ve Enterprise Cloud'da
**public ve private** repo'larda"* kullanılabilir.

Bunun bu repo'daki sonucu tek satır:

```yaml
# terraform/config/organization.yml
defaults:
  visibility: public # FREE PLAN: private repo'da branch protection çalışmıyor
```

Yani bugün **izolasyon ile dal koruması aynı anda elde edilemiyor.** İkisinden birini
seçmek zorundayız ve dal korumasını seçtik. Bunun bedeli, Faz 6'da kurduğumuz
`default_repository_permission = "none"` ayarının dört repo'nun üçünde **hiçbir şey
yapmaması** — public repo'yu internetteki herkes zaten okuyor.

Bu, `docs/pilot-verification.md` Bölüm 9.1'deki düzeltmenin de sebebidir.

---

## 3. Özellik tablosu — bu projeyi ilgilendirenler

✅ var · ⚠️ yalnızca public repo'da · ❌ yok · 💰 ek ücretli eklenti

| Özellik | Kodda nerede | Free | Team | Enterprise |
| :--- | :--- | :---: | :---: | :---: |
| **Branch protection (private repo)** | `protected_branches` | ❌ | ✅ | ✅ |
| **Repository rulesets (private repo)** | *henüz kullanılmıyor* | ❌ | ✅ | ✅ |
| **Push rulesets (private/internal)** | *henüz kullanılmıyor* | ❌ | ✅ | ✅ |
| **Required reviewers (private repo)** | `required_reviews` | ❌ | ✅ | ✅ |
| **CODEOWNERS zorunlu inceleme (private)** | `code_owners` | ❌ | ✅ | ✅ |
| **Takımlar ve takım yetkileri** | `github_team` | ✅ | ✅ | ✅ |
| **Base permission (`none`)** | `org-settings.tf` | ✅ | ✅ | ✅ |
| **Repo oluşturma kısıtı** | `members_can_create_*` | ✅ | ✅ | ✅ |
| **Dependabot alerts + updates** | `vulnerability_alerts` | ✅ | ✅ | ✅ |
| **Secret scanning + push protection** | `secret_scanning` | ⚠️ | ⚠️ 💰 | ⚠️ 💰 |
| **Actions dakikaları (private repo)** | CI workflow'ları | 2.000/ay | 3.000/ay | 50.000/ay |
| **Packages / artifact deposu** | — | 500 MB | 2 GB | 50 GB |
| **Environment protection rules (private)** | *Faz 8 adayı* | ❌ | ❌ | ✅ |
| **Zamanlanmış inceleme hatırlatıcıları** | — | ❌ | ✅ | ✅ |
| **Security overview (org geneli)** | — | ❌ | ✅ | ✅ |
| **SAML SSO / SCIM** | — | ❌ | ❌ | ✅ |
| **Audit log API / streaming** | *Faz 8 adayı* | ❌ | ❌ | ✅ |
| **IP allow list** | — | ❌ | ❌ | ✅ |
| **Destek** | — | Topluluk | E-posta | Enterprise + SLA |

### Tablodaki iki satır özel dikkat istiyor

**`secret_scanning` üç planda da ⚠️.** Public repo'da her planda ücretsiz. Private
repo'da **hiçbir planın kendisiyle gelmiyor** — Enterprise'da bile. Secret Protection
eklentisi ayrıca satın alınır. Yani "Enterprise'a geçersek secret scanning gelir"
**yanlıştır**; gelen şey eklentiyi satın alma hakkı değil, zaten Team'de de var olan
o hak.

**`environment protection rules` Team'de de ❌.** Deployment onayı / bekleme süresi
kurmak private repo'da **yalnızca Enterprise**'da mümkün. Faz 8'de deployment kapısı
düşünülüyorsa bu tek başına Enterprise gerekçesi olabilir — ya da o kapı Actions
seviyesinde kurulur.

---

## 4. ⚠️ ROADMAP Faz 7 düzeltmesi — Secret Protection artık Team'de alınabiliyor

[`ROADMAP.md`](../ROADMAP.md) Faz 7 bölümünde ve `organization.yml` içindeki yorumda
şu yazıyor:

> *"Yalnızca PUBLIC repo'da ücretsiz; private repo GitHub Advanced Security
> (**Enterprise**) ister."*

**Bu artık doğru değil.** GitHub, 2025-03-04'te Advanced Security'yi ikiye böldü
(Secret Protection / Code Security) ve **2025-04-01'den itibaren Team planındaki
organizasyonların bunları satın almasını açtı.** Kaynak: [GitHub Changelog,
2025-04-01](https://github.blog/changelog/2025-04-01-github-advanced-security-is-here-for-github-team-organizations/).

Faz 7'nin ödün tablosu bu yüzden değişiyor. Eski tablo "private'a geçersek push
protection'ı kaybederiz, geri almanın yolu Enterprise" diyordu. Doğrusu:

| | Bugün (Free + public) | Team + private | Team + private + Secret Protection |
| :--- | :---: | :---: | :---: |
| Dünyaya kapalı | ❌ | ✅ | ✅ |
| `none` izolasyonu anlamlı | ❌ | ✅ | ✅ |
| Branch protection | ✅ | ✅ | ✅ |
| Secret scanning | ✅ | ❌ | ✅ |
| **Push protection** | ✅ | ❌ | ✅ |
| Dependabot | ✅ | ✅ | ✅ |
| Aylık maliyet (3 kişi) | $0 | **$12** | **$12 + committer başına $19** |

**Kaybedilen şeyin adı push protection'dır** ve önemi şurada: sızdırılmış bir anahtarın
repo'ya **girmesini** engelleyen tek mekanizma odur. Secret scanning dahil diğer her şey
sızıntıyı *sonradan* haber verir. Ortadaki sütun — Team'e geçip eklentiyi almamak — bu
korumayı sessizce düşürür.

---

## 5. Maliyet hesabı

**Bugünkü ekip:** 3 kişi (`uslanozan`, `paitblack`, `medine2906` — bkz.
[`terraform/config/people.yml`](../terraform/config/people.yml)).

| Senaryo | Hesap | Aylık |
| :--- | :--- | ---: |
| Free (bugün) | — | **$0** |
| Team, 3 kullanıcı | 3 × $4 | **$12** |
| Team + Secret Protection, 3 aktif committer | $12 + 3 × $19 | **$69** |
| Team + Secret Protection, 1 aktif committer | $12 + 1 × $19 | **$31** |
| Enterprise, 3 kullanıcı | 3 × $21 | **$63** |

İki not:

- **Aktif committer ≠ kullanıcı.** Son 90 günde private repo'ya push etmemiş biri
  Secret Protection lisansı tüketmez. Bugün fiilen tek kişi push ediyor, yani ilk aylarda
  gerçek fatura $31'e yakın olabilir. Ama bu ekip büyüdükçe **doğrusal artan** kalemdir;
  Team koltuk ücretinden 4,75 kat pahalı olduğu unutulmamalı.
- **Bot committer sayılır mı?** `tidyorg-infra-bot` GitHub App'i repo'lara dosya yazıyor
  (`strict` şablonlar). App'in bot kullanıcısının aktif committer sayılıp sayılmadığını
  **doğrulamadım.** Sayılıyorsa fatura beklenenden bir lisans fazla gelir. Satın alma
  öncesi netleştirilmeli.

---

## 6. Gizli maliyet: public'ten private'a geçince Actions sayacı başlıyor

Bu, plan tablolarında görünmeyen ama Faz 7'de doğrudan bizi vuracak kalem.

> GitHub Docs: *"GitHub Actions usage is **free** for self-hosted runners and for
> **public repositories** that use standard GitHub-hosted runners."*
> Ücretsiz dakika kotası (2.000 / 3.000 / 50.000) **yalnızca private repo'lar için**
> geçerlidir.

Yani bugün `terraform-plan`, `terraform-apply` ve dağıtılan `ci` workflow'ları **bedava**
çalışıyor — çünkü dört repo'nun üçü public. Private'a geçtiğimiz gün bu işler **3.000
dakika/ay** kotasından yemeye başlar.

Ölçek olarak: 3 kişilik bir ekip için 3.000 dakika bol. Her PR'da ~3 dakikalık bir plan
job'ı varsayarsak ayda ~1.000 PR'a kadar sorun yok. **Bugün bağlayıcı bir kısıt değil**,
ama iki şey bunu hızla değiştirir: matrix build'ler ve `windows`/`macos` runner'ları
(dakikaları sırasıyla **2×** ve **10×** katsayıyla düşer). Sadece `ubuntu-latest`
kullandığımız sürece rahatız.

Aynı kota **artifact ve Packages depolamasıyla paylaşılıyor** — Team'de toplam 2 GB.

---

## 7. Faz 5'i ilgilendiren ayrı bir tuzak: private repo + GitHub Pages

Dashboard (Faz 5) GitHub Pages üzerinde yayınlanacaksa:

- **Free:** Pages yalnızca public repo'da.
- **Team:** Private repo'dan Pages **yayınlanabilir**, ama **yayınlanan site public
  olur.** Yani repo'yu kapatmak siteyi kapatmaz.
- **Enterprise Cloud:** Erişimi org üyeleriyle sınırlı **private Pages** sitesi mümkün.

Dashboard org yetki dağılımını gösteriyorsa — ki gösterecek — Team planında private
repo'ya taşımak **veriyi gizlemez.** Bu, Faz 5 tasarımında barındırma kararının plan
kararından önce verilmemesi gerektiği anlamına geliyor.

---

## 8. Plan değişirse kodda ne değişir

### Free → Team

| Dosya | Değişiklik |
| :--- | :--- |
| `terraform/config/organization.yml` | `defaults.visibility: public` → `private` **(tek satır)** ve yanındaki gerekçe yorumu |
| `terraform/config/repositories/pilot-access-test.yml` | `protected_branches: null` kaldırılabilir; artık private repo da korunabiliyor |
| `terraform/modules/repository/main.tf` | `secret_scanning` koşulundaki `var.visibility == "public"` — **Secret Protection alınmazsa aynen kalmalı**, alınırsa gevşetilir |
| Yorumlar | "FREE PLAN:" ile başlayan gerekçeler geçersizleşir |

**Motor kodu değişmiyor.** `visibility` zaten config'den geliyor ve modül private'ı
destekliyor — `pilot-access-test` bugün private ve modülden doğdu. Mekanizma test edilmiş
durumda.

### Team + Secret Protection satın alınırsa

`modules/repository/main.tf` içindeki görünürlük kapısı gevşetilir ve
`security_and_analysis` bloğuna `advanced_security { status = "enabled" }` girer.
Bugün `advanced_security` **bilerek yönetilmiyor** — public'te örtük açık, private'ta
lisans istiyor; ikisini birden yönetmeye çalışmak hata üretiyordu. Lisans alındığında
bu gerekçe düşer ve alan yönetime girmelidir, yoksa özellik satın alınıp
**açılmamış** olur.

### Team → Enterprise

Kodda **hiçbir zorunlu değişiklik yok.** Enterprise'ın getirdiklerinin çoğunun Terraform
karşılığı org dışında (SAML, SCIM, IP allow list, audit log streaming — bunlar enterprise
hesap seviyesinde). Yeni **fırsat** doğar: private repo'da environment protection rules
(`github_repository_environment` + reviewers), ki bu Faz 8'in deployment kapısı için
gerekli olan tek plan-kilitli parçadır.

---

## 9. Bilerek atlananlar

Aşağıdakiler plan farkı yaratıyor ama bu projeyi bugün ilgilendirmiyor. Atlandığı
sanılmasın diye yazıldı:

- **GitHub Copilot** — ayrı ürün, ayrı koltuk ücreti. Org altyapısıyla ilgisi yok.
- **Codespaces çekirdek saatleri** (Free 120 h/ay) — kullanmıyoruz.
- **GitHub Enterprise Server** — self-hosted kurulum. Gündemde değil.
- **Code Security ($30)** — CodeQL, Copilot Autofix, security campaigns. Secret
  Protection'dan bağımsız satın alınabiliyor. Bugün CodeQL kurmadığımız için
  gerekçesi yok; kurulursa yeniden değerlendirilir.
- **Enterprise Managed Users, sub-organizations, 99,9% SLA, bölgesel veri barındırma** —
  uyumluluk gereksinimi doğmadan anlamsız.
- **Wiki'ler** — `defaults.has_wiki: false`, bilinçli kapalı.

---

## 10. Öneri

**Bugün için: Free planda kal.**

Free planın tek gerçek bedeli, repo'ların public olması ve dolayısıyla Faz 6'da kurulan
`none` izolasyonunun üç repo'da etkisiz kalması. Bu **pilot bir kurulum için kabul
edilebilir** — pilot repo'larda gizli bir şey yok ve dal koruması, CODEOWNERS, Dependabot,
push protection dahil güvenlik yüzeyinin tamamı zaten çalışıyor. Public olmak bu projede
şu an **korumaları açıyor**, kapatmıyor.

**Team'e geçiş tetikleyicisi net olmalı:** ilk gerçek (pilot olmayan) kod repo'su
açıldığında. O an geldiğinde geçiş **$12/ay** ve **tek satır kod.**

**Secret Protection kararı Team'den ayrı verilmeli ve ertelenmemeli.** Private'a geçip
eklentiyi almamak, bugün sahip olduğumuz push protection'ı sessizce düşürür — projenin
tekrar tekrar karşılaştığı hata kalıbı tam olarak budur: bir korumanın kaybolduğunu
kimsenin fark etmemesi. Alınmayacaksa yerine ne konacağı (pre-commit hook, CI adımı)
**aynı PR'da** kararlaştırılmalı.

**Enterprise bugün gerekçesiz.** Tek somut kancası private repo'da environment
protection rules. Faz 8 deployment kapısını gerçekten şart koşarsa yeniden bakılır;
o zamana kadar 3 kişilik bir ekip için $63/ay'ın karşılığı yok.

---

## 11. Kaynaklar

- [GitHub Pricing](https://github.com/pricing) — plan fiyatları
- [GitHub's plans — GitHub Docs](https://docs.github.com/en/get-started/learning-about-github/githubs-plans) — plan bazlı özellik listesi
- [About protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches) — hangi planda hangi görünürlükte çalıştığı
- [About rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets) — ruleset plan kısıtları
- [Introducing GitHub Secret Protection and GitHub Code Security](https://github.blog/changelog/2025-03-04-introducing-github-secret-protection-and-github-code-security/) — GHAS'ın ikiye bölünmesi
- [GitHub Advanced Security is here for GitHub Team organizations](https://github.blog/changelog/2025-04-01-github-advanced-security-is-here-for-github-team-organizations/) — Team planında satın alınabilirlik
- [GitHub Advanced Security license billing](https://docs.github.com/en/billing/concepts/product-billing/github-advanced-security) — aktif committer tanımı
- [Billing for GitHub Actions](https://docs.github.com/en/billing/concepts/product-billing/github-actions) — public repo'da ücretsiz dakikalar
- [Pricing Calculator](https://github.com/pricing/calculator) — koltuk sayısına göre hesap

---

## İlgili dokümanlar

- [`../ROADMAP.md`](../ROADMAP.md) — Faz 7 (görünürlük geçişi)
- [`security-policy.md`](security-policy.md) — yürürlükteki güvenlik kontrolleri
- [`rbac-and-permissions.md`](rbac-and-permissions.md) — yetki modeli
- [`pilot-verification.md`](pilot-verification.md) — Bölüm 9, izolasyon testi ve düzeltmesi
