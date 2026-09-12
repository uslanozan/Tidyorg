/**
 * Serialization safety net.
 *
 * The dashboard REWRITES config files — silently dropping a field
 * or deleting a comment would cause Terraform to generate an incorrect plan
 * or erase the rationale behind decisions. This script verifies three things
 * on actual `terraform/config/repositories/*.yml` files:
 *
 *   1. applyEdits — do unedited fields and ALL comments remain intact?
 *   2. applyEdits — does the target field actually change?
 *   3. serializeRepoConfig — does writing from scratch drop any fields?
 *
 * Run: npm run verify:yaml
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  applyEdits,
  parseOrgConfig,
  parsePeopleConfig,
  parseRepoConfig,
  serializePeopleConfig,
  serializeRepoConfig,
  setYamlPath,
} from '../src/services/yaml'
import { validateRepoConfig } from '../src/services/validation'
import type { RepoConfig } from '../src/types/config'

// npm script runs from the dashboard/ directory; config is in the parent directory.
const CONFIG_BASE = join(process.cwd(), '..', 'terraform', 'config')
const CONFIG_DIR = join(CONFIG_BASE, 'repositories')

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

/** Are all fields except developers/mentors identical? */
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
    fail(file, `existing file fails validation: ${configErrors.join(' ')}`)
    continue
  }

  // 1 + 2 — add developer
  const withUser = applyEdits(original, {
    developers: [...(parsed.developers ?? []), TEST_USER],
  })
  const afterAdd = parseRepoConfig(withUser)

  if (!afterAdd.developers?.includes(TEST_USER)) {
    fail(file, 'applyEdits did not add developer')
    continue
  }
  if (!sameExcept(parsed, afterAdd, 'developers')) {
    fail(file, 'applyEdits modified other fields')
    continue
  }

  const lostComments = commentLines(original).filter(
    (comment) => !commentLines(withUser).includes(comment),
  )
  if (lostComments.length) {
    fail(file, `${lostComments.length} comment line(s) lost`, lostComments[0].slice(0, 70))
    continue
  }

  // Undo roundtrip — does content revert back when added user is removed?
  const reverted = parseRepoConfig(
    applyEdits(withUser, { developers: parsed.developers ?? [] }),
  )
  if (JSON.stringify(reverted) !== JSON.stringify(parsed)) {
    fail(file, 'add → remove roundtrip did not revert file')
    continue
  }

  // 2b — nested block editing (protected_branches): add → revert roundtrip
  const withRule = applyEdits(original, {
    protected_branches: {
      ...(parsed.protected_branches ?? {}),
      'verify-yaml-branch': { required_reviews: 2 },
    },
  })
  const afterRule = parseRepoConfig(withRule)
  if (afterRule.protected_branches?.['verify-yaml-branch']?.required_reviews !== 2) {
    fail(file, 'applyEdits did not add nested branch rule')
    continue
  }
  if (!sameExcept(parsed, afterRule, 'protected_branches')) {
    fail(file, 'applyEdits (nested) modified other fields')
    continue
  }
  const lostAfterRule = commentLines(original).filter(
    (comment) => !commentLines(withRule).includes(comment),
  )
  if (lostAfterRule.length) {
    fail(file, `nested edit deleted ${lostAfterRule.length} comment(s)`, lostAfterRule[0].slice(0, 70))
    continue
  }
  const revertRule = parseRepoConfig(
    applyEdits(withRule, { protected_branches: parsed.protected_branches ?? undefined }),
  )
  if (JSON.stringify(revertRule) !== JSON.stringify(parsed)) {
    fail(file, 'nested add → remove roundtrip did not revert file')
    continue
  }

  // 2c — labels (array of objects) editing: repo-specific label set written
  // by dashboard goes through the same path (renderEntry → dumpBlock). Add → revert roundtrip.
  const withLabels = applyEdits(original, {
    labels: [
      ...(parsed.labels ?? []),
      { name: 'verify-yaml: label', color: 'ededed', description: 'roundtrip test' },
    ],
  })
  const afterLabels = parseRepoConfig(withLabels)
  const addedLabel = afterLabels.labels?.find((l) => l.name === 'verify-yaml: label')
  if (addedLabel?.color !== 'ededed') {
    fail(file, 'applyEdits did not add label (or color corrupted)')
    continue
  }
  if (!sameExcept(parsed, afterLabels, 'labels')) {
    fail(file, 'applyEdits (labels) modified other fields')
    continue
  }
  const lostAfterLabels = commentLines(original).filter(
    (comment) => !commentLines(withLabels).includes(comment),
  )
  if (lostAfterLabels.length) {
    fail(file, `labels edit deleted ${lostAfterLabels.length} comment(s)`, lostAfterLabels[0].slice(0, 70))
    continue
  }
  const revertLabels = parseRepoConfig(
    applyEdits(withLabels, { labels: parsed.labels ?? undefined }),
  )
  if (JSON.stringify(revertLabels) !== JSON.stringify(parsed)) {
    fail(file, 'labels add → remove roundtrip did not revert file')
    continue
  }

  // 3 — writing from scratch must not drop any fields
  const rewritten = parseRepoConfig(serializeRepoConfig(parsed))
  const before = JSON.stringify(parsed, Object.keys(parsed).sort())
  const after = JSON.stringify(rewritten, Object.keys(parsed).sort())
  if (before !== after) {
    fail(file, 'serializeRepoConfig roundtrip changed content', `before: ${before}\n  after: ${after}`)
    continue
  }

  console.log(`✓ ${file}`)
}

