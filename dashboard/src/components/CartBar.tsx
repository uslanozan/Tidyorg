import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { useT } from '../i18n'
import { useClient } from '../hooks/useAuth'
import { useCart, type CartItem } from '../hooks/useCart'
import { useProposal } from '../hooks/useProposal'
import { proposeMultiChange, type FileChange } from '../services/configRepo'

/** 'terraform/config/repositories/odeme.yml' → 'repositories/odeme.yml' */
const shortPath = (p: string) => p.replace(/^terraform\/config\//, '')

/**
 * Batch mode toggle + change cart in the header.
 *
 * When batch mode is ON, mutations do not immediately open a PR; they accumulate
 * in the cart. "Apply in single PR" opens the entire cart as a SINGLE PR + SINGLE apply
 * (proposeMultiChange). Items targeting the same file are composed sequentially.
 */
export function CartBar() {
  const t = useT()
  const { batchMode, setBatchMode, items, count, remove, clear } = useCart()
  const client = useClient()
  const { busy, submit } = useProposal()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const groups = new Map<string, CartItem[]>()
  for (const item of items) {
    const arr = groups.get(item.file) ?? []
    arr.push(item)
    groups.set(item.file, arr)
  }

  async function applyAll() {
    const files: FileChange[] = [...groups.entries()].map(([path, its]) => ({
      path,
      build: (current) => its.reduce((text, it) => it.transform(text), current.text),
    }))
    const n = count
    const result = await submit(
      () =>
        proposeMultiChange({
          client,
          slug: 'batch',
          commitMessage: `config: batch update (${n} changes)`,
          prTitle: `config: batch update (${n} changes)`,
          prBody: [
            `**Batch changes** — ${n} operations, single PR, single apply.`,
            '',
            ...items.map((i) => `- ${i.detail}`),
            '',
            '---',
            '> This PR was opened from the management dashboard cart.',
          ].join('\n'),
          files,
        }),
      `${n} changes opened in a single PR`,
    )
    if (result) {
      clear()
      setOpen(false)
      navigate('/pr')
    }
  }

  return (
    <>
      <button
        type="button"
        className={batchMode ? 'btn btn-sm btn-primary' : 'btn btn-ghost btn-sm'}
        onClick={() => setBatchMode(!batchMode)}
        title={t('cart.toggleTitle')}
        aria-pressed={batchMode}
        style={{ gap: 'var(--sp-1)' }}
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 2 2 7l10 5 10-5-10-5Z" />
          <path d="m2 12 10 5 10-5" />
          <path d="m2 17 10 5 10-5" />
        </svg>
        {t('cart.batch')}{batchMode ? ' ✓' : ''}
      </button>

      {count > 0 && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setOpen(true)}
          aria-label={t('cart.cartAria', { n: count })}
        >
          {t('cart.cart')} {count}
        </button>
      )}

      {open && (
        <Modal
          title={t('cart.panelTitle', { n: count })}
          onClose={busy ? () => undefined : () => setOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-danger"
                onClick={clear}
                disabled={busy || count === 0}
              >
                {t('cart.clear')}
              </button>
              <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
                {t('cart.close')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void applyAll()}
                disabled={busy || count === 0}
              >
                {busy && <span className="spinner" aria-hidden="true" />}
                {t('cart.applyN', { n: count })}
              </button>
            </>
          }
        >
          <div className="stack" style={{ gap: 'var(--sp-4)' }}>
            <p className="subtle" style={{ margin: 0 }}>
              {t('cart.intro')}
            </p>
            {count === 0 ? (
              <p className="subtle">{t('cart.empty')}</p>
            ) : (
              [...groups.entries()].map(([file, its]) => (
                <section key={file} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
                  <div className="meta-label">
                    <code>{shortPath(file)}</code> · {t('cart.changesN', { n: its.length })}
                  </div>
                  {its.map((item) => (
                    <div key={item.id} className="row-between">
                      <span style={{ fontSize: 'var(--text-sm)' }}>{item.summary}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label={t('cart.removeItem')}
                        onClick={() => remove(item.id)}
                        disabled={busy}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </section>
              ))
            )}
          </div>
        </Modal>
      )}
    </>
  )
}
