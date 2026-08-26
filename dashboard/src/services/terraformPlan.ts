import type { IssueComment } from '../types/github'

/**
 * GitOps workflow'u (Ozan — Faz 3) `terraform plan` çıktısını PR'a yorum olarak
 * düşürür. Burada o yorumu okunur bir özete indiriyoruz.
 *
 * Beklenen satır: `Plan: 2 to add, 1 to change, 0 to destroy.`
 * "No changes." biçimi de tanınır.
 */

export type PlanStatus = 'pending' | 'no-changes' | 'changes' | 'error'

export interface PlanSummary {
  status: PlanStatus
  add: number
  change: number
  destroy: number
  /** destroy > 0 — kullanıcıya belirgin uyarı gösterilir. */
  hasDestroy: boolean
  /** Türkçe tek satırlık özet. */
  text: string
  commentUrl?: string
  createdAt?: string
  /** Hata durumunda ilk `Error:` satırı. */
  errorLine?: string
}

const PLAN_LINE = /Plan:\s*(\d+)\s+to add,\s*(\d+)\s+to change,\s*(\d+)\s+to destroy/i
const NO_CHANGES = /No changes\.|Your infrastructure matches the configuration/i
const ERROR_LINE = /^\s*(?:Error|╷?\s*│?\s*Error):\s*(.+)$/im

const PENDING: PlanSummary = {
  status: 'pending',
  add: 0,
  change: 0,
  destroy: 0,
  hasDestroy: false,
  text: 'Plan bekleniyor…',
}

function looksLikePlanComment(body: string): boolean {
  return (
    PLAN_LINE.test(body) ||
    NO_CHANGES.test(body) ||
    /terraform\s+plan/i.test(body) ||
    /Terraform Plan/i.test(body)
  )
}

/** PR'ın yorumları arasından en güncel plan yorumunu bulup özetler. */
export function summarizePlan(comments: IssueComment[]): PlanSummary {
  const planComments = comments.filter((comment) => looksLikePlanComment(comment.body))
  const latest = planComments[planComments.length - 1]
  if (!latest) return PENDING

  const shared = { commentUrl: latest.html_url, createdAt: latest.created_at }

  const match = latest.body.match(PLAN_LINE)
  if (match) {
    const [, addRaw, changeRaw, destroyRaw] = match
    const add = Number(addRaw)
    const change = Number(changeRaw)
    const destroy = Number(destroyRaw)

    const parts: string[] = []
    if (add) parts.push(`${add} kaynak eklenecek`)
    if (change) parts.push(`${change} kaynak değişecek`)
    parts.push(`${destroy} kaynak yok edilecek`)

    return {
      ...shared,
      status: 'changes',
      add,
      change,
      destroy,
      hasDestroy: destroy > 0,
      text: parts.join(', '),
    }
  }

  const error = latest.body.match(ERROR_LINE)
  if (error) {
    return {
      ...shared,
      status: 'error',
      add: 0,
      change: 0,
      destroy: 0,
      hasDestroy: false,
      text: 'Plan hata verdi',
      errorLine: error[1].trim(),
    }
  }

  if (NO_CHANGES.test(latest.body)) {
    return {
      ...shared,
      status: 'no-changes',
      add: 0,
      change: 0,
      destroy: 0,
      hasDestroy: false,
      text: 'Değişiklik yok — altyapı config ile uyumlu',
    }
  }

  return { ...PENDING, ...shared }
}
