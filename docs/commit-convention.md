# Commit Mesajı Standartları (Conventional Commits)

Tidyorg mühendislik ekipleri olarak, kod geçmişimizi temiz tutmak, kod inceleme (code review) süreçlerini hızlandırmak ve otomatik sürüm yönetimi (Semantic Versioning) yapabilmek için [Conventional Commits](https://www.conventionalcommits.org/) standardını kullanıyoruz.

Tüm PR'lar (Pull Request) ve commit mesajları bu standarda uygun olmalıdır.

---

## 1. Commit Mesajı Formatı

Her commit mesajı yapısal olarak şu formatta olmalıdır:

```text
<type>(<scope>): <kısa-aciklama>

[opsiyonel gövde (body)]

[opsiyonel altbilgi (footer)]
```

* **Type (Tür):** Değişikliğin amacını belirtir (Zorunlu).
* **Scope (Kapsam):** Değişikliğin kod tabanında nereyi etkilediğini belirtir (Opsiyonel ama şiddetle önerilir).
* **Description (Açıklama):** Yapılan işin kısa bir özetidir. İngilizce yazılmalı ve emir kipiyle başlamalıdır (örneğin "added" değil "add").
* **Body & Footer:** Değişikliğin detaylarını, neden yapıldığını veya kapatılan Issue numaralarını yazmak için kullanılır (Opsiyonel).

---

## 2. İzin Verilen Türler (Types)

Aşağıdaki türler, otomasyon araçlarımız (CI/CD) tarafından tanınır ve sürüm notlarına (Changelog) uygun şekilde yansıtılır.

| Tür (Type) | Kullanım Amacı | Sürüm Notuna Etkisi |
| :--- | :--- | :--- |
| `feat` | Tamamen yeni bir özellik ekler. | Yeni Özellikler (Features) |
| `fix` | Kod tabanındaki bir hatayı giderir. | Hata Düzeltmeleri (Bug Fixes) |
| `chore` | Üretim kodunu etkilemeyen bakım işleri, bağımlılık güncellemeleri. | Görünmez (Gizli) |
| `refactor` | Ne hata düzelten ne de özellik ekleyen kod iyileştirmesi. | Görünmez (Gizli) |
| `docs` | Yalnızca Markdown belgeleri veya kod içi yorum güncellemeleri. | Görünmez (Gizli) |
| `test` | Eksik testlerin eklenmesi veya mevcut testlerin düzeltilmesi. | Görünmez (Gizli) |
| `ci` | CI/CD yapılandırma dosyaları ve scriptlerindeki değişiklikler. | Görünmez (Gizli) |
| `perf` | Kodun performansını artıran bir değişiklik. | Performans İyileştirmeleri |

---

## 3. Kapsam (Scope) Örnekleri

Scope, projenin hangi parçasının değiştiğini belirtir. Projeye göre değişiklik gösterse de genel kullanımlar şöyledir:

* `(auth)`: Kimlik doğrulama, JWT, login işlemleri.
* `(payment)`: Ödeme altyapısı, faturalandırma.
* `(ui)`: Kullanıcı arayüzü, frontend bileşenleri.
* `(db)`: Veritabanı şemaları, migration dosyaları.
* `(api)`: REST/GraphQL uç noktaları (endpoints).
* `(deps)`: Bağımlılık (dependency) güncellemeleri.

---

## 4. İyi ve Kötü Commit Örnekleri

**❌ Kötü Örnekler (Reddedilecekler):**
> * "login hatası düzeltildi" *(Format yok, standart dışı)*
> * "update" *(Çok belirsiz, ne güncellendi?)*
> * "fix(ui): menü düzeltildi ve auth eklendi" *(Tek commit'te iki farklı iş yapılmış)*
> * "WIP" *(Work In Progress - Bu tarz commit'ler PR açılmadan önce squash edilmelidir)*

**✅ İyi Örnekler (Kabul Edilecekler):**
> * `feat(auth): add google oauth2 login integration`
> * `fix(payment): resolve null pointer exception in stripe webhook`
> * `chore(deps): bump react from 18.2.0 to 18.3.1`
> * `docs(readme): update installation instructions`

---

## 5. Semantic Versioning (SemVer) ile İlişkisi

Commit mesajlarındaki başlıklar, otomatik sürüm etiketleme (`vX.Y.Z`) sistemimizi doğrudan tetikler:

1. **PATCH (v1.0.X):** `fix`, `perf` türündeki commit'ler yama (patch) sürümünü artırır.
2. **MINOR (v1.X.0):** `feat` türündeki commit'ler minör sürümü artırır.
3. **MAJOR (vX.0.0):** Herhangi bir commit türünün yanına `!` işareti konulursa veya footer bölümüne `BREAKING CHANGE:` yazılırsa, bu geriye dönük uyumluluğun kırıldığını gösterir ve majör (ana) sürümü artırır.
   * Örnek: `feat(api)!: remove v1 endpoints`