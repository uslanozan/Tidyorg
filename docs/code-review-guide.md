# Code Review Rehberi

Code review'ın amacı hata yakalamak değil — hata yakalamak yan faydasıdır. Asıl amaç
**kodun ekibin ortak malı olması**: yazan kişi yarın olmasa da başkasının o kodu
anlayabilmesi.

Bu doküman iki tarafa da hitap eder: PR açan ve PR inceleyen.

---

## 1. PR Açan İçin

### 1.1 Küçük PR aç

Bu, review kalitesini belirleyen tek en önemli faktördür. 200 satırlık bir PR ciddi
biçimde incelenir; 2000 satırlık bir PR göz gezdirilip onaylanır.

Büyük bir iş varsa parçalara böl:
- Önce refactor, sonra özellik — ikisini aynı PR'a koyma
- Önce veri katmanı, sonra iş mantığı, sonra arayüz
- Bağımsız düzeltmeleri ayır

### 1.2 Açıklamayı doldur

PR şablonundaki **"Why?"** alanı en kritik olanıdır. Ne değiştiğini diff zaten gösterir;
neden değiştiğini yalnızca sen bilirsin. Reviewer'ın zamanının çoğu bu soruyu tahmin
etmeye gider — cevabı verirsen review hızlanır.

İyi bir açıklama şunları içerir:
- Hangi problemi çözüyor
- Neden bu yaklaşım seçildi, hangi alternatif elendi
- Nasıl test edildi
- Reviewer'ın özellikle bakmasını istediğin yer

### 1.3 Kendi PR'ını önce kendin incele

PR'ı açtıktan sonra "Files changed" sekmesine gir ve diff'i baştan sona oku. Yorum
satırında kalmış bir `console.log`, yanlış girinti, kopyala-yapıştır artığı çoğu zaman
burada yakalanır. Reviewer'ın zamanını bunlarla harcama.

### 1.4 CI yeşil olmadan review isteme

Kırmızı bir PR'ı incelemek zaman kaybıdır — reviewer'ın yorumları düzeltme sonrası
geçersiz olabilir. Önce `ci/test` yeşile dönsün.

### 1.5 Yorumlara cevap ver

Bir yorumu uyguladıysan "done" yaz veya emoji ile işaretle. Uygulamadıysan **neden**
uygulamadığını yaz. Sessizce kapatılan yorum reviewer'da "görülmedi mi acaba" şüphesi
bırakır.

---

## 2. Reviewer İçin

### 2.1 Neye bakılır

Öncelik sırasıyla:

**1. Doğruluk.** Kod iddia ettiği şeyi yapıyor mu? Sınır durumları düşünülmüş mü — boş
liste, null, sıfır, negatif sayı, eşzamanlı çağrı? Hata durumunda ne oluyor?

**2. Güvenlik.** Kullanıcı girdisi doğrulanıyor mu? SQL sorguları parametreli mi?
Yetki kontrolü var mı? Koda gömülü bir sır var mı? Log'a hassas veri yazılıyor mu?

**3. Okunabilirlik.** Altı ay sonra biri bu kodu anlayabilir mi? İsimlendirme ne
yaptığını söylüyor mu? Karmaşık bir bölüm neden öyle yazıldığını açıklıyor mu?

**4. Performans.** Döngü içinde sorgu var mı (N+1)? Gereksiz kopyalama? Büyük veri
kümesinde ne olur? — Ancak erken optimizasyon isteme; ölçülmemiş performans endişesi
çoğu zaman gürültüdür.

**5. Test.** Yeni davranışın testi var mı? Test gerçekten davranışı mı doğruluyor,
yoksa implementasyonu mu tekrar ediyor?

### 2.2 Neye bakılmaz

Format, girinti, tırnak tipi. Bunlar linter ve `.editorconfig` işidir. İnsan review'ı
makinenin yapabileceği işe harcanmamalıdır. Böyle bir yorum yazacaksan, bunun yerine
linter kuralı eklemeyi öner.

### 2.3 Geri bildirim nasıl verilir

**Koda yorum yap, kişiye değil.**
❌ "Bunu neden böyle yaptın, hiç mantıklı değil."
✅ "Burada X olursa ne oluyor? Ben bir sorun göremedim ama emin olamadım."

