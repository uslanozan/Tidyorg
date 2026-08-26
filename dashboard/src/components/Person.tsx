import { Link } from 'react-router-dom'

interface PersonProps {
  login: string
  size?: number
  /** false verilirse üye sayfasına link verilmez (örn. form önizlemesi). */
  linked?: boolean
}

/** GitHub avatarı + kullanıcı adı. Avatar URL'i login'den türetilir (ek istek yok). */
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
