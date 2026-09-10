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
import { useT } from '../i18n'

const STEPS = ['repoInfo', 'language', 'team'] as const

export function NewProject() {
  const t = useT()
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
  const [autoInit, setAutoInit] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const existingNames = useMemo(() => projects.map((project) => project.name), [projects])

  const draft: RepoConfig = {
    description: description.trim(),
    language,
    mentors,
    developers,
    // auto_init yalnızca varsayılandan farklıysa (false) yazılır — boş repo,
    // mevcut kod push'lanacak senaryosu.
    ...(autoInit ? {} : { auto_init: false }),
  }

  const preview = useMemo(
    () => serializeRepoConfig(draft),
    [description, language, mentors, developers, autoInit],
  )

  if (!isHeadOfEngineering(user?.login ?? '', privileged)) {
    return (
      <EmptyState
        icon="🔒"
        title={t('newProject.denied.title')}
        description={t('newProject.denied.desc')}
        action={
          <Link className="btn" to="/">
            {t('newProject.denied.back')}
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
      return setError(t('newProject.mentorRequired'))
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
          {t('newProject.backLink')}
        </Link>
        <h1 style={{ marginTop: 'var(--sp-3)' }}>{t('newProject.title')}</h1>
        <p className="muted">{t('newProject.intro')}</p>
      </div>

      <div className="steps">
        {STEPS.map((title, index) => (
          <div key={title} style={{ display: 'contents' }}>
            {index > 0 && <span className="step-sep" aria-hidden="true" />}
            <div
              className={`step ${index === step ? 'current' : index < step ? 'done' : ''}`}
            >
              <span className="step-num">{index < step ? '✓' : index + 1}</span>
              <span>{t(`newProject.steps.${title}`)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="card card-pad stack">
        {step === 0 && (
          <>
            <div className="field">
              <label className="label" htmlFor="repo-name">
                {t('newProject.repoName')}
              </label>
              <input
                id="repo-name"
                className="input"
                value={name}
                autoComplete="off"
                placeholder={t('newProject.repoNamePlaceholder')}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                  setName(event.target.value)
                  setError(null)
                }}
              />
              <span className="hint">
                {t('newProject.nameHint')}{' '}
                <code>
                  {PATHS.repositories}/{name.trim() || '<ad>'}.yml
                </code>
              </span>
            </div>

            <div className="field">
              <label className="label" htmlFor="repo-description">
                {t('newProject.description')}
              </label>
              <textarea
                id="repo-description"
                className="textarea"
                value={description}
                placeholder={t('newProject.descriptionPlaceholder')}
                onChange={(event) => {
                  setDescription(event.target.value)
                  setError(null)
                }}
              />
            </div>

            <div className="field">
              <span className="label">{t('newProject.start')}</span>
              <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
                <button
                  type="button"
                  className={autoInit ? 'btn btn-primary' : 'btn'}
                  onClick={() => setAutoInit(true)}
                  aria-pressed={autoInit}
                >
                  {t('newProject.startWithCommit')}
                </button>
                <button
                  type="button"
                  className={!autoInit ? 'btn btn-primary' : 'btn'}
                  onClick={() => setAutoInit(false)}
                  aria-pressed={!autoInit}
                >
                  {t('newProject.emptyRepo')}
                </button>
              </div>
              <span className="hint">
                {t('newProject.startHint.s1')}
                <strong>{t('newProject.startHint.b1')}</strong>
                {t('newProject.startHint.s2')}
                <code>git push --mirror</code>
                {t('newProject.startHint.s3')}
              </span>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="field">
            <span className="label">{t('newProject.languageLabel')}</span>
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
            <span className="hint">{t('newProject.languageHint')}</span>
          </div>
        )}

        {step === 2 && (
          <div className="stack" style={{ gap: 'var(--sp-5)' }}>
            <MemberPicker
              label={t('newProject.mentorsLabel')}
              all={people?.members ?? []}
              selected={mentors}
              onChange={setMentors}
              exclude={developers}
              hint={t('newProject.mentorsHint')}
            />
            <MemberPicker
              label={t('newProject.developersLabel')}
              all={people?.members ?? []}
              selected={developers}
              onChange={setDevelopers}
              exclude={mentors}
              hint={t('newProject.developersHint')}
            />
          </div>
        )}

        {step === 3 && (
          <div className="stack">
            <h3>{t('newProject.preview')}</h3>
            <p className="subtle">
              {t('newProject.previewFile')}{' '}
              <code>
                {PATHS.repositories}/{name.trim()}.yml
              </code>
            </p>

            <div className="row" style={{ flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              <LanguageBadge language={language} />
              <span className="badge">{t('newProject.mentorCount', { n: mentors.length })}</span>
              <span className="badge">{t('newProject.developerCount', { n: developers.length })}</span>
            </div>

            <pre className="code-block">{preview}</pre>

            <p className="subtle">{t('newProject.previewPr')}</p>
            <p className="hint">
              {t('newProject.previewHint.s1')}
              <strong>⚙ {t('newProject.previewHint.settings')}</strong>
              {t('newProject.previewHint.s2')}
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
            {t('newProject.back')}
          </button>

          {step < STEPS.length ? (
            <button type="button" className="btn btn-primary" onClick={next}>
              {t('newProject.next')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void create()}
              disabled={busy}
            >
              {busy && <span className="spinner" aria-hidden="true" />}
              {t('newProject.create')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