**Önem derecesini belirt.** Her yorum eşit ağırlıkta değil:
- `blocker:` — düzeltilmeden merge edilmemeli
- `öneri:` — daha iyi olurdu, ama zorunlu değil
- `soru:` — anlamadım, açıklar mısın
- `nit:` — çok küçük, istersen yap

Bu ön ek, PR sahibinin neyi mutlaka yapması gerektiğini netleştirir.

**Alternatif öner.** "Bu yanlış" demek yerine ne olması gerektiğini yaz. En iyisi kod
örneği vermek — GitHub'ın "suggestion" bloğu tek tıkla uygulanabilir.

**İyi olanı da söyle.** Zarif bir çözüm gördüysen yaz. Review yalnızca eleştiri kanalı
olursa insanlar PR açmaktan çekinir.

### 2.4 Approve mi, Request changes mi?

| Durum | Karar |
| :--- | :--- |
| Sorun yok | **Approve** |
| Yalnızca `nit:` ve `öneri:` var | **Approve** — güveni PR sahibine bırak |
| Anlamadığın bir yer var ama yanlış olduğundan emin değilsin | **Comment** — soru sor, bloke etme |
| Doğruluk veya güvenlik sorunu var | **Request changes** |
| Kapsam PR'ın amacını aşmış | **Request changes** — bölünmesini iste |

"Request changes" cömertçe kullanılacak bir araç değil; PR'ı fiilen durdurur. Küçük
düzeltmeler için Approve + yorum çoğu zaman daha hızlı ilerletir.

---

## 3. Onay Kuralları Repo'ya Göre Değişir

Tek bir "min 2 onay" kuralı yoktur. Her repo kendi kuralını konfigürasyondan alır:

| Ayar | Anlamı |
| :--- | :--- |
| `required_reviews` | Kaç onay gerekli |
| `require_code_owner_review` | Mentörün (code owner) onayı zorunlu mu |

Tipik yapılandırma:

- **`main`** — 2 onay + mentör onayı zorunlu. Canlıya giden kod.
- **`develop`** — 1 onay, mentör onayı zorunlu değil. Başka bir developer yeterli.

İki kişilik bir projede mentör onayını zorunlu kılmak onu darboğaz yapar; o yüzden bu
ayar repo bazında gevşetilebilir. Kuralı değiştirmek için:
[`config-guide.md`](config-guide.md).

### CODEOWNERS elle düzenlenmez

Her repo'daki `.github/CODEOWNERS` dosyası konfigürasyondan **üretilir**. Elle
değiştirirsen bir sonraki `terraform apply` üzerine yazar. Sahiplik değişikliği config
üzerinden yapılmalıdır.

---

## 4. Review Süresi

| Beklenti | Süre |
| :--- | :--- |
| İlk yanıt | 1 iş günü içinde |
| Küçük PR (<200 satır) | Aynı gün |
| Acil düzeltme / hotfix | Mümkün olan en kısa sürede — kanaldan haber ver |

> Bu süreler bir öneri olarak yazılmıştır; ekip pratikte farklı bir tempo benimserse
> doküman güncellenmelidir.

Review yapamayacak durumdaysan (izin, yoğunluk) PR'a kısa bir yorum bırak. Sessizlik en
kötü seçenektir — PR sahibi beklediğini bilemez.

---

## 5. Yeni Commit Onayları Düşürür

`dismiss_stale_reviews` ayarı açıktır: bir PR onaylandıktan sonra yeni commit gelirse
mevcut onaylar düşer ve yeniden review gerekir.

Bu bilinçli bir tercihtir — onaylanan kod ile merge edilen kodun aynı olmasını garanti
eder. Küçük bir düzeltme için tekrar onay istemek can sıkıcı görünebilir, ancak
alternatif "onaydan sonra sessizce eklenen kod"tur.

---

## 6. İlgili Dokümanlar

- [`workflow-guide.md`](workflow-guide.md) — Genel iş akışı
- [`commit-convention.md`](commit-convention.md) — Commit mesajı standardı
- [`branching-strategy.md`](branching-strategy.md) — Dal stratejisi
- [`config-guide.md`](config-guide.md) — Onay kurallarını değiştirmek
- [`security-policy.md`](security-policy.md) — Güvenlik açısından nelere dikkat edilir
