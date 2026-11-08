import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { getSimulatorSettings, simulatorErrorMessage, updateSimulatorSettings } from '../services/simulator.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'

const LOAD_ERROR = 'No pudimos cargar la configuración del simulador. Probá de nuevo en un rato.'
const SAVE_ERROR = 'No pudimos guardar la configuración. Probá de nuevo en un rato.'

// Los valores del form son texto (lo que escribe el Admin); el nivel se edita como porcentaje.
function toForm(settings) {
  return {
    enabled: settings.position_projection_enabled,
    level: String(Math.round(Number(settings.position_range_level) * 100)),
    prior: String(Number(settings.position_prior_strength)).replace('.', ','),
    minPopulation: String(settings.position_min_population),
  }
}

// Misma validación que el back: un valor inválido no se manda.
function validate(form) {
  const errors = {}
  if (!/^\d{1,2}$/.test(form.level) || Number(form.level) < 1)
    errors.level = 'Ingresá un porcentaje entero entre 1 y 99.'
  const prior = form.prior.replace(',', '.')
  if (!/^\d{1,4}(\.\d{1,2})?$/.test(prior) || Number(prior) <= 0)
    errors.prior = 'Ingresá un número mayor a 0, con hasta 4 enteros y 2 decimales.'
  if (!/^\d+$/.test(form.minPopulation) || Number(form.minPopulation) < 1)
    errors.minPopulation = 'Ingresá un entero mayor o igual a 1.'
  return errors
}

// Solo los campos que el Admin cambió respecto de lo cargado (el back no audita un PATCH sin cambios).
function diff(settings, form) {
  const changes = {}
  if (form.enabled !== settings.position_projection_enabled) changes.position_projection_enabled = form.enabled
  const level = (Number(form.level) / 100).toFixed(2)
  if (Number(level) !== Number(settings.position_range_level)) changes.position_range_level = level
  const prior = form.prior.replace(',', '.')
  if (Number(prior) !== Number(settings.position_prior_strength)) changes.position_prior_strength = prior
  const minPopulation = Number(form.minPopulation)
  if (minPopulation !== settings.position_min_population) changes.position_min_population = minPopulation
  return changes
}

// HU-18, escenario 14: configuración del simulador del club. Apagar la proyección no toca el ranking:
// solo hace que los socios vean únicamente los puntajes.
function SimulatorSettings() {
  const [state, setState] = useState({ status: 'loading' })
  const [form, setForm] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const ids = { enabled: useId(), level: useId(), prior: useId(), minPopulation: useId() }

  useEffect(() => {
    let ignore = false
    getSimulatorSettings()
      .then((settings) => {
        if (ignore) return
        setState({ status: 'ready', settings })
        setForm(toForm(settings))
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', message: simulatorErrorMessage(err, LOAD_ERROR) })
      })
    return () => {
      ignore = true
    }
  }, [])

  const settings = state.status === 'ready' ? state.settings : null
  const errors = form ? validate(form) : {}
  const valid = Object.keys(errors).length === 0
  const changes = settings && form && valid ? diff(settings, form) : {}
  const changed = Object.keys(changes).length > 0

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setNotice('')
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!valid || !changed) return
    setSubmitting(true)
    setError('')
    try {
      const saved = await updateSimulatorSettings(changes)
      setState({ status: 'ready', settings: saved })
      setForm(toForm(saved))
      setNotice('Guardamos la configuración. La próxima simulación ya usa los valores nuevos.')
    } catch (err) {
      setError(simulatorErrorMessage(err, SAVE_ERROR))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Simulador de puntaje</h1>
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando la configuración…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {settings && form && (
        <>
          <p className={pageStyles.lead}>
            Los socios pueden simular cuánto cambia su puntaje si van o no a un evento. En los partidos también ven una
            posición estimada, que podés ajustar o apagar acá.
          </p>
          <p className={styles.banner}>
            Con menos de {settings.position_min_population} socios en el ranking, los socios ven «No podemos estimar tu
            posición…» aunque la proyección esté encendida.
          </p>

          <form className={`${pageStyles.card} ${styles.paramsForm}`} onSubmit={handleSubmit} noValidate>
            <label htmlFor={ids.enabled} className={authStyles.choice}>
              <input
                id={ids.enabled}
                type="checkbox"
                checked={form.enabled}
                onChange={(e) => update('enabled', e.target.checked)}
              />
              Mostrar a los socios su posición estimada en los partidos
            </label>

            <Field
              id={ids.level}
              label="Nivel del rango probable (%)"
              hint="Entre 1 y 99. Por defecto, 80 %."
              value={form.level}
              error={errors.level}
              inputMode="numeric"
              onChange={(v) => update('level', v)}
            />
            <Field
              id={ids.prior}
              label="Peso del historial del club (k)"
              hint="Mayor a 0. Por defecto, 5."
              value={form.prior}
              error={errors.prior}
              inputMode="decimal"
              onChange={(v) => update('prior', v)}
            />
            <Field
              id={ids.minPopulation}
              label="Mínimo de socios en el ranking para estimar"
              hint="Entero mayor o igual a 1. Por defecto, 100."
              value={form.minPopulation}
              error={errors.minPopulation}
              inputMode="numeric"
              onChange={(v) => update('minPopulation', v)}
            />

            {error && (
              <p role="alert" className={authStyles.error}>
                {error}
              </p>
            )}
            {notice && (
              <p role="status" className={styles.notice}>
                {notice}
              </p>
            )}
            {valid && !changed && !notice && <p className={styles.hint}>No modificaste ningún valor.</p>}

            <div className={styles.actions}>
              <button type="submit" className={authStyles.button} disabled={submitting || !valid || !changed}>
                {submitting ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </form>
        </>
      )}
    </main>
  )
}

function Field({ id, label, hint, value, error, inputMode, onChange }) {
  const hintId = `${id}-hint`
  return (
    <div className={styles.param}>
      <label htmlFor={id} className={authStyles.label}>
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value.trim())}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={hintId}
        className={authStyles.input}
      />
      <p id={hintId} className={error ? authStyles.error : styles.hint}>
        {error ?? hint}
      </p>
    </div>
  )
}

export default SimulatorSettings
