# Onboarding — Yeni Geliştirici Rehberi

Hoş geldin. Bu rehber ilk günden ilk merge edilen PR'ına kadar geçen yolu anlatır.
Baştan sona okuman yaklaşık 15 dakika sürer; kurulum dahil ilk yarım günün bununla
geçmesi normaldir.

---

## 1. İlk Gün — Kontrol Listesi

### 1.1 Erişim

- [ ] **GitHub organizasyon davetini kabul et.**
      Davet e-postası otomatik gelir; kimse elle davet etmez. Mentörün seni
      konfigürasyona ekler, sistem daveti üretir.
      Davet gelmediyse mentörüne söyle — büyük ihtimalle henüz `apply` çalışmamıştır.

- [ ] **İki faktörlü doğrulamayı (2FA) etkinleştir.**
      GitHub → Settings → Password and authentication.
      Organizasyon üyeliği için zorunludur; 2FA'sız hesap erişimini kaybeder.

- [ ] **SSH anahtarı oluştur ve ekle.**
      ```bash
      ssh-keygen -t ed25519 -C "adin@sirket.com"
      cat ~/.ssh/id_ed25519.pub
      ```
      Çıktıyı GitHub → Settings → SSH and GPG keys → New SSH key altına yapıştır.
      Doğrula:
      ```bash
      ssh -T git@github.com
      ```

- [ ] **Hangi repo'lara erişimin olduğunu öğren.**
      `https://github.com/orgs/<org>/teams` adresinde üyesi olduğun `<repo>-devs`
      takımlarını görürsün. Her takım bir projeye karşılık gelir.

### 1.2 Geliştirme ortamı

- [ ] **Projeyi klonla**
      ```bash
      git clone git@github.com:<org>/<repo>.git
      cd <repo>
      ```

- [ ] **Projeye özel kurulumu yap.** Repo'nun kendi `README.md` veya
      `CONTRIBUTING.md` dosyasındaki adımları izle (bağımlılıklar, `.env` dosyası,
      veritabanı vb.).

- [ ] **`.editorconfig` eklentisini kur.** Editörün girinti ve satır sonu ayarlarını
      projeyle hizalar; format farkından doğan gereksiz diff'leri önler.
      VS Code: `EditorConfig for VS Code`.

- [ ] **Sırları asla commit'leme.** Tüm hassas veriler `.env` dosyalarında tutulur ve
      `.gitignore` ile engellenmiştir. Ayrıntı: [`security-policy.md`](security-policy.md).

### 1.3 Okunacaklar

| Doküman | Neden |
| :--- | :--- |
| [`workflow-guide.md`](workflow-guide.md) | Genel resmi görmek için |
| [`branching-strategy.md`](branching-strategy.md) | Dal isimlendirme ve akış |
| [`commit-convention.md`](commit-convention.md) | Commit mesajı formatı |
| [`code-review-guide.md`](code-review-guide.md) | Review sürecinde ne beklenir |

---

## 2. İlk Pull Request'in

Küçük bir şeyle başla — bir yazım hatası düzeltmesi, eksik bir doküman satırı. Amaç
kodun büyüklüğü değil, akışı bir kez uçtan uca yaşamak.

**1. Güncel `develop`'tan dal aç**

```bash
git checkout develop
git pull origin develop
git checkout -b docs/fix-readme-typo
```

Dal adı `<kategori>/<kısa-açıklama>` biçimindedir. Kategoriler: `feat/`, `fix/`,
`chore/`, `docs/`. Issue takip sistemi kullanılıyorsa ID'yi ekle:
`feat/LIN-123-user-auth`.

**2. Değişikliği yap ve commit'le**

```bash
git add .
git commit -m "docs(readme): fix installation command typo"
```

**3. Push et**

```bash
git push -u origin docs/fix-readme-typo
```

**4. PR aç**

Terminal çıktısındaki bağlantıya tıkla veya GitHub'da "Compare & pull request" düğmesini
kullan. Hedef dal **`develop`** olmalı.

PR şablonu otomatik dolar. En önemli alan **"Why?"** — ne yaptığını diff zaten gösteriyor,
neden yaptığını yalnızca sen biliyorsun.

**5. CI'ın bitmesini bekle**

Altta `ci/test` adında bir kontrol çalışır. Yeşile dönmeden merge açılmaz. Kırmızıysa
loglara bak, düzelt, tekrar push et — PR otomatik güncellenir.

