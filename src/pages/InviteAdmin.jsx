import { useState } from 'react'
import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import { createAdmin } from '../services/auth.js'
import styles from './Auth.module.css'

const ERRORS = {
  EMAILS_DO_NOT_MATCH: 'The emails do not match',
  ACCOUNT_ALREADY_EXISTS: 'There is already an admin account with this email.',
  INVITATION_PENDING: 'This email already has a pending invitation. It expires 48 hours after it was sent.',
  FORBIDDEN: 'Only admins can invite other admins.',
}

// Solo admins (HU-07): crea la cuenta pendiente y manda la invitación. El email se escribe dos
// veces porque quien reciba el link activa la cuenta.
function InviteAdmin() {
  const [sentTo, setSentTo] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const email = data.get('email').trim()
    const emailConfirmation = data.get('emailConfirmation').trim()
    setSentTo('')

    if (email.toLowerCase() !== emailConfirmation.toLowerCase()) {
      setError(ERRORS.EMAILS_DO_NOT_MATCH)
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const created = await createAdmin({ name: data.get('name'), email, emailConfirmation })
      setSentTo(created.email)
      form.reset()
    } catch (err) {
      if (ERRORS[err.code]) setError(ERRORS[err.code])
      else if (err.status === 422) setError('Enter a valid name and email')
      else setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <Link to="/" className={styles.back} aria-label="Back to home">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <h1 className={styles.title}>Invite Admin</h1>

        {sentTo && (
          <p className={styles.message} role="status">
            Invitation sent to <strong>{sentTo}</strong>. The link expires in 48 hours.
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Lionel Messi"
              autoComplete="off"
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
              autoComplete="off"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="emailConfirmation" className={styles.label}>Confirm email</label>
            <input
              id="emailConfirmation"
              name="emailConfirmation"
              type="email"
              placeholder="example@gmail.com"
              autoComplete="off"
              required
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'invite-error' : undefined}
              className={styles.input}
            />
            {error && <p id="invite-error" role="alert" className={styles.error}>{error}</p>}
          </div>

          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? 'Sending…' : 'Send invitation'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default InviteAdmin
