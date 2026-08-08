# Yol Haritası — Hedef Mimariye Geçiş

> **Bu doküman güncel plandır.** [`implementation plan.md`](implementation%20plan.md) projenin
> başlangıcında yazıldı ve tarihsel kayıt olarak duruyor; oradaki takım hiyerarşisi ve
> yetki matrisi artık geçerli değil.
>
> Modelin gerekçeleri: [`ACCESS-MODEL.md`](ACCESS-MODEL.md)
> Kısa vadeli engeller: [`TODO.md`](TODO.md)

Son güncelleme: 2026-08-08

---

## 1. Nerede Duruyoruz

**Bitti (4 haftalık planın ilk 3 haftası):**

| Alan | Durum |
| :--- | :--- |
| Terraform iskeleti, HCP backend, ortak state | ✅ Canlı |
| 10 org takımı + üyelikler | ✅ Canlı _(model uyumu tartışmalı — Faz 6)_ |
| `pilot-intern-api` + branch protection | ✅ Canlı _(modül dışında — Faz 0)_ |
| Repository modülü (config-driven) | ✅ Canlı, uçtan uca doğrulandı |
| `pilot-intern-web` — config'den üretilen ilk repo | ✅ 25 kaynak, GitHub'dan doğrulandı |
| Issue/PR template'leri, CONTRIBUTING, SECURITY, `.editorconfig` | ✅ Yazıldı — ⚠️ **dağıtılmıyor** |
| `ci.yml`, `release.yml`, `dependabot.yml` | ✅ Yazıldı — ⚠️ **dağıtılmıyor** |
| 11 doküman + 1 ADR | ✅ Yazıldı |

**Çalışmıyor / eksik:**

1. `templates/` klasörünün tamamı atıl — hiçbir repo'ya ulaşmıyor
2. `people` bölümü Terraform tarafından okunmuyor — org üyeliği elle yönetiliyor
3. GitOps döngüsü yok — `apply` elle çalıştırılıyor
4. Dashboard yok
5. Repo güvenlik ayarları yönetilmiyor
6. Config tek dosyada — 40 repo'ya ölçeklenmez

---

## 2. Yeni Kararlar (2026-08-08)

### Karar A — Org geneli `.github` repo'su **kullanılmayacak**
Public olması gerekiyordu; içindeki dosyalar internete açılacaktı. Kabul edilmedi.

**Sonuç:** Şablonlar her repo'ya ayrı ayrı yazılacak (`github_repository_file`, CODEOWNERS
için kullanılan mekanizmanın aynısı). Private repo'larda çalışır, dosyalar dışarı açılmaz.

**Bedeli:** Bir şablonu güncellemek N repo'da N commit üretir. 40 repo'da PR template
değişikliği = 40 commit. Kabul edilebilir ama bilinçli olmalı.

### Karar B — Dashboard bu projenin kapsamında
Ayrı bir faz olarak planlanacak. Ön koşulları: config'in repo başına bölünmesi (Faz 1)
ve GitHub App (Faz 4).

### Karar C — Config repo başına dosyaya bölünecek
Tek `organization.yml` 40 repo'ya ölçeklenmez. Dashboard'un eşzamanlı yazması, PR
diff'lerinin okunabilirliği ve CODEOWNERS ile mentör bazlı review yönlendirmesi bunu
gerektiriyor.

### Karar D — Team planı beklenmeyecek
Ne zaman alınacağı belirsiz. Plan, Team planı olmadan da ilerleyecek biçimde sıralandı;
plana bağımlı işler Faz 7'de toplandı.

---

## 3. Fazlar

Her faz bağımsız olarak tamamlanabilir ve kendi başına değer üretir.

---

### Faz 0 — Temizlik ve tutarlılık _(büyük ölçüde tamamlandı)_

- [x] **`branch-protection.tf`'de `enforce_admins` → `false`** ✅ apply edildi
- [x] **Kök `outputs.tf`'i doldur** ✅ repo adresleri, takım slug'ları, repo sayısı
- [x] **Ozan'ı `platform-admins`'e ekle** ✅ apply edildi
- [x] **9 eski takımı sil** ✅ apply edildi — `core-engineering`, `backend-team`,
      `frontend-team`, `devops-team`, `tech-leads`, `interns-2026`, `interns-backend`,
      `interns-frontend`, `external-collaborators` ve bağlı 3 üyelik kaldırıldı.
      `plan` sonrası **No changes** ile doğrulandı.