**6. Review al**

Gerekli onay sayısı repo'ya göre değişir. Bazı projelerde mentörün onayı zorunludur,
bazılarında başka bir developer'ın onayı yeterlidir. PR sayfası hangisinin beklendiğini
gösterir.

**7. Merge et**

Onay ve yeşil CI geldikten sonra **Squash and merge**. Dalın otomatik silinir.

---

## 3. Commit Mesajı Örnekleri

```
feat(auth): add google oauth2 login integration
fix(payment): resolve null pointer in stripe webhook
chore(deps): bump react from 18.2.0 to 18.3.1
docs(readme): update installation instructions
```

Kötü örnekler ve gerekçeleri: [`commit-convention.md`](commit-convention.md).

Commit mesajın sürüm numarasını doğrudan etkiler: `feat` minor, `fix` patch,
`BREAKING CHANGE` major artışı tetikler.

---

## 4. Review Sürecinde Ne Beklemelisin

- **İlk yorum genelde 1 iş günü içinde gelir.** Daha acilse PR'a etiket koy veya
  mentörüne yaz.
- **Değişiklik istenmesi normaldir.** "Request changes" kişisel bir eleştiri değil,
  sürecin işlediğinin göstergesidir. Deneyimli geliştiriciler de aynı yorumları alır.
- **Anlamadığın yorumu sor.** Reviewer'ın niyeti kodun daha iyi olması; sorman
  yavaşlatmaz, hızlandırır.
- **Küçük PR daha hızlı geçer.** 200 satırlık bir PR aynı gün, 2000 satırlık bir PR
  günlerce bekleyebilir.
- **Yeni commit atınca onaylar düşer.** `dismiss_stale_reviews` açık — yeniden onay
  istemen gerekir. Bu bilinçli: onaylanan kod ile merge edilen kod aynı olsun diye.

---

## 5. Sıkça Sorulan Sorular

**"Repo'ya erişemiyorum / 404 görüyorum."**
Henüz o projenin takımına eklenmemişsindir. Mentörüne söyle; seni konfigürasyona ekler,
PR merge edilip `apply` çalıştıktan sonra erişimin açılır. Birkaç dakika sürer.

**"`develop`'a push atamıyorum, reddediliyor."**
Beklenen davranış. `main` ve `develop` korumalı dallardır; developer rolündeki kimse
doğrudan yazamaz. Dal aç, PR üzerinden gönder.

**"PR'ım `ci/test` bekliyor, hiç başlamıyor."**
Repo'da CI workflow dosyası olmayabilir. Mentörüne bildir — repo'nun konfigürasyonunda
CI dağıtımı ile status check zorunluluğu birlikte ayarlanmalıdır.

**"Kendi PR'ımı onaylayamıyorum."**
GitHub buna izin vermez. Başka birinin onaylaması gerekir.

**"GitHub arayüzünden bir ayarı değiştirdim, sonra eski hâline döndü."**
Doğru gördün. Repo ayarları koddan yönetiliyor; elle yapılan değişiklikler bir sonraki
`apply` ile geri alınır. Kalıcı değişiklik için mentörüne söyle, konfigürasyondan
yapılsın. Ayrıntı: [`config-guide.md`](config-guide.md).

**"Yanlış dala PR açtım."**
PR sayfasında "Edit" ile hedef dalı değiştirebilirsin, PR'ı kapatmana gerek yok.

**"Merge edemiyorum, düğme gri."**
Sırayla kontrol et: CI yeşil mi, yeterli onay var mı, çözülmemiş yorum kaldı mı, dal
`develop` ile güncel mi. PR sayfası eksik olanı listeler.

**"`.env` dosyamı yanlışlıkla commit ettim."**
Hemen mentörüne haber ver. Sır bir kez push edildiyse dosyayı silmek yetmez — geçmişte
kalır. İlgili anahtarın iptal edilip yenilenmesi gerekir.

---

## 6. Yardım Nereden Alınır

1. Bu doküman ve [`workflow-guide.md`](workflow-guide.md)
2. Repo'nun kendi `README.md` / `CONTRIBUTING.md` dosyası
3. Projenin mentörü — kim olduğunu `<repo>-mentors` takımından görebilirsin
4. Takım kanalı

Sorunun cevabı dokümanlarda yoksa bu bir eksikliktir: sor, sonra da cevabı buraya
eklemek için bir PR aç. Bu rehberin gelişme yolu budur.
