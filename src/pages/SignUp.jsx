import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import CodeStep from '../components/CodeStep.jsx'
import IdentifierStep from '../components/IdentifierStep.jsx'
import Logo from '../components/Logo.jsx'
import { requestMemberActivation, verifyMemberActivation } from '../services/auth.js'
import { isNumberIdentifier } from '../services/identifiers.js'
import styles from './Auth.module.css'

const ERRORS = {
  MEMBER_NOT_FOUND: 'No encontramos ese DNI o número de socio',
  FEES_OVERDUE: 'No podés activar tu cuenta porque tenés cuotas pendientes. Comunicate con el club.',
  NO_EMAIL_ON_FILE: 'El club no tiene un email tuyo registrado. Comunicate con el club para activar tu cuenta.',
}

// Activación de la cuenta de socio (HU-01): DNI o número de socio, y después el código que llega
// al email que el club tiene registrado. No hay contraseña: después se entra con código (HU-05).
function SignUp() {
  const navigate = useNavigate()
  const notice = useLocation().state?.notice
  const [sent, setSent] = useState(null)

  function errorMessage(err) {
    if (err.code === 'ACCOUNT_ALREADY_ACTIVATED') {
      navigate('/sign-in/member', {
        state: { notice: 'Tu cuenta ya está activada. Ingresá para continuar.' },
      })
      return null
    }
    return ERRORS[err.code]
  }

  async function handleVerify(code) {
    await verifyMemberActivation(sent.challenge, code)
    navigate('/sign-in/member', {
      replace: true,
      state: { notice: 'Tu cuenta está activada. Ingresá con tu DNI, número de socio o email.' },
    })
  }

  async function handleResend() {
    const { challenge, email_hint } = await requestMemberActivation(sent.identifier, sent.type)
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
            submitLabel="Activar cuenta"
          />
        ) : (
          <>
            <Link to="/sign-in" className={styles.back} aria-label="Volver">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>

            <h1 className={styles.title}>Activá tu cuenta de socio</h1>

            {notice && (
              <p className={styles.message} role="status">
                {notice}
              </p>
            )}

            <IdentifierStep
              label="Ingresá tu DNI o número de socio"
              placeholder="30111222"
              submitLabel="Activar"
              request={requestMemberActivation}
              onSent={setSent}
              errorMessage={errorMessage}
              isValid={isNumberIdentifier}
              invalidMessage="Ingresá un DNI o número de socio válido"
            />
          </>
        )}

        <p className={styles.switch}>
          ¿Ya la activaste?{' '}
          <Link to="/sign-in/member" className={styles.switchLink}>
            Ingresá
          </Link>
        </p>
      </section>
    </main>
  )
}

export default SignUp
