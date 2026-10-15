import { useState } from 'react'
import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import PasswordInput from '../components/PasswordInput.jsx'
import { activateMembership } from '../services/auth.js'
import styles from './Auth.module.css'

// Alta de socio en dos pasos: primero se valida el ID o número de socio, después se crea la cuenta.
function SignUp() {
  const [membershipNumber, setMembershipNumber] = useState('')
  const [activated, setActivated] = useState(false)

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        {activated ? (
          <AccountStep membershipNumber={membershipNumber} onBack={() => setActivated(false)} />
        ) : (
          <ActivationStep
            membershipNumber={membershipNumber}
            onChange={setMembershipNumber}
            onActivated={() => setActivated(true)}
          />
        )}

        <p className={styles.switch}>
          Already have an account? <Link to="/sign-in" className={styles.switchLink}>Sign In</Link>
        </p>
      </section>
    </main>
  )
}

function ActivationStep({ membershipNumber, onChange, onActivated }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const { valid } = await activateMembership(membershipNumber.trim())
      if (valid) {
        onActivated()
      } else {
        setError('We could not find that ID or membership number')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <h1 className={styles.title}>Member Account Activation</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="membershipNumber" className={styles.label}>
            Enter your ID or membership number
          </label>
          <input
            id="membershipNumber"
            name="membershipNumber"
            type="text"
            placeholder="123456"
            value={membershipNumber}
            onChange={(event) => onChange(event.target.value)}
            required
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'activation-error' : undefined}
            className={styles.input}
          />
          {error && (
            <p id="activation-error" role="alert" className={styles.error}>{error}</p>
          )}
        </div>

        <button type="submit" className={styles.button} disabled={submitting}>
          {submitting ? 'Activating…' : 'Activate'}
        </button>
      </form>
    </>
  )
}

function AccountStep({ membershipNumber, onBack }) {
  const [error, setError] = useState('')

  function handleSubmit(event) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)

    if (data.get('password') !== data.get('confirmPassword')) {
      setError('Passwords do not match')
      return
    }

    setError('')
    // TODO: llamar al backend cuando exista el endpoint de registro, enviando membershipNumber
    console.debug('Sign up for membership', membershipNumber)
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack} aria-label="Back to activation">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className={styles.title}>Sign Up</h1>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>Name</label>
          <input
            id="name"
            name="name"
            type="text"
            placeholder="Lionel Messi"
            autoComplete="name"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label}>Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="example@gmail.com"
            autoComplete="email"
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <PasswordInput
            id="password"
            name="password"
            placeholder="********"
            autoComplete="new-password"
            minLength={8}
            required
            className={styles.input}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
          <PasswordInput
            id="confirmPassword"
            name="confirmPassword"
            placeholder="********"
            autoComplete="new-password"
            required
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'sign-up-error' : undefined}
            className={styles.input}
          />
          {error && (
            <p id="sign-up-error" role="alert" className={styles.error}>{error}</p>
          )}
        </div>

        <button type="submit" className={styles.button}>Sign Up</button>
      </form>
    </>
  )
}

export default SignUp
