/**
 * Serileştirme güvenlik ağı.
 *
 * Dashboard config dosyalarını YENİDEN YAZIYOR — bir alanı sessizce düşürmesi
 * ya da bir yorumu silmesi Terraform'a yanlış plan ürettirir veya kararların
 * gerekçesini yok eder. Bu betik gerçek `terraform/config/repositories/*.yml`
 * dosyalarında üç şeyi doğrular:
 *
 *   1. applyEdits — düzenlenmeyen alanlar ve TÜM yorumlar aynen kalıyor mu?
 *   2. applyEdits — hedeflenen alan gerçekten değişiyor mu?
 *   3. serializeRepoConfig — sıfırdan yazımda alan düşüyor mu?
 *
 * Çalıştır: npm run verify:yaml
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyEdits, parseRepoConfig, serializeRepoConfig } from '../src/services/yaml'
import { validateRepoConfig } from '../src/services/validation'
import type { RepoConfig } from '../src/types/config'

// npm script'i dashboard/ dizininden çalışır; config bir üst dizindedir.
const CONFIG_DIR = join(process.cwd(), '..', 'terraform', 'config', 'repositories')

const TEST_USER = 'verify-yaml-test-user'

let failures = 0

function fail(file: string, message: string, extra?: string) {
  failures += 1
  console.error(`✗ ${file} — ${message}`)
  if (extra) console.error(`  ${extra}`)
}

function commentLines(text: string): string[] {
  return text.split('\n').filter((line) => line.trim().startsWith('#'))
}

/** developers/mentors dışındaki tüm alanlar aynı mı? */
function sameExcept(a: RepoConfig, b: RepoConfig, ignored: keyof RepoConfig): boolean {
  const strip = (config: RepoConfig) => {
    const copy = { ...config } as Record<string, unknown>
    delete copy[ignored]
    return JSON.stringify(copy, Object.keys(copy).sort())
  }
  return strip(a) === strip(b)
}

for (const file of readdirSync(CONFIG_DIR).filter((name) => /\.ya?ml$/.test(name))) {
  const original = readFileSync(join(CONFIG_DIR, file), 'utf8')
  const parsed = parseRepoConfig(original)

  const configErrors = validateRepoConfig(parsed)
  if (configErrors.length) {
    fail(file, `mevcut dosya doğrulamadan geçmiyor: ${configErrors.join(' ')}`)
    continue
  }

  // 1 + 2 — developer ekle
  const withUser = applyEdits(original, {
    developers: [...(parsed.developers ?? []), TEST_USER],
  })
  const afterAdd = parseRepoConfig(withUser)

  if (!afterAdd.developers?.includes(TEST_USER)) {
    fail(file, 'applyEdits developer eklemedi')
    continue
  }
  if (!sameExcept(parsed, afterAdd, 'developers')) {
    fail(file, 'applyEdits başka alanları da değiştirdi')
    continue
  }

  const lostComments = commentLines(original).filter(
    (comment) => !commentLines(withUser).includes(comment),
  )
  if (lostComments.length) {
    fail(file, `${lostComments.length} yorum satırı kayboldu`, lostComments[0].slice(0, 70))
    continue
  }

  // Geri alma turu — eklenen kullanıcı çıkarılınca içerik başa dönüyor mu?
  const reverted = parseRepoConfig(
    applyEdits(withUser, { developers: parsed.developers ?? [] }),
  )
  if (JSON.stringify(reverted) !== JSON.stringify(parsed)) {
    fail(file, 'ekle → çıkar turu dosyayı başa döndürmedi')
    continue
  }

  // 3 — sıfırdan yazım hiçbir alanı düşürmemeli
  const rewritten = parseRepoConfig(serializeRepoConfig(parsed))
  const before = JSON.stringify(parsed, Object.keys(parsed).sort())
  const after = JSON.stringify(rewritten, Object.keys(parsed).sort())
  if (before !== after) {
    fail(file, 'serializeRepoConfig turu içeriği değiştirdi', `önce: ${before}\n  sonra: ${after}`)
    continue
  }

  console.log(`✓ ${file}`)
}

if (failures) {
  console.error(`\n${failures} dosya başarısız.`)
  process.exit(1)
}

console.log('\nTüm config dosyaları tur testinden geçti.')