- [ ] **`pilot-intern-api`'yi modüle taşı**
      `terraform state mv` ile — silme/yeniden yaratma olmadan. State'e dokunan tek
      işlem; komutlar önce gözden geçirilecek.
- [ ] **Bekleyen üç branch'i merge et**
      `feat/repository-module`, `docs/engineering-standards-fixes`,
      `feat/branch-protection-fixes`

**Çıktı:** Tek bir yönetim biçimi, çelişkisiz kural seti.

---

### Faz 1 — Config yapısını böl _(küçük)_

```
terraform/config/
├── organization.yml              # roller, defaults, people, org ayarları
└── repositories/
    ├── pilot-intern-web.yml
    ├── pilot-intern-api.yml
    └── ...
```

Dosya adı = repo adı. Benzersizlik doğal olarak garanti edilir.

```hcl
locals {
  org = yamldecode(file("${path.module}/config/organization.yml"))

  repos = {
    for f in fileset("${path.module}/config/repositories", "*.yml") :
    trimsuffix(f, ".yml") => yamldecode(file("${path.module}/config/repositories/${f}"))
  }
}
```

- [ ] Dizin yapısını kur, mevcut repo'ları ayrı dosyalara taşı
- [ ] `repositories.tf`'i `fileset()` ile besle
- [ ] Bu repo'nun `.github/CODEOWNERS`'ına kural ekle:
      `terraform/config/repositories/*` → ilgili mentör onayı;
      `terraform/config/organization.yml` → head-of-engineering onayı
- [ ] `plan` çıktısının değişmediğini doğrula _(refactor, davranış değişmemeli)_

**Neden şimdi:** Dashboard'un ön koşulu. İki mentör aynı anda düzenlerse tek dosyada
çakışırlar; ayrı dosyalarda çakışmazlar.

---

### Faz 2 — Şablon ve workflow dağıtımı _(orta)_

Config'e `files` ve `workflows` alanları eklenir; modül bunları repo'ya yazar.

```yaml
# defaults
files:
  contributing: seed        # strict | seed | none
  security: strict
  editorconfig: strict
  issue_templates: strict
  pr_template: strict

workflows: [ci]             # ci | release | dependabot
```

**İki senkronizasyon modu — bu bir karar noktası (bkz. Bölüm 5):**

| Mod | Davranış | Uygun olduğu dosyalar |
| :--- | :--- | :--- |
| `strict` | Terraform içeriği sahiplenir; elle yapılan değişiklik bir sonraki `apply`'da geri alınır | Yönetişim dosyaları: CODEOWNERS, workflow'lar, issue/PR template |
| `seed` | Yalnızca ilk oluşturmada yazılır (`lifecycle { ignore_changes = [content] }`); repo sonradan kendine göre değiştirebilir | İçerik dosyaları: README, CONTRIBUTING |

- [ ] `files` ve `workflows` alanlarını şemaya ekle
- [ ] Modülde `github_repository_file` ile dağıtımı kur
- [ ] `strict` / `seed` ayrımını uygula
- [ ] **Tutarlılık doğrulaması:** `workflows` içinde `ci` yoksa
      `require_status_checks` da boş olmalı — aksi halde PR'lar hiç raporlanmayacak bir
      check'i sonsuza kadar bekler. Modül bunu `precondition` ile hata olarak vermeli.
- [ ] Pilot repo'da doğrula: PR template görünüyor mu, `ci/test` raporlanıyor mu

**Çıktı:** `docs/onboarding.md`'deki "PR şablonu otomatik dolar" iddiası gerçek olur.

---

### Faz 3 — GitOps döngüsü _(orta)_

Dokümanların anlattığı akış şu an elle çalışıyor. Otomatikleştirilmeli.

- [ ] `.github/workflows/terraform-plan.yml` — PR tetikli
      `fmt -check` → `validate` → `plan` → çıktıyı PR yorumu olarak yaz
