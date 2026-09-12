import { Link } from 'react-router-dom'

interface PersonProps {
  login: string
  size?: number
  /** If false, does not link to member page (e.g. form preview). */
  linked?: boolean
}

/** GitHub avatar + username. Avatar URL derived from login (no extra request). */
export function Person({ login, size = 22, linked = true }: PersonProps) {
  const content = (
    <>
      <img
        className="avatar"
        src={`https://github.com/${encodeURIComponent(login)}.png?size=64`}
        alt=""
        width={size}
        height={size}
        loading="lazy"
      />
      <span>{login}</span>
    </>
  )

  return linked ? (
    <Link className="person" to={`/uyeler/${encodeURIComponent(login)}`}>
      {content}
    </Link>
  ) : (
    <span className="person">{content}</span>
  )
}
