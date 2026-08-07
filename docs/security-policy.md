# Güvenlik Politikaları ve Uygulamaları

Tidyorg mühendislik ekibi olarak, güvenliği geliştirme sürecimizin sonradan eklenen bir parçası değil, temel bir yapı taşı (Shift-Left Security) olarak görüyoruz. Bu doküman, günlük geliştirme süreçlerindeki güvenlik standartlarımızı belirler.

## 1. Sırların Yönetimi (Secret Management)

Kod tabanına (repository) kesinlikle API anahtarları, şifreler, token'lar veya herhangi bir hassas veri eklenemez.

* **Yerel Geliştirme:** Tüm sırlar `.env` dosyalarında tutulmalıdır. `.env` dosyaları `.gitignore` dosyamızda küresel olarak engellenmiştir, bu sayede yanlışlıkla commit edilemezler. Sadece `.env.example` gibi şablon dosyaları depoya gönderilmelidir.
* **CI/CD Süreçleri:** GitHub Actions iş akışlarında kullanılacak tüm hassas veriler **GitHub Secrets** aracılığıyla şifrelenmiş olarak saklanmalıdır. Terraform değişkenleri (örneğin PAT) HCP Terraform üzerinde "Sensitive" (Hassas) olarak işaretlenmelidir.

## 2. Push Protection (Sır Sızıntısını Engelleme)

GitHub Advanced Security'nin "Push Protection" özelliği tüm repolarımızda aktiftir. Eğer bir geliştirici kodunun içinde yanlışlıkla bir API anahtarı veya AWS token'ı commit'leyip pushlamaya çalışırsa, GitHub bu işlemi terminal aşamasındayken reddedecektir.
* **Uyarı Alırsanız:** İlgili commit'i geri alıp, hassas veriyi koddan temizlemeniz ve çevre değişkenlerine (environment variables) taşımanız gerekmektedir.

## 3. Dependabot Yapılandırması

Bağımlılık (dependency) zafiyetlerine karşı korunmak için `dependabot.yml` yapılandırmamız aktiftir.
* Dependabot, repolarımızı haftalık olarak tarar.
* Güvenlik açığı barındıran bir paket tespit ettiğinde otomatik olarak bir Pull Request (PR) açar ve `type: chore` etiketi atar.
* Bu PR'lar ilgili ekibin Tech Lead'leri tarafından incelenip en kısa sürede birleştirilmelidir (merge).

## 4. Code Scanning (Statik Kod Analizi)

Kodumuzdaki potansiyel güvenlik açıklarını (SQL Injection, XSS, hafıza sızıntıları) tespit etmek için CI/CD iş akışlarımıza statik kod analizi (CodeQL vb.) araçları entegre edilmiştir.
* Bir PR açıldığında, güvenlik taraması otomatik olarak çalışır.
* Eğer kritik (Critical) veya yüksek (High) seviyeli bir güvenlik açığı tespit edilirse, sistem PR'ın birleştirilmesini (merge) otomatik olarak engeller.

## 5. Güvenlik Açığı Raporlama Süreci

Eğer mevcut kod tabanımızda bir güvenlik açığı keşfederseniz:
1. Kesinlikle herkese açık bir GitHub Issue **açmayın.**  
(--TODO : madde 2 şirket politikasına göre uyarlanabilir--)
2. Bulgularınızı tüm teknik detayları ve yeniden oluşturma adımlarıyla birlikte `security@tidyorg.digital` adresine e-posta olarak gönderin. (Bkz. `.github/SECURITY.md`)