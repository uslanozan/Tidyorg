# Security Policy · Güvenlik Politikası

EN — Security is a top priority at Tidyorg. This document explains how to report vulnerabilities securely.
TR — Güvenlik, Tidyorg'da en yüksek önceliktir. Bu belge, güvenlik açıklarının nasıl güvenli bir şekilde bildirileceğini açıklar.

## Supported Versions · Desteklenen Sürümler

EN — We provide security updates for the current major version and the immediately preceding major version. Older majors receive no fixes.
TR — Mevcut ana sürüm ve bir önceki ana sürüm için güvenlik güncellemeleri sağlıyoruz. Daha eski ana sürümler için düzeltme yayınlanmaz.

EN — Released versions are listed on the repository's Releases page. If this repository has no releases yet, the default branch is the only supported version.
TR — Yayınlanmış sürümler repo'nun Releases sayfasında listelenir. Repo'da henüz sürüm yoksa desteklenen tek sürüm varsayılan daldır.

## Reporting a Vulnerability · Güvenlik Açığı Bildirme

EN — **DO NOT** create a public GitHub issue for security vulnerabilities. This exposes the organization to unnecessary risk.
TR — Güvenlik açıkları için HERKESE AÇIK bir GitHub issue'su **OLUŞTURMAYIN**. Bu, organizasyonu gereksiz riske maruz bırakır.

EN — 1. Email your findings directly to `security@example.com`.
TR — 1. Bulgularınızı doğrudan `security@example.com` adresine e-posta ile gönderin.

EN — 2. Include detailed steps to reproduce the vulnerability, environmental factors, and potential impact.
TR — 2. Güvenlik açığını yeniden oluşturmak için ayrıntılı adımları, çevresel faktörleri ve olası etkileri dahil edin.

EN — 3. Our security team will acknowledge receipt of your email within 48 hours.
TR — 3. Güvenlik ekibimiz e-postanızın alındığını 48 saat içinde onaylayacaktır.

EN — 4. We will provide a timeline for the fix and notify you once the patch is deployed.
TR — 4. Düzeltme için bir zaman çizelgesi sunacağız ve yama uygulandığında sizi bilgilendireceğiz.

## Leaked Credentials · Sızan Kimlik Bilgileri

EN — If a secret (API key, token, password) was ever committed, deleting the file is **not enough** — it stays in the git history. Revoke and rotate the credential first, then clean up.
TR — Bir sır (API anahtarı, token, şifre) bir kez commit edildiyse dosyayı silmek **yetmez** — git geçmişinde kalır. Önce anahtarı iptal edip yenileyin, temizlik ikinci adımdır.
