import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import CodeStep from '../components/CodeStep.jsx'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../components/authContext.js'
import { requestAdminLogin, verifyAdminLogin } from '../services/auth.js'
import { waitMessage } from '../services/messages.js'
import styles from './Auth.module.css'

// Puerta de admins (HU-06): solo email, y después el código que llega por mail.
function AdminSignIn() {
  const navigate = useNavigate()
  const notice = useLocation().state?.notice
  const { startSession } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { challenge, email_hint } = await requestAdminLogin(email.trim())
      setSent({ challenge, emailHint: email_hint })
    } catch (err) {
      if (err.code === 'LOGIN_NOT_POSSIBLE') {
        // Mismo mensaje para un email desconocido o una cuenta sin activar (HU-06).
        setError('We could not send a code to that email. Check it and try again.')
      } else if (err.status === 422) {
        setError('Enter a valid email')
      } else {
        setError(waitMessage(err) ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVerify(code) {
    startSession(await verifyAdminLogin(sent.challenge, code))
    navigate('/', { replace: true })
  }

  async function handleResend() {
    const { challenge, email_hint } = await requestAdminLogin(email.trim())
    setSent({ challenge, emailHint: email_hint })
    return email_hint
  }

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        {sent ? (
          <CodeStep
            emailHint={sent.emailHint}
            onVerify={handleVerify}
            onResend={handleResend}
            onBack={() => setSent(null)}
            submitLabel="Log in"
          />
        ) : (
          <>
            <Link to="/sign-in" className={styles.back} aria-label="Back">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>

            <h1 className={styles.title}>Admin Login</h1>

            {notice && <p className={styles.message} role="status">{notice}</p>}

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="example@gmail.com"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? 'admin-login-error' : undefined}
                  className={styles.input}
                />
                {error && <p id="admin-login-error" role="alert" className={styles.error}>{error}</p>}
              </div>

              <button type="submit" className={styles.button} disabled={submitting}>
                {submitting ? 'Sending code…' : 'Send code'}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  )
}

export default AdminSignIn
