import { useEffect, useState } from 'react'
import { waitMessage } from '../services/messages.js'
import styles from '../pages/Auth.module.css'

const RESEND_SECONDS = 60

const ERRORS = {
  INVALID_CODE: 'El código es incorrecto o venció. Podés pedir uno nuevo.',
  TOO_MANY_FAILED_ATTEMPTS: 'Demasiados intentos fallidos. Pedí un código nuevo en 15 minutos.',
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
      setError(ERRORS[err.code] ?? 'Algo salió mal. Probá de nuevo.')
      setSubmitting(false)
    }
  }

  async function handleResend() {
    setError('')
    setNotice('')
    try {
      setHint(await onResend())
      setCode('')
      setNotice('Te mandamos un código nuevo.')
      setResendIn(RESEND_SECONDS)
    } catch (err) {
      if (err.retryAfter) setResendIn(err.retryAfter)
      setError(waitMessage(err) ?? 'Algo salió mal. Probá de nuevo.')
    }
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack} aria-label="Volver">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </button>

      <h1 className={styles.title}>Ingresá tu código</h1>

      <p className={styles.message} role="status">
        {notice || (
          <>
            Te mandamos un código de 6 dígitos a <strong>{hint}</strong>. Vence en 10 minutos.
          </>
        )}
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="code" className={styles.label}>
            Código
          </label>
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
          {error && (
            <p id="code-error" role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </div>

        <button type="submit" className={styles.button} disabled={submitting || code.length !== 6}>
          {submitting ? 'Verificando…' : submitLabel}
        </button>
      </form>

      <button type="button" className={styles.linkButton} onClick={handleResend} disabled={resendIn > 0}>
        {resendIn > 0 ? `Reenviar código en ${resendIn}s` : 'Reenviar código'}
      </button>
    </>
  )
}

export default CodeStep
