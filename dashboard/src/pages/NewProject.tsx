import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LanguageBadge, languageLabel } from '../components/LanguageBadge'
import { MemberPicker } from '../components/MemberPicker'
import { EmptyState } from '../components/States'
import { useAuth, useClient } from '../hooks/useAuth'
import { useConfig } from '../hooks/useProjects'
import { useProposal } from '../hooks/useProposal'
import { isHeadOfEngineering, proposeNewProject } from '../services/configRepo'
import { PATHS } from '../services/env'
import { validateDescription, validateRepoName } from '../services/validation'
import { serializeRepoConfig } from '../services/yaml'
import { LANGUAGES, type Language, type RepoConfig } from '../types/config'

const STEPS = ['Repo bilgileri', 'Dil', 'Ekip'] as const

export function NewProject() {
  const { projects, privileged, people } = useConfig()
  const { user } = useAuth()
  const client = useClient()
  const { busy, submit } = useProposal()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState<Language>('typescript')
  const [mentors, setMentors] = useState<string[]>([])
  const [developers, setDevelopers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const existingNames = useMemo(() => projects.map((project) => project.name), [projects])

  const draft: RepoConfig = {
    description: description.trim(),
    language,
    mentors,
    developers,
  }

  const preview = useMemo(
    () => serializeRepoConfig(draft),
    [description, language, mentors, developers],
  )

  if (!isHeadOfEngineering(user?.login ?? '', privileged)) {
    return (
      <EmptyState
        icon="🔒"
        title="Bu sayfa head of engineering'lere açık"
        description="Yeni proje açma yetkisi organizasyon rolüne bağlıdır. Mentörler mevcut projelerine kişi ekleyebilir."
        action={
          <Link className="btn" to="/">
            Projelere dön
          </Link>
        }
      />
    )
  }

  function next() {
    setError(null)

    if (step === 0) {
      const nameError = validateRepoName(name.trim(), existingNames)
      if (nameError) return setError(nameError)
      const descriptionError = validateDescription(description)
      if (descriptionError) return setError(descriptionError)
    }

    if (step === 2 && mentors.length === 0) {
      return setError('Her repo\'nun en az bir mentörü olmalı.')
    }

    setStep((current) => Math.min(current + 1, STEPS.length))
  }

  async function create() {
    setError(null)
    // Üyeler zaten org üyesi (picker'dan) — ayrıca GitHub doğrulaması gerekmez.
    const result = await submit(
      () => proposeNewProject(client, name.trim(), draft),
      `${name.trim()} projesi oluşturuluyor`,
    )

    if (result) navigate('/pr')
  }

  return (
    <div className="stack" style={{ gap: 'var(--sp-6)', maxWidth: 720 }}>
      <div>
        <Link className="subtle" to="/">
          ← Projeler
        </Link>
        <h1 style={{ marginTop: 'var(--sp-3)' }}>Yeni proje</h1>
        <p className="muted">
          Form bir config dosyası üretir ve PR açar. Repo, PR merge edildikten sonra
          Terraform tarafından oluşturulur.
        </p>
      </div>

      <div className="steps">
        {STEPS.map((title, index) => (
          <div key={title} style={{ display: 'contents' }}>
            {index > 0 && <span className="step-sep" aria-hidden="true" />}
            <div
              className={`step ${index === step ? 'current' : index < step ? 'done' : ''}`}
            >
              <span className="step-num">{index < step ? '✓' : index + 1}</span>
              <span>{title}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card card-pad stack">
        {step === 0 && (
          <>
            <div className="field">
              <label className="label" htmlFor="repo-name">
                Repo adı
              </label>
              <input
                id="repo-name"
                className="input"
                value={name}
                autoComplete="off"
                placeholder="odeme-servisi"
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
              />
              <span className="hint">
                Küçük harf, rakam ve tire. Dosya adı da bu olur:{' '}
                <code>
                  {PATHS.repositories}/{name.trim() || '<ad>'}.yml
                </code>
              </span>
            </div>

            <div className="field">
              <label className="label" htmlFor="repo-description">
                Açıklama
              </label>
              <textarea
                id="repo-description"
                className="textarea"
                value={description}
                placeholder="Ödeme geçidi entegrasyon servisi"
                onChange={(event) => {
                  setDescription(event.target.value)
                  setError(null)
                }}
              />
            </div>
          </>
        )}

        {step === 1 && (
          <div className="field">
            <span className="label">Programlama dili</span>
            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
              {LANGUAGES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={language === item ? 'btn btn-primary' : 'btn'}
                  onClick={() => setLanguage(item)}
                  aria-pressed={language === item}
                >
                  {languageLabel(item)}
                </button>
              ))}
            </div>
            <span className="hint">
              Görsel etiket için; CI dili repo dosyalarından otomatik algılar.
            </span>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 'var(--sp-5)' }}>
            <MemberPicker
              label="Mentörler"
              all={people?.members ?? []}
              selected={mentors}
              onChange={setMentors}
              exclude={developers}
              hint="Repo'da admin yetkisi alır. En az bir mentör gerekli."
            />
            <MemberPicker
              label="Developer'lar"
              all={people?.members ?? []}
              selected={developers}
              onChange={setDevelopers}
              exclude={mentors}
              hint="Repo'da push yetkisi alır; branch protection'a tabi. (Opsiyonel)"
            />
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h3>Önizleme</h3>
            <p className="subtle">
              Şu dosya oluşturulacak:{' '}
              <code>
                {PATHS.repositories}/{name.trim()}.yml
              </code>
            </p>

            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <LanguageBadge language={language} />
              <span className="badge">{mentors.length} mentör</span>
              <span className="badge">{developers.length} developer</span>
            </div>

            <pre className="code-block">{preview}</pre>

            <p className="subtle">
              PR açılacak — merge edilene kadar GitHub'da hiçbir şey değişmez.
            </p>
            <p className="hint">
              Görünürlük, dal koruması, şablonlar ve workflow'lar org varsayılanlarını
              alır. Detaylı ayarları repo oluştuktan sonra projenin <strong>⚙ Ayarlar</strong>
              ekranından yapabilirsin.
            </p>
          </div>
        )}

        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}

        <div className="row-between" style={{ marginTop: 'var(--sp-4)' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setStep((current) => Math.max(0, current - 1))}
            disabled={step === 0 || busy}
          >
            Geri
          </button>

          {step < STEPS.length ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              Devam
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void create()}
              disabled={busy}
            >
              {busy && <span className="spinner" aria-hidden="true" />}
              Projeyi oluştur (PR aç)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
