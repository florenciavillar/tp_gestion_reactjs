import { useState } from 'react'
import { Link } from 'react-router'
import { createAdmin } from '../services/auth.js'
import styles from './Auth.module.css'
import pageStyles from './Page.module.css'

const ERRORS = {
  EMAILS_DO_NOT_MATCH: 'Los emails no coinciden',
  ACCOUNT_ALREADY_EXISTS: 'Ya existe una cuenta de admin con este email.',
  INVITATION_PENDING: 'Este email ya tiene una invitación pendiente. Vence a las 48 horas de enviada.',
  FORBIDDEN: 'Solo los admins pueden invitar a otros admins.',
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
      else if (err.status === 422) setError('Ingresá un nombre y un email válidos')
      else setError('Algo salió mal. Probá de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={`${pageStyles.page} ${pageStyles.single}`}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Invitar admin</h1>
      </header>

      <section className={pageStyles.card}>
        {sentTo && (
          <p className={styles.notice} role="status">
            Enviamos la invitación a <strong>{sentTo}</strong>. El link vence en 48 horas.
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name" className={styles.label}>
              Nombre
            </label>
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
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="ejemplo@gmail.com"
              autoComplete="off"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="emailConfirmation" className={styles.label}>
              Confirmá el email
            </label>
            <input
              id="emailConfirmation"
              name="emailConfirmation"
              type="email"
              placeholder="ejemplo@gmail.com"
              autoComplete="off"
              required
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'invite-error' : undefined}
              className={styles.input}
            />
            {error && (
              <p id="invite-error" role="alert" className={styles.error}>
                {error}
              </p>
            )}
          </div>

          <button type="submit" className={styles.button} disabled={submitting}>
            {submitting ? 'Enviando…' : 'Enviar invitación'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default InviteAdmin
