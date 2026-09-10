import { useMemo } from 'react'
import { EmptyState, ErrorState, Skeleton } from '../components/States'
import { useConfig } from '../hooks/useProjects'

type MemberRole = 'mentor' | 'developer' | 'viewer' | 'admin'

const ROLE_COLOR: Record<MemberRole, string> = {
  mentor: '#d97706',
  developer: '#64748b',
  viewer: '#0891b2',
  admin: '#dc2626',
}

const ROLE_LABEL: Record<MemberRole, string> = {
  mentor: 'Mentör (admin)',
  developer: 'Developer (push)',
  viewer: 'Viewer (pull)',
  admin: 'Org admin',
}

interface TeamMember {
  login: string
  role: MemberRole
}

interface Team {
  id: string
  hub: string
  members: TeamMember[]
}

const avatar = (login: string) => `https://github.com/${encodeURIComponent(login)}.png?size=80`
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)

/** Hub-and-spoke küme: merkezde takım, çevrede üyeler (avatar + rol rengi). */
function TeamCluster({ team }: { team: Team }) {
  const S = 300
  const cx = S / 2
  const cy = S / 2
  const n = team.members.length
  const R = n <= 1 ? 0 : Math.min(108, 58 + n * 7)

  const nodes = team.members.map((m, i) => {
    const angle = n ? (2 * Math.PI * i) / n - Math.PI / 2 : 0
    return { ...m, i, x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) }
  })

  return (
    <svg
      viewBox={`0 0 ${S} ${S}`}
      role="img"
      aria-label={`${team.hub} takımı, ${n} üye`}
      style={{ width: '100%', height: 'auto' }}
    >
      <defs>
        {nodes.map((node) => (
          <clipPath id={`clip-${team.id}-${node.i}`} key={node.i}>
            <circle cx={node.x} cy={node.y} r={17} />
          </clipPath>
        ))}
      </defs>

      {nodes.map((node) => (
        <line
          key={`spoke-${node.i}`}
          x1={cx}
          y1={cy}
          x2={node.x}
          y2={node.y}
          stroke="var(--border)"
          strokeWidth={1.5}
        />
      ))}

      {nodes.map((node) => (
        <g key={node.login}>
          <circle
            cx={node.x}
            cy={node.y}
            r={19}
            fill="var(--surface-sunken)"
            stroke={ROLE_COLOR[node.role]}
            strokeWidth={2.5}
          />
          <image
            href={avatar(node.login)}
            x={node.x - 17}
            y={node.y - 17}
            width={34}
            height={34}
            clipPath={`url(#clip-${team.id}-${node.i})`}
            preserveAspectRatio="xMidYMid slice"
          />
          <text
            x={node.x}
            y={node.y + 33}
            textAnchor="middle"
            fontSize="10"
            fill="var(--fg-muted)"
          >
            {clip(node.login, 12)}
          </text>
        </g>
      ))}

      <circle cx={cx} cy={cy} r={40} fill="var(--surface)" stroke="var(--border)" strokeWidth={2} />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="11"
        fontWeight={700}
        fill="var(--fg)"
      >
        {clip(team.hub, 15)}
      </text>
    </svg>
  )
}

export function Teams() {
  const { projects, org, privileged, loading, error, reload } = useConfig()

  const teams = useMemo<Team[]>(() => {
    const result: Team[] = []

    // Org yönetim takımı (head-of-engineering taşıyıcıları).
    const adminTeam = org?.org_admin_team ?? 'platform-admins'
    const admins = privileged?.roles?.['head-of-engineering'] ?? []
    if (admins.length) {
      result.push({
        id: 'admins',
        hub: adminTeam,
        members: admins.map((login) => ({ login, role: 'admin' as const })),
      })
    }

    // Repo başına takım: mentörler (admin) + developer'lar (push).
    for (const project of projects) {
      const members: TeamMember[] = [
        ...(project.config.mentors ?? []).map((login) => ({ login, role: 'mentor' as const })),
        ...(project.config.developers ?? []).map((login) => ({
          login,
          role: 'developer' as const,
        })),
        ...(project.config.viewers ?? []).map((login) => ({ login, role: 'viewer' as const })),
      ]
      result.push({ id: project.name, hub: project.name, members })
    }

    return result
  }, [projects, org, privileged])

  return (
    <div className="stack" style={{ gap: 'var(--sp-2)' }}>
      <div className="page-header">
        <div>
          <h1>Takımlar</h1>
          <p>
            {loading
              ? 'Konfigürasyon okunuyor…'
              : 'Her repo bir takım — mentörler admin, developer\'lar push. Config\'ten türetildi.'}
          </p>
        </div>
        <div className="row" style={{ gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
          {(['mentor', 'developer', 'viewer', 'admin'] as MemberRole[]).map((r) => (
            <span key={r} className="badge">
              <span className="badge-dot" style={{ background: ROLE_COLOR[r] }} aria-hidden="true" />
              {ROLE_LABEL[r]}
            </span>
          ))}
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={() => void reload()} />
      ) : loading ? (
        <div className="grid-cards">
          {[0, 1, 2].map((i) => (
            <div className="card card-pad" key={i}>
              <Skeleton height={280} />
            </div>
          ))}
        </div>
      ) : teams.length === 0 ? (
        <EmptyState icon="🕸️" title="Takım yok" description="Config'te repo/takım bulunamadı." />
      ) : (
        <div className="grid-cards">
          {teams.map((team) => (
            <div className="card card-pad stack" key={team.id} style={{ gap: 'var(--sp-2)' }}>
              {team.members.length === 0 ? (
                <p className="subtle" style={{ textAlign: 'center', padding: 'var(--sp-8) 0' }}>
                  <strong>{team.hub}</strong>
                  <br />
                  üye yok
                </p>
              ) : (
                <TeamCluster team={team} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
