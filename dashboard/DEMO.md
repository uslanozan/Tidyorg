# 🎬 Demo Senaryosu — "Sıfırdan proje aç + developer ekle"

Sunumda gösterilecek akış. Toplam **~6 dakika**. Anlatılan tek fikir:
*panelden yapılan hiçbir şey doğrudan GitHub'a yazmaz — her şey PR'dan geçer.*

## Önce hazırlık (sunumdan önce)

- [ ] `dashboard/.env` dolu (`VITE_GITHUB_CLIENT_ID` ya da token ile giriş)
- [ ] Sunum yapan kişi `people.yml` içinde `head-of-engineering` (yoksa "Yeni Proje" butonu görünmez)
- [ ] `npm run dev` ayakta, tarayıcı **koyu temada**, zoom %125 (uzaktan okunsun)
- [ ] Açık PR'lar temiz — "Bekleyen PR'lar" ekranı demo PR'ıyla başlasın
- [ ] İkinci sekmede config repo'sunun GitHub PR listesi hazır

---

## 1. Giriş — "panelin kendi anahtarı yok" (45 sn)

Giriş ekranını göster, **GitHub ile giriş yap**'a bas.

> Panelin kendi sunucusu ve kendi token'ı yok. Ekranda çıkan kodu GitHub'da ben
> onaylıyorum; bundan sonra her istek benim yetkimle gidiyor. Yani panel bana
> yapamayacağım hiçbir şeyi yaptıramaz.

Kodu gir, onayla, panele dön. Sağ üstte kendi avatarını göster.

## 2. Okuma — "config neyse ekran o" (60 sn)

Proje listesini göster; arama kutusuna bir şey yaz, dil filtresini değiştir.

Bir projeye gir. **Dal koruması** tablosunu göster — `Varsayılan` / `Repo` rozetlerine dikkat çek.

> Bu tablo GitHub'dan değil, `organization.yml` + repo dosyasından okunuyor.
> Kural nereden geliyorsa rozet onu söylüyor.

Bir kullanıcı adına tıkla → o kişinin hangi projede hangi rolde olduğu.

## 3. Yazma — developer ekle (90 sn)

Proje detayında **+ Developer Ekle**.

- Kullanıcı adını yaz, alandan çık → `✓ GitHub'da bulundu` doğrulamasını göster.
- Var olmayan bir kullanıcı adı da dene → hata mesajını göster (isteğe bağlı, +20 sn).

> Bu kontrol ucuz görünüyor ama olmasa var olmayan bir kullanıcı config'e
> yazılır ve hatayı `terraform apply` aşamasında alırdık.

**PR oluştur** → toast çıkar, PR linkini tıkla.

GitHub sekmesinde diff'i göster: **tek satır değişmiş, yorumlar yerinde.**

> Panel dosyayı baştan yazmıyor, yalnızca ilgili satırı değiştiriyor. Bu
> dosyalardaki yorumlar karar gerekçesi taşıyor; onları silen bir araç
> zamanla kurumsal hafızayı siler.

## 4. Plan önizleme (60 sn)

**Bekleyen PR'lar** ekranına geç.

- Plan yorumu düşmediyse: `⏳ Plan bekleniyor…` + 30 saniyelik otomatik yenileme.
- Düştüyse: `"2 kaynak eklenecek, 0 kaynak yok edilecek"` özeti.

> Kimse `terraform plan` çıktısını okumak zorunda değil. Yok etme içeren bir
> planda satır kırmızıya döner — asıl bakılması gereken tek şey o.

## 5. Yeni proje sihirbazı (2 dk)

**+ Yeni Proje** → üç adım:

1. Ad + açıklama — büyük harfli bir ad dene, doğrulama hatasını göster
2. Dil seç
3. Mentör (GitHub'da doğrulanır)

Önizleme adımında **oluşacak YAML'ı** göster.

> Şeffaflık: panel arkamdan bir şey yazmıyor, ne yazacağını önce gösteriyor.

**Projeyi oluştur (PR aç)** → PR'a git, yeni `.yml` dosyasını göster.

## 6. Kapanış (30 sn)

> Panelin yaptığı tek iş config dosyalarını düzenleyip PR açmak. Terraform'u
> doğrudan çağırmıyor, `main`'e yazmıyor, kendi yetkisi yok. Yani en kötü
> senaryoda bile üretebileceği şey **incelenmeyi bekleyen bir PR**.

---

## Yedek plan

| Ne bozulursa | Ne yap |
| :--- | :--- |
| Device Flow çalışmazsa | Giriş ekranında "Gelişmiş: token ile giriş" — token hazır bulundur |
| GitHub API limiti dolarsa | Ekran zaten "X dakika sonra deneyin" diyor; ekran görüntüleriyle devam et |
| GitOps plan yorumu düşmezse | "Plan bekleniyor" durumunu göster, bunun beklenen davranış olduğunu söyle |
| Yeni proje PR'ı açılamazsa | 3. adımdaki PR hâlâ açık — onun üzerinden anlat |
