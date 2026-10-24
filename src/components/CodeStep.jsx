import { useEffect, useState } from 'react'
import { waitMessage } from '../services/messages.js'
import styles from '../pages/Auth.module.css'

const RESEND_SECONDS = 60

const ERRORS = {
  INVALID_CODE: 'The code is incorrect or expired. You can request a new one.',
  TOO_MANY_FAILED_ATTEMPTS: 'Too many failed attempts. Request a new code in 15 minutes.',
}

// Segundo paso de la activación y del login: el código de 6 dígitos que llegó por mail.
// - onVerify(code): verifica el código; si falla, tira el error del backend.
// - onResend(): pide otro código y devuelve el nuevo email_hint.
function CodeStep({ emailHint, onVerify, onResend, onBack, submitLabel }) {
  const [code, setCode] = useState('')
  const [hint, setHint] = useState(emailHint)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resendIn, setResendIn] = useState(RESEND_SECONDS)

  useEffect(() => {
    if (resendIn <= 0) return
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendIn])

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      await onVerify(code)
    } catch (err) {
      setError(ERRORS[err.code] ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setNotice('')
    try {
      setHint(await onResend())
      setCode('')
      setNotice('We sent you a new code.')
      setResendIn(RESEND_SECONDS)
    } catch (err) {
      if (err.retryAfter) setResendIn(err.retryAfter)
      setError(waitMessage(err) ?? 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack} aria-label="Back">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className={styles.title}>Enter your code</h1>

      <p className={styles.message} role="status">
        {notice || <>We sent a 6-digit code to <strong>{hint}</strong>. It expires in 10 minutes.</>}
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="code" className={styles.label}>Code</label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="\d{6}"
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            required
            autoFocus
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'code-error' : undefined}
            className={`${styles.input} ${styles.codeInput}`}
          />
          {error && <p id="code-error" role="alert" className={styles.error}>{error}</p>}
        </div>

        <button type="submit" className={styles.button} disabled={submitting || code.length !== 6}>
          {submitting ? 'Checking…' : submitLabel}
        </button>
      </form>

      <button
        type="button"
        className={styles.linkButton}
        onClick={handleResend}
        disabled={resendIn > 0}
      >
        {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
      </button>
    </>
  )
}

export default CodeStep
