import { useCallback, useState } from 'react'
import { GitHubError } from '../services/githubApi'
import type { ProposalResult } from '../services/configRepo'
import { useConfig } from './useProjects'
import { useToast } from './useToast'

/**
 * Yazma akışının ortak sarmalı: PR'ı aç, sonucu toast ile bildir, config'i
 * tazele. Her ekranda aynı hata/başarı dilini kullanmak için tek yerde durur.
 */
export function useProposal() {
  const { push } = useToast()
  const { reload } = useConfig()
  const [busy, setBusy] = useState(false)

  const submit = useCallback(
    async (
      action: () => Promise<ProposalResult>,
      summary: string,
    ): Promise<ProposalResult | null> => {
      setBusy(true)
      try {
        const result = await action()

        push({
          kind: 'success',
          title: 'PR oluşturuldu ✓',
          message: result.retried
            ? `${summary} — Dosya bu sırada başkası tarafından değiştirilmişti, değişiklik güncel hâline uygulanıp tekrar denendi.`
            : summary,
          link: {
            href: result.pullRequest.html_url,
            label: `#${result.pullRequest.number} — PR'ı görüntüle`,
          },
        })

        await reload()
        return result
      } catch (error) {
        push({
          kind: 'error',
          title: 'İşlem tamamlanamadı',
          message:
            error instanceof GitHubError
              ? error.userMessage
              : error instanceof Error
                ? error.message
                : 'Bilinmeyen hata',
        })
        return null
      } finally {
        setBusy(false)
      }
    },
    [push, reload],
  )

  return { busy, submit }
}
