import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import CodeStep from '../components/CodeStep.jsx'
import IdentifierStep from '../components/IdentifierStep.jsx'
import Logo from '../components/Logo.jsx'
import { requestMemberActivation, verifyMemberActivation } from '../services/auth.js'
import { isNumberIdentifier } from '../services/identifiers.js'
import styles from './Auth.module.css'

const ERRORS = {
  MEMBER_NOT_FOUND: 'We could not find that DNI or member number',
  FEES_OVERDUE: 'Your account cannot be activated because your fees are pending. Please contact the club.',
  NO_EMAIL_ON_FILE: 'The club has no email on file for you. Please contact the club to activate your account.',
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
        state: { notice: 'Your account is already activated. Log in to continue.' },
      })
      return null
    }
    return ERRORS[err.code]
  }

  async function handleVerify(code) {
    await verifyMemberActivation(sent.challenge, code)
    navigate('/sign-in/member', {
      replace: true,
      state: { notice: 'Your account is activated. Log in with your DNI, member number or email.' },
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
            submitLabel="Activate account"
          />
        ) : (
          <>
            <Link to="/sign-in" className={styles.back} aria-label="Back">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>

            <h1 className={styles.title}>Member Account Activation</h1>

            {notice && <p className={styles.message} role="status">{notice}</p>}

            <IdentifierStep
              label="Enter your DNI or member number"
              placeholder="30111222"
              submitLabel="Activate"
              request={requestMemberActivation}
              onSent={setSent}
              errorMessage={errorMessage}
              isValid={isNumberIdentifier}
              invalidMessage="Enter a valid DNI or member number (numbers only)"
            />
          </>
        )}

        <p className={styles.switch}>
          Already activated? <Link to="/sign-in/member" className={styles.switchLink}>Log in</Link>
        </p>
      </section>
    </main>
  )
}

export default SignUp
