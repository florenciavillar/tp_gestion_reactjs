import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import CodeStep from '../components/CodeStep.jsx'
import IdentifierStep from '../components/IdentifierStep.jsx'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../components/authContext.js'
import { requestMemberLogin, verifyMemberLogin } from '../services/auth.js'
import { isEmail, isNumberIdentifier } from '../services/identifiers.js'
import styles from './Auth.module.css'

const ERRORS = {
  LOGIN_NOT_POSSIBLE: 'No pudimos mandar un código con esos datos. Revisalos y probá de nuevo.',
  EMAIL_SHARED: 'Ese email es de más de un socio. Ingresá tu DNI o número de socio.',
  NO_EMAIL_ON_FILE: 'El club no tiene un email tuyo registrado. Comunicate con el club.',
}

// Puerta de socios (HU-05): DNI, número de socio o email, y después el código que llega por mail.
function MemberSignIn() {
  const navigate = useNavigate()
  const notice = useLocation().state?.notice
  const { startSession } = useAuth()
  const [sent, setSent] = useState(null)

  function errorMessage(err) {
    if (err.code === 'ACCOUNT_NOT_ACTIVATED') {
      navigate('/sign-up', {
        state: { notice: 'Tu cuenta todavía no está activada. Activala para ingresar.' },
      })
      return null
    }
    return ERRORS[err.code]
  }

  async function handleVerify(code) {
    startSession(await verifyMemberLogin(sent.challenge, code))
    navigate('/', { replace: true })
  }

  async function handleResend() {
    const { challenge, email_hint } = await requestMemberLogin(sent.identifier, sent.type)
    setSent({ ...sent, challenge })
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
            submitLabel="Ingresar"
          />
        ) : (
          <>
            <Link to="/sign-in" className={styles.back} aria-label="Volver">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>

            <h1 className={styles.title}>Ingreso Socios</h1>

            {notice && <p className={styles.message} role="status">{notice}</p>}

            <IdentifierStep
              label="DNI, número de socio o email"
              placeholder="30111222"
              submitLabel="Enviar código"
              request={requestMemberLogin}
              onSent={setSent}
              errorMessage={errorMessage}
              isValid={(value) => isNumberIdentifier(value) || isEmail(value)}
              invalidMessage="Ingresá un DNI, número de socio o email válido"
            />
          </>
        )}

        <p className={styles.switch}>
          ¿Primera vez? <Link to="/sign-up" className={styles.switchLink}>Activá tu cuenta</Link>
        </p>
      </section>
    </main>
  )
}

export default MemberSignIn
