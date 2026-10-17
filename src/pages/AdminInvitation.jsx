import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import Logo from '../components/Logo.jsx'
import { acceptAdminInvitation } from '../services/auth.js'
import styles from './Auth.module.css'

const ASK_AGAIN = 'Ask an admin to send you a new invitation.'

const ERRORS = {
  INVALID_TOKEN: `This link is not valid. ${ASK_AGAIN}`,
  TOKEN_USED: 'This link was already used. Your account is active: log in with your email.',
  TOKEN_EXPIRED: `This link has expired. ${ASK_AGAIN}`,
  TOKEN_REPLACED: `This link was replaced by a newer invitation. Use the latest email or ${ASK_AGAIN.toLowerCase()}`,
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
          state: { notice: `Your admin account (${email_hint}) is active. Log in with your email.` },
        })
      })
      .catch((err) => setError(ERRORS[err.code] ?? 'Something went wrong. Please try again.'))
  }, [token, navigate])

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <h1 className={styles.title}>Admin Invitation</h1>

        {error ? (
          <>
            <p className={styles.error} role="alert">{error}</p>
            <Link to="/sign-in/admin" className={styles.forgot}>Go to admin login</Link>
          </>
        ) : (
          <p className={styles.message} role="status">Activating your account…</p>
        )}
      </section>
    </main>
  )
}

export default AdminInvitation
