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
  LOGIN_NOT_POSSIBLE: 'We could not send a code with that information. Check it and try again.',
  EMAIL_SHARED: 'That email belongs to more than one member. Enter your DNI or member number instead.',
  NO_EMAIL_ON_FILE: 'The club has no email on file for you. Please contact the club.',
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
        state: { notice: 'Your account is not activated yet. Activate it to log in.' },
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
            submitLabel="Log in"
          />
        ) : (
          <>
            <Link to="/sign-in" className={styles.back} aria-label="Back">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>

            <h1 className={styles.title}>Member Login</h1>

            {notice && <p className={styles.message} role="status">{notice}</p>}

            <IdentifierStep
              label="DNI, member number or email"
              placeholder="30111222"
              submitLabel="Send code"
              request={requestMemberLogin}
              onSent={setSent}
              errorMessage={errorMessage}
              isValid={(value) => isNumberIdentifier(value) || isEmail(value)}
              invalidMessage="Enter a valid DNI, member number or email"
            />
          </>
        )}

        <p className={styles.switch}>
          First time? <Link to="/sign-up" className={styles.switchLink}>Activate your account</Link>
        </p>
      </section>
    </main>
  )
}

export default MemberSignIn
