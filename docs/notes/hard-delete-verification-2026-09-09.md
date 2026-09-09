# Hard-delete doğrulaması — 2026-09-09

> Kanıt kaydı: yönetilen bir repo'nun panelden değil, bilinçli bir break-glass
> script'iyle uçtan uca kalıcı silinmesi canlı olarak doğrulandı.

## Ne yapıldı
`your-org/ruby-on-rrrails` (bir test/junk reposu) tümüyle silindi:
`scripts/hard-delete-repo.ps1` (PowerShell; bash eşi de var) ile.

## Çalışan akış (guardrail'ler + adımlar)
1. **Guardrail 1 — owner:** çalıştıran (`uslanozan`) org owner mı → GitHub API `memberships` (`role=admin`). ✓
2. **Guardrail 2 — arşivli:** repo `archived=true` mı (önce dashboard'dan arşivlenmişti). ✓
3. **Onay:** repo adı elle yazdırıldı (`ruby-on-rrrails`).
4. **Config:** `terraform/config/repositories/ruby-on-rrrails.yml` silindi → commit → main'e push (owner branch protection'ı `enforce_admins=false` ile bypass etti).
5. **State:** `terraform state rm 'module.repositories["ruby-on-rrrails"]'` → **10 kaynak** kaldırıldı (repo, 2 branch, 2 team, membership'ler, team-repository'ler). Bu, `prevent_destroy` kilidini bilinçli olarak aşmanın tek yolu.
6. **GitHub:** repo API ile silindi; `ruby-on-rrrails-mentors` ve `-devs` takımları silindi.

## Doğrulama (read-only, silme sonrası)
- Repo: `GET /repos/your-org/ruby-on-rrrails` → **404** ✓
- Terraform state: `state list | grep ruby-on-rrrails` → **0** ✓
- Config: `terraform/config/repositories/ruby-on-rrrails.yml` → **yok** ✓

## Ne kanıtlıyor
- Config → GitHub silme yolu uçtan uca çalışıyor; `prevent_destroy` yalnızca bilinçli script'le aşılabiliyor (kazara apply silmiyor).
- İki guardrail (owner-only + sadece-arşivli) tuttu.
- Auth `gh` CLI üzerinden (operatörün owner kimliği kapı); GitHub App **kullanılmadı** — App repo silemez, silme yetkisi bilerek App'in dışında.

## Yol boyunca bulunan + düzeltilen kusurlar (script artık bunlara dayanıklı)
- **PS tırnak sorunu:** PowerShell native argümana gömülü çift tırnakları yutuyor → `terraform state rm` adresi tırnaksız gidip patlıyordu. `\"` kaçışıyla düzeltildi (commit `1d58e73`).
- **Stale local main:** script commit'leyip push ederken yerel main origin'in gerisindeyse push yarıda reddoluyor, yarım commit bırakıyordu. Artık push'tan önce "behind mı" preflight'ı var → temizce durur (commit `955dd32`).

## İlgili
- Script: `scripts/hard-delete-repo.sh` · `scripts/hard-delete-repo.ps1`
- Kullanım: repo önce arşivlenir (dashboard/config), sonra owner `gh auth login`'liyken `hard-delete-repo <repo>` (önce `--dry-run`).
