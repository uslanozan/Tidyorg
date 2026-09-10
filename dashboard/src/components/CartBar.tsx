import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from './Modal'
import { useClient } from '../hooks/useAuth'
import { useCart, type CartItem } from '../hooks/useCart'
import { useProposal } from '../hooks/useProposal'
import { proposeMultiChange, type FileChange } from '../services/configRepo'

/** 'terraform/config/repositories/odeme.yml' → 'repositories/odeme.yml' */
const shortPath = (p: string) => p.replace(/^terraform\/config\//, '')

/**
 * Header'daki toplu-mod anahtarı + değişiklik sepeti.
 *
 * Toplu mod AÇIK'ken mutasyonlar anında PR açmaz, sepete birikir. "Tek PR'da
 * uygula" tüm sepeti TEK PR + TEK apply olarak açar (proposeMultiChange). Aynı
 * dosyaya düşen öğeler sırayla bestelenir.
 */
export function CartBar() {
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
          commitMessage: `config: toplu güncelleme (${n} değişiklik)`,
          prTitle: `config: toplu güncelleme (${n} değişiklik)`,
          prBody: [
            `**Toplu değişiklik** — ${n} işlem, tek PR, tek apply.`,
            '',
            ...items.map((i) => `- ${i.detail}`),
            '',
            '---',
            '> Bu PR yönetim panelinin sepetinden açıldı.',
          ].join('\n'),
          files,
        }),
      `${n} değişiklik tek PR'da açıldı`,
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
        title="Toplu mod: açıkken işlemler sepete birikir, hepsi tek PR + tek apply olur"
        aria-pressed={batchMode}
      >
        🧺 Toplu{batchMode ? ' ✓' : ''}
      </button>

      {count > 0 && (
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => setOpen(true)}
          aria-label={`Değişiklik sepeti: ${count} işlem`}
        >
          Sepet {count}
        </button>
      )}

      {open && (
        <Modal
          title={`Değişiklik sepeti — ${count} işlem`}
          onClose={busy ? () => undefined : () => setOpen(false)}
          footer={
            <>
              <button
                type="button"
                className="btn btn-danger"
                onClick={clear}
                disabled={busy || count === 0}
              >
                Sepeti boşalt
              </button>
              <button type="button" className="btn" onClick={() => setOpen(false)} disabled={busy}>
                Kapat
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void applyAll()}
                disabled={busy || count === 0}
              >
                {busy && <span className="spinner" aria-hidden="true" />}
                Tek PR'da uygula ({count})
              </button>
            </>
          }
        >
          <div className="stack" style={{ gap: 'var(--sp-4)' }}>
            <p className="subtle" style={{ margin: 0 }}>
              Tüm işlemler <strong>tek PR</strong>'da açılır; merge edilince{' '}
              <strong>tek apply</strong> ile uygulanır. Aynı dosyaya düşen değişiklikler
              birleştirilir.
            </p>
            {count === 0 ? (
              <p className="subtle">Sepet boş.</p>
            ) : (
              [...groups.entries()].map(([file, its]) => (
                <section key={file} className="card card-pad stack" style={{ gap: 'var(--sp-2)' }}>
                  <div className="meta-label">
                    <code>{shortPath(file)}</code> · {its.length} değişiklik
                  </div>
                  {its.map((item) => (
                    <div key={item.id} className="row-between">
                      <span style={{ fontSize: 'var(--text-sm)' }}>{item.summary}</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        aria-label="Sepetten çıkar"
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