- [ ] `.github/workflows/terraform-apply.yml` — `main` merge tetikli
- [ ] `TF_API_TOKEN` secret'ı (HCP team token)
- [ ] Bu repo'nun kendi branch protection'ını config'den yönet (dogfooding)

**Neden önemli:** Dashboard'un PR açması ancak bu döngü varsa anlamlı. Şu anda dashboard
PR açsa bile kimse `plan`'ı görmez.

---

### Faz 4 — GitHub App _(orta)_

Terraform'un ve dashboard'un kimliği kişisel token olmaktan çıkar.

- [ ] Org'da GitHub App oluştur (`tidyorg-infra-bot`)
- [ ] İzinler: `administration: write`, `contents: write`, `members: write`,
      `metadata: read` — org kapsamında kurulum
- [ ] Private key'i HCP ve GitHub Secrets'a koy
- [ ] Terraform provider'ı App kimliğine geçir

> **Dashboard için ayrı App gerekmiyor.** Karar 15 ile dashboard kullanıcının kendi
> kimliğiyle çalışacak; kendi token'ı olmayacak. Bu App yalnızca Terraform içindir.

**Neden:** Şu an tüm otomasyon Emre'nin kişisel token'ına bağlı ve commit'ler onun adına
görünüyor. Kişi ayrılırsa sistem durur.

Gerekçe ve detay: [`docs/notes/github-auth-strategy.md`](docs/notes/github-auth-strategy.md)

---

### Faz 5 — Dashboard _(büyük)_

**Ne yapar:** Mentör ve head-of-engineering'in config dosyalarını YAML yazmadan
düzenlemesini sağlar.

**Mimari — dashboard'un kendi token'ı yok** (bkz. `ACCESS-MODEL.md`, Karar 15):

```
Kullanıcı
   ↓ GitHub Device Flow ile giriş (client_secret gerekmez)
   ↓ kullanıcının kendi token'ı
Dashboard (statik SPA)
   ├── Okuma:  config YAML dosyaları — kullanıcının token'ıyla
   ├── Yazma:  Contents API → branch + PR — kullanıcının token'ıyla
   └── Önizleme: PR'daki plan yorumunu oku
   ↓
GitHub  →  GitOps workflow'u (Faz 3) plan'ı PR'a yorum olarak yazar
   ↓
Merge  →  apply
```

Yetkilendirmeyi **GitHub yapar**: kullanıcının config repo'suna yazma yetkisi yoksa istek
reddedilir; "mentör yalnızca kendi repo'sunu düzenler" kuralını CODEOWNERS merge anında
zorlar. Denetim izi gerçektir — commit'ler bot adına değil, işlemi yapan kişinin adına
düşer.

**Alt adımlar:**

- [ ] **5a. Okuma modu** — config'i okuyup gösteren salt-okunur arayüz.
      Değer üretir (kim nerede çalışıyor görünür) ve risk taşımaz.
- [ ] **5b. Yazma — PR akışı** — değişikliği branch'e yazıp PR açar. Merge insan işi.
- [ ] **5c. Plan görünümü** — PR'a düşen `plan` yorumunu dashboard'da göster.
      _HCP API entegrasyonu gerekmez; Faz 3 bunu zaten üretiyor._
- [ ] **5d. Hızlı yol** — düşük riskli işlemler için PR'sız akış _(değerlendirilecek;
      yükseltilmiş yetki gerektirdiği için küçük bir servis gerekebilir)_

**Teknik notlar:**
- YAML doğrudan yazılır; JSON'a dönüştürme yok. JSON Schema yalnızca kaydetmeden önce
  doğrulama için _(Karar 16)_
- `config/repositories/*.yml` makine sahipli — yorum satırı konmaz, serbestçe yeniden
  üretilebilir. `organization.yml` insan sahipli, dashboard dokunmaz.
- Yazarken dosyanın `sha` değeri gönderilmeli; 409 dönerse okuyup tekrar dene
  (kayıp güncelleme koruması)
- Barındırma: Vercel/Netlify. Bu repo private olacağı için GitHub Pages çalışmaz.
- Gerekirse küçük bir backend eklenebilir — Emre ile kararlaştırılacak

**Bağımlılıklar:** Faz 1 (config bölünmesi), Faz 3 (GitOps — plan yorumu buradan geliyor)

