import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import Logo from '../components/Logo.jsx'
import { acceptAdminInvitation } from '../services/auth.js'
import styles from './Auth.module.css'

const ASK_AGAIN = 'Pedile a un admin que te mande una invitación nueva.'

const ERRORS = {
  INVALID_TOKEN: `Este link no es válido. ${ASK_AGAIN}`,
  TOKEN_USED: 'Este link ya se usó. Tu cuenta está activa: ingresá con tu email.',
  TOKEN_EXPIRED: `Este link venció. ${ASK_AGAIN}`,
  TOKEN_REPLACED: `Este link fue reemplazado por una invitación más nueva. Usá el último email o ${ASK_AGAIN.toLowerCase()}`,
}

// Link de la invitación de admin (HU-08): abrirlo activa la cuenta, sin formulario.
function AdminInvitation() {
  const navigate = useNavigate()
  const token = useSearchParams()[0].get('token')
  const [error, setError] = useState(token ? '' : ERRORS.INVALID_TOKEN)
  // La activación es de un solo uso: en desarrollo, StrictMode corre el efecto dos veces.
  const started = useRef(false)

  useEffect(() => {
    if (!token || started.current) return
    started.current = true
    acceptAdminInvitation(token)
      .then(({ email_hint }) => {
        navigate('/sign-in/admin', {
          replace: true,
          state: { notice: `Tu cuenta de admin (${email_hint}) está activa. Ingresá con tu email.` },
        })
      })
      .catch((err) => setError(ERRORS[err.code] ?? 'Algo salió mal. Probá de nuevo.'))
  }, [token, navigate])

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <h1 className={styles.title}>Invitación de admin</h1>

        {error ? (
          <>
            <p className={styles.error} role="alert">
              {error}
            </p>
            <Link to="/sign-in/admin" className={styles.forgot}>
              Ir al ingreso de admins
            </Link>
          </>
        ) : (
          <p className={styles.message} role="status">
            Activando tu cuenta…
          </p>
        )}
      </section>
    </main>
  )
}

export default AdminInvitation