/* ─── people.yml — membership write path (serializePeopleConfig) ─────────────
   The dashboard writes people.yml FROM SCRATCH (machine-owned, no comments).
   Verify: does the add → remove roundtrip revert the member list, and no other fields leak? */
const peoplePath = join(CONFIG_BASE, 'people.yml')
if (existsSync(peoplePath)) {
  const failuresBefore = failures
  const original = readFileSync(peoplePath, 'utf8')
  const parsed = parsePeopleConfig(original)
  const TEST_MEMBER = 'verify-yaml-test-member'

  const roundTrip = parsePeopleConfig(serializePeopleConfig(parsed.members))
  if (JSON.stringify(roundTrip.members) !== JSON.stringify(parsed.members)) {
    fail('people.yml', 'serializePeopleConfig modified member list')
  } else {
    const added = parsePeopleConfig(
      serializePeopleConfig([...parsed.members, TEST_MEMBER]),
    )
    if (!added.members.includes(TEST_MEMBER)) {
      fail('people.yml', 'member could not be added')
    }
    const reverted = parsePeopleConfig(
      serializePeopleConfig(added.members.filter((m) => m !== TEST_MEMBER)),
    )
    if (JSON.stringify(reverted.members) !== JSON.stringify(parsed.members)) {
      fail('people.yml', 'add → remove roundtrip did not revert list')
    }
  }
  if (failures === failuresBefore) console.log('✓ people.yml')
}

/* ─── organization.yml — nested leaf write path (setYamlPath) ────────────────
   HUMAN-OWNED, full of comments. The dashboard writes org settings here.
   Verify: modifying a deep leaf updates the VALUE, preserves ALL comments,
   does not leak into other fields; non-existent path does not modify file.   */
const orgPath = join(CONFIG_BASE, 'organization.yml')
if (existsSync(orgPath)) {
  const failuresBefore = failures
  const original = readFileSync(orgPath, 'utf8')
  const commentsBefore = commentLines(original).length

  // Deep leaf (inside commented block) + inline-commented line + role + block-list.
  const cases: { path: string[]; value: unknown; read: (c: any) => unknown }[] = [
    { path: ['profile', 'name'], value: 'verify-org', read: (c) => c.profile?.name },
    { path: ['defaults', 'visibility'], value: 'private', read: (c) => c.defaults?.visibility },
    {
      path: ['defaults', 'protected_branches', 'main', 'required_reviews'],
      value: 2,
      read: (c) => c.defaults?.protected_branches?.main?.required_reviews,
    },
    { path: ['roles', 'mentor', 'repo_permission'], value: 'push', read: (c) => c.roles?.mentor?.repo_permission },
  ]

  for (const { path, value, read } of cases) {
    const edited = setYamlPath(original, path, value as never)
    const parsed = parseOrgConfig(edited) as unknown
    if (read(parsed) !== value) {
      fail('organization.yml', `setYamlPath did not write ${path.join('.')} value`)
    }
    if (commentLines(edited).length !== commentsBefore) {
      fail('organization.yml', `setYamlPath changed comment count on ${path.join('.')}`)
    }
  }

  // Non-existent path should not modify file at all.
  if (setYamlPath(original, ['defaults', 'non_existent_field'], 'x' as never) !== original) {
    fail('organization.yml', 'non-existent path modified the file')
  }

  if (failures === failuresBefore) console.log('✓ organization.yml')
}

if (failures) {
  console.error(`\n${failures} file(s) failed.`)
  process.exit(1)
}

console.log('\nAll config files passed the roundtrip test.')