---

### Faz 6 — Org üyeliği, güvenlik ve eski yapının temizliği _(orta)_

- [ ] **`people` → `github_membership`**
      Org üyeliği config'den yönetilsin. ⚠️ Riskli: mevcut owner yetkilerini
      etkileyebilir. Önce `plan` ile dikkatle incelenmeli, gerekirse `import` ile mevcut
      üyelikler state'e alınmalı.
- [ ] **Repo güvenlik ayarları** — `vulnerability_alerts = true`, uygun olduğunda
      `security_and_analysis` blokları
- [ ] **Eski 10 takımın akıbeti** — `backend-team`, `interns-2026` vb. rol tabanlı
      modelde karşılığı yok. Silinecek mi, kimlik/gruplama amaçlı kalacak mı?
      (bkz. Bölüm 5)
- [ ] **Repo isimlendirme standardı** — `implementation plan.md`'deki `svc-`, `web-`,
      `lib-` öneki uygulanacaksa config şemasında `validation` ile zorlanabilir

---

### Faz 7 — Team planı geldiğinde _(engelli)_

Bu işler GitHub Team planı olmadan **yapılamaz**, denenemez.

- [ ] Private repo'larda branch protection'ın çalıştığını doğrula
- [ ] Yeni repo'ların varsayılanını `private` yap
- [ ] `pilot-intern-web` ve `pilot-intern-api`'yi private'a çevir
- [ ] Engellenme testlerini gerçek koşullarda tekrarla
- [ ] Ruleset'e geçişi değerlendir (`github_repository_ruleset` +
      `github_organization_ruleset`) ve ADR yaz

> **Bu arada:** `docs/pilot-verification.md`'deki doğrulamalar public repo üzerinde
> yapıldı. Team planı gelince tekrarlanmalı — private repo'da davranış farklı olabilir.

---

## 4. Ertelenenler (ek özellik)

Sistemin çalışması için gerekli değil:

- Linear / ClickUp entegrasyonu ve `docs/adr/003`
- Slack bildirimleri
- GitHub Projects rehberi, `docs/labels.md`
- ADR 001 (branching) ve 002 (Terraform) — kararlar zaten uygulanmış durumda, yazılı
  kayıt eksik
- README.md, sunum hazırlığı, canlı demo senaryosu
- Dış danışman (`consultant`) rolü, süre sınırlı erişim

---

## 5. Verilen Kararlar (2026-08-08)

### K1 — Şablon dosyaları: karma mod ✅
| Dosya | Mod |
| :--- | :--- |
| `.github/CODEOWNERS` | `strict` |
| `.github/workflows/*` | `strict` |
| `.github/ISSUE_TEMPLATE/*` | `strict` |
| `.github/PULL_REQUEST_TEMPLATE.md` | `strict` |
| `.github/dependabot.yml` | `strict` |
| `CONTRIBUTING.md` | `seed` |
| `SECURITY.md` | `seed` |
| `.editorconfig` | `seed` |
| `README.md` | `seed` |

Yönetişim dosyaları elle değiştirilemez; içerik dosyaları repo'ya devredilir.

### K2 — Eski takımlar: 9'u silinecek, `platform-admins` kalacak ✅

**Silinecekler:** `core-engineering`, `backend-team`, `frontend-team`, `devops-team`,
`tech-leads`, `interns-2026`, `interns-backend`, `interns-frontend`,
`external-collaborators`

**Kalacak:** `platform-admins`

> ⚠️ **`platform-admins` silinemez — taşıyıcı bir kaynaktır.** Modül
> `head-of-engineering` rolünü bu takım üzerinden uyguluyor: her repo'ya admin erişimi
> (`github_team_repository.org_admins`) ve `push_allowed_roles` içindeki
> `head-of-engineering` karşılığı ona bağlı. Silinirse `apply` hata verir ve mentörlerin
> push izni de çöker.

**Gerekçe:** Rol tabanlı modelde disiplin takımlarının karşılığı yok. Yetki artık repo
başına üretilen `<repo>-mentors` / `<repo>-devs` takımlarından geliyor.

