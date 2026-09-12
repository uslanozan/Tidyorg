import { useCallback, useState } from 'react'
import { GitHubError } from '../services/githubApi'
import type { ProposalResult } from '../services/configRepo'
import { useConfig } from './useProjects'
import { useToast } from './useToast'

/**
 * Common wrapper for the write flow: opens the PR, notifies outcome via toast,
 * refreshes config. Kept in a single place to maintain consistent error/success language.
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
          title: 'PR created ✓',
          message: result.retried
            ? `${summary} — The file was modified by someone else in the meantime; changes were applied on top of the latest version and retried.`
            : summary,
          link: {
            href: result.pullRequest.html_url,
            label: `#${result.pullRequest.number} — View PR`,
          },
        })

        await reload()
        return result
      } catch (error) {
        push({
          kind: 'error',
          title: 'Action could not be completed',
          message:
            error instanceof GitHubError
              ? error.userMessage
              : error instanceof Error
                ? error.message
                : 'Unknown error',
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
