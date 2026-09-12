import { LANGUAGES, type Language, type RepoConfig } from '../types/config'

/**
 * Frontend validations.
 *
 * Provides immediate feedback to the user before opening a PR.
 */

/** GitHub repo name: lowercase, numbers, hyphens; cannot start/end with a hyphen. */
export const REPO_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** GitHub username pattern. */
export const USERNAME_PATTERN = /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/

export function validateRepoName(name: string, existing: string[] = []): string | null {
  if (!name.trim()) return 'Repository name is required.'
  if (name.length > 100) return 'Repository name can be at most 100 characters.'
  if (!REPO_NAME_PATTERN.test(name)) {
    return 'Only lowercase letters, numbers, and hyphens can be used (e.g. payment-service).'
  }
  if (existing.some((item) => item.toLowerCase() === name.toLowerCase())) {
    return 'A project with this name already exists.'
  }
  return null
}

export function validateUsername(login: string): string | null {
  if (!login.trim()) return 'GitHub username is required.'
  if (!USERNAME_PATTERN.test(login)) return 'Not a valid GitHub username.'
  return null
}

export function validateDescription(description: string): string | null {
  if (!description.trim()) return 'Description is required.'
  if (description.length > 350) return 'Description can be at most 350 characters.'
  return null
}

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value)
}

/** Entire config — final check right before the write flow begins. */
export function validateRepoConfig(config: RepoConfig): string[] {
  const errors: string[] = []

  const description = validateDescription(config.description ?? '')
  if (description) errors.push(description)

  if (!config.language || !isLanguage(config.language)) {
    errors.push(`Language must be one of: ${LANGUAGES.join(', ')}.`)
  }

  if (!config.mentors?.length) {
    errors.push('Every repository must have at least one mentor.')
  }

  const seen = new Set<string>()
  for (const login of [...(config.mentors ?? []), ...(config.developers ?? [])]) {
    const key = login.toLowerCase()
    if (seen.has(key)) errors.push(`"${login}" appears multiple times in the list.`)
    seen.add(key)
  }

  return errors
}

/** Archived repos are read-only; adding people is not allowed. */
export function assertCanAddMember(config: RepoConfig): string | null {
  return config.archived
    ? 'This repository is archived. Cannot add members to an archived repository.'
    : null
}

/** Does removing from mentor list leave the repo without mentors? */
export function assertCanRemoveMentor(config: RepoConfig, login: string): string | null {
  const remaining = (config.mentors ?? []).filter(
    (item) => item.toLowerCase() !== login.toLowerCase(),
  )
  return remaining.length === 0
    ? 'The last mentor cannot be removed — every repository must have at least one mentor.'
    : null
}
