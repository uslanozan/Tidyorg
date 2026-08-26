import { LANGUAGES, type Language, type RepoConfig } from '../types/config'

/**
 * Frontend doğrulamaları.
 *
 * Ozan'ın JSON Schema'sı hazır olunca (Hafta 6) asıl doğrulama oraya taşınır;
 * buradaki kontroller o zaman da kalır — kullanıcıya PR açmadan önce anında
 * geri bildirim verirler.
 */

/** GitHub repo adı: küçük harf, rakam, tire; başta/sonda tire yok. */
export const REPO_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** GitHub kullanıcı adı kuralı. */
export const USERNAME_PATTERN = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/

export function validateRepoName(name: string, existing: string[] = []): string | null {
  if (!name.trim()) return 'Repo adı zorunlu.'
  if (name.length > 100) return 'Repo adı en fazla 100 karakter olabilir.'
  if (!REPO_NAME_PATTERN.test(name)) {
    return 'Yalnızca küçük harf, rakam ve tire kullanılabilir (örn. odeme-servisi).'
  }
  if (existing.some((item) => item.toLowerCase() === name.toLowerCase())) {
    return 'Bu adda bir proje zaten var.'
  }
  return null
}

export function validateUsername(login: string): string | null {
  if (!login.trim()) return 'GitHub kullanıcı adı zorunlu.'
  if (!USERNAME_PATTERN.test(login)) return 'Geçerli bir GitHub kullanıcı adı değil.'
  return null
}

export function validateDescription(description: string): string | null {
  if (!description.trim()) return 'Açıklama zorunlu.'
  if (description.length > 350) return 'Açıklama en fazla 350 karakter olabilir.'
  return null
}

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

/** Config'in tamamı — yazma akışı başlamadan hemen önce son kontrol. */
export function validateRepoConfig(config: RepoConfig): string[] {
  const errors: string[] = []

  const description = validateDescription(config.description ?? '')
  if (description) errors.push(description)

  if (!config.language || !isLanguage(config.language)) {
    errors.push(`Dil şunlardan biri olmalı: ${LANGUAGES.join(', ')}.`)
  }

  if (!config.mentors?.length) {
    errors.push('Her repo\'nun en az bir mentörü olmalı.')
  }

  const seen = new Set<string>()
  for (const login of [...(config.mentors ?? []), ...(config.developers ?? [])]) {
    const key = login.toLowerCase()
    if (seen.has(key)) errors.push(`"${login}" listede birden fazla kez var.`)
    seen.add(key)
  }

  return errors
}

/** Arşivlenmiş repo salt-okunurdur; kişi eklemek anlamsız ve yanıltıcıdır. */
export function assertCanAddMember(config: RepoConfig): string | null {
  return config.archived
    ? 'Bu repo arşivlenmiş. Arşivlenmiş repo\'ya kişi eklenemez.'
    : null
}

/** Mentör listesinden çıkarma repo'yu mentörsüz bırakıyor mu? */
export function assertCanRemoveMentor(config: RepoConfig, login: string): string | null {
  const remaining = (config.mentors ?? []).filter(
    (item) => item.toLowerCase() !== login.toLowerCase(),
  )
  return remaining.length === 0
    ? 'Son mentör çıkarılamaz — her repo\'nun en az bir mentörü olmalı.'
    : null
}
