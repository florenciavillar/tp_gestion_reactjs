import { useState } from 'react'
import { waitMessage } from '../services/messages.js'
import styles from '../pages/Auth.module.css'

// Primer paso de la activación y del login de socio: el identificador en un solo campo.
// Si coincide con socios distintos según el tipo (por ejemplo, el DNI de uno y el número de otro),
// el backend pide elegir el tipo y se muestra la elección.
// - request(identifier, type): pide el código; devuelve { challenge, email_hint }.
// - onSent({ identifier, type, challenge, emailHint }): pasa al paso del código.
// - isValid(value) / invalidMessage: formato aceptado, verificado antes de buscar (HU-01).
// - errorMessage(err): mensaje para los errores propios de la pantalla; null si ya los manejó.
function IdentifierStep({ label, placeholder, submitLabel, request, onSent, errorMessage, isValid, invalidMessage }) {
  const [identifier, setIdentifier] = useState('')
  const [askType, setAskType] = useState(false)
  const [type, setType] = useState('dni')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const value = identifier.trim()
    const chosenType = askType ? type : undefined
    if (!isValid(value)) {
      setError(invalidMessage)
      return
    }
    setSubmitting(true)
    setError('')

    try {
      const { challenge, email_hint } = await request(value, chosenType)
      onSent({ identifier: value, type: chosenType, challenge, emailHint: email_hint })
    } catch (err) {
      if (err.code === 'INVALID_IDENTIFIER') {
        setError(invalidMessage)
      } else if (err.code === 'IDENTIFIER_TYPE_REQUIRED') {
        setAskType(true)
        setError('Ese número coincide con más de un socio. Indicanos cuál es.')
      } else {
        const message = errorMessage(err)
        if (message !== null) {
          setError(message ?? waitMessage(err) ?? 'Algo salió mal. Probá de nuevo.')
        }
      }
      setSubmitting(false)
    }
  }

  function handleChange(event) {
    setIdentifier(event.target.value)
    setAskType(false)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="identifier" className={styles.label}>{label}</label>
        <input
          id="identifier"
          name="identifier"
          type="text"
          placeholder={placeholder}
          value={identifier}
          onChange={handleChange}
          required
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'identifier-error' : undefined}
          className={styles.input}
        />
        {error && <p id="identifier-error" role="alert" className={styles.error}>{error}</p>}
      </div>

      {askType && (
        <fieldset className={styles.choices}>
          <legend className={styles.label}>Este número es mi…</legend>
          <label className={styles.choice}>
            <input type="radio" name="type" value="dni" checked={type === 'dni'} onChange={() => setType('dni')} />
            DNI
          </label>
          <label className={styles.choice}>
            <input
              type="radio"
              name="type"
              value="member_id"
              checked={type === 'member_id'}
              onChange={() => setType('member_id')}
            />
            Número de socio
          </label>
        </fieldset>
      )}

      <button type="submit" className={styles.button} disabled={submitting}>
        {submitting ? 'Enviando código…' : submitLabel}
      </button>
    </form>
  )
}

export default IdentifierStep