**Not — ileride gerekirse:** Disiplin takımları bir _yetki_ aracı değil, bir _etiket_
olarak geri getirilebilir (örn. 10 kişilik bir repo'da kimin backend'ci olduğunu
göstermek, CODEOWNERS ile yol bazlı review yönlendirmek). O gün gelirse: repo yetkisi
**vermeden** tanımlanmalı — GitHub bir kişiye birden fazla takım üzerinden erişim
verildiğinde **en yüksek** yetkiyi uygular, aksi halde en az yetki ilkesi sessizce
delinir.

### K3 — Dashboard bu repo'nun içinde ✅
Ayrı bir repo açılmayacak. Dashboard, Terraform kodu ve config aynı repo'da yaşayacak.
Frontend'i Emre yazacak (TypeScript); framework seçimi ona bırakıldı.

**Sonucu — blast radius:** Dashboard'un GitHub App'i bu repo'ya yazma yetkisi taşıyacak,
yani teorik olarak Terraform kodunu da değiştirebilir. İki önlemle sınırlanır:
1. Dashboard **doğrudan `main`'e yazmaz**, PR açar
2. `CODEOWNERS`, `terraform/*.tf` yollarını insan onayına bağlar; `terraform/config/**`
   yolları mentör onayıyla geçer

Bu ayrım Faz 1'de kurulacak.

### K4 — Repo isimlendirme standardı yok ✅
`svc-`, `web-`, `lib-` gibi bir önek zorunluluğu **olmayacak**. Repo'ları zaten
head-of-engineering veya mentörler açıyor; isim serbest. `implementation plan.md`'deki
ilgili bölüm geçersizdir.

---

## 6. Haftalara Dağılım

Fazlar iki kişiye paralel gidecek biçimde bölündü. Ayrıntılı checklist'ler görev
dosyalarında; bu tablo yalnızca genel görünüm.

| Hafta | Ozan 📦 | Emre 🔧 | Sync noktası |
| :--- | :--- | :--- | :--- |
| **4** | Faz 0 kalanı + Faz 1 (config'i repo başına dosyaya böl) | Faz 3 (GitOps workflow'ları) | CODEOWNERS kurallarını birlikte yaz |
| **5** | Faz 2 (şablon + workflow dağıtımı) | Faz 4 (GitHub App) | Dağıtımı yeni kimlikle test et |
| **6** | Güvenlik ayarları, `people` → üyelik, config JSON Schema, bekleyen testler | Faz 5a–5b (dashboard: okuma + PR yazma) | Okuma modunu birlikte gözden geçir |
| **7** | README, doküman bakımı, sunum yapısı | Faz 5c–5d (plan önizleme + doğrudan uygulama) | Uçtan uca pilot test, canlı demo |
| **8+** | Linear/ClickUp, GitHub Projects, `labels.md` | Slack, ADR 001–002, ruleset geçişi | — |

Detaylar: [`tasks-ozan.md`](tasks-ozan.md) · [`tasks-emre.md`](tasks-emre.md)

**Dağılım mantığı:** Emre organizasyon ve kimlik tarafında kalıyor (GitOps, App,
dashboard); Ozan repo modülü, şablonlar ve dokümantasyon tarafında. Her hafta iki iş
birbirinden bağımsız ilerliyor, yalnızca hafta sonunda birleşiyor — böylece kimse
diğerini beklemiyor.

---

## 7. Önerilen Sıra

```
Faz 0 (temizlik)  →  Faz 1 (config böl)  →  Faz 2 (şablon dağıtımı)
                                                    ↓
                          Faz 4 (GitHub App)  ←  Faz 3 (GitOps)
                                    ↓
                              Faz 5 (dashboard)
                                    ↓
                        Faz 6 (üyelik + temizlik)

                     Faz 7 — Team planı geldiğinde, sıradan bağımsız
```

**Gerekçe:** Faz 0–2 mevcut sistemi tamamlıyor ve dokümanları doğru hale getiriyor —
en hızlı görünür kazanç. Faz 3–4 dashboard'un altyapısı. Faz 5 asıl hedef. Faz 6
riskli işleri sisteme güven oluştuktan sonra yapıyor.

**S1 ve S2 cevaplanmadan Faz 2 ve Faz 6 başlayamaz.** S3 Faz 5'e kadar bekleyebilir.
