import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useOutletContext } from 'react-router'
import { formatNumber, withUnit } from '../services/formula.js'
import {
  EMPTY_RANKING,
  getRulesSimulation,
  rulesSimulationErrorMessage,
  simulateRules,
} from '../services/rulesSimulation.js'
import authStyles from './Auth.module.css'
import formulaStyles from './Formula.module.css'
import pageStyles from './Page.module.css'
import styles from './RulesSimulation.module.css'

// El back acepta coma o punto: se muestra con coma, como en el resto de la app.
function toInput(values) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).replace('.', ',')]))
}

function normalize(value) {
  return String(value ?? '')
    .trim()
    .replaceAll(',', '.')
}

function sameValues(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)])
  return [...keys].every((key) => normalize(a[key]) === normalize(b[key]))
}

// HU-29: el Admin prueba valores hipotéticos de los parámetros. Al simular, el resultado se abre en
// su propia pantalla (RulesSimulationResult). Nada se guarda en el back: para hacerlos oficiales hay
// que ajustar la fórmula (HU-28).
function RulesSimulation() {
  const navigate = useNavigate()
  const { simulation, setSimulation } = useOutletContext()
  // La simulación con la que se entró al formulario (al volver desde el resultado).
  const [previous] = useState(simulation)
  // loading | no_baseline | error | ready
  const [state, setState] = useState({ status: 'loading' })
  const [values, setValues] = useState({})
  const [violations, setViolations] = useState([])
  const [simulating, setSimulating] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    getRulesSimulation()
      .then((data) => {
        if (!mounted.current) return
        setState({ status: 'ready', data })
        // Al volver desde el resultado para modificar, se retoman los valores que se simularon.
        setValues(previous?.result.ranking.id === data.ranking.id ? previous.values : toInput(data.values))
      })
      .catch((err) => {
        if (!mounted.current) return
        if (err.code === 'NO_BASELINE') setState({ status: 'no_baseline', message: err.reason })
        else setState({ status: 'error', message: rulesSimulationErrorMessage(err) })
      })
    return () => {
      mounted.current = false
    }
  }, [previous])

  const byParameter = Object.fromEntries(violations.filter((v) => v.parameter).map((v) => [v.parameter, v.message]))
  const general = violations.filter((v) => !v.parameter)

  function handleChange(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function replaceValues(next) {
    setValues(toInput(next))
    setViolations([])
    setError('')
  }

  async function handleSimulate(event) {
    event.preventDefault()
    const sent = { ...values }
    setSimulating(true)
    setError('')
    try {
      const result = await simulateRules(sent)
      if (!mounted.current) return
      setSimulation({
        id: Date.now(),
        result,
        values: sent,
        formula: state.data.formula,
      })
      navigate('/admin/rules-simulation/result')
    } catch (err) {
      if (!mounted.current) return
      setSimulating(false)
      if (err.code === 'INVALID_VALUES') {
        setViolations(err.violations ?? [])
        setError(err.reason)
      } else if (err.code === 'NO_BASELINE') {
        setState({ status: 'no_baseline', message: err.reason })
      } else {
        setViolations([])
        setError(err.code === 'EMPTY_RANKING' ? (err.reason ?? EMPTY_RANKING) : rulesSimulationErrorMessage(err))
      }
    }
  }

  const data = state.data
  const empty = data?.ranking.population_size === 0
  const differsFromRanking = data && !sameValues(values, data.values)

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Simular reglas</h1>
        <p className={pageStyles.lead}>
          Probá otros valores de los parámetros y mirá cómo cambiaría el ranking. No se guarda nada.
        </p>
      </header>

      {state.status === 'loading' && (
        <p className={formulaStyles.muted} role="status">
          Cargando…
        </p>
      )}
      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'no_baseline' && (
        <section className={formulaStyles.section}>
          <p className={formulaStyles.muted}>{state.message}</p>
          <Link to="/admin/ranking" className={`${authStyles.door} ${styles.inlineAction}`}>
            Ir a calcular el ranking
          </Link>
        </section>
      )}

      {state.status === 'ready' && (
        <>
          <p className={styles.baseline}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 20h16M7 20v-6M12 20V6M17 20v-10" />
            </svg>
            <span>{data.baseline_text}</span>
          </p>

          {empty ? (
            <p className={formulaStyles.banner} role="status">
              {EMPTY_RANKING}
            </p>
          ) : (
            <>
              {data.rules_in_force.differs && (
                <div className={styles.info} role="status">
                  <p>{data.rules_in_force.notice}</p>
                  <button
                    type="button"
                    className={authStyles.doorSecondary}
                    onClick={() => replaceValues(data.rules_in_force.values)}
                  >
                    Cargar reglas vigentes
                  </button>
                </div>
              )}

              <ParametersForm
                formula={data.formula}
                values={values}
                byParameter={byParameter}
                general={general}
                error={error}
                simulating={simulating}
                onChange={handleChange}
                onSubmit={handleSimulate}
                onReset={differsFromRanking ? () => replaceValues(data.values) : null}
              />
            </>
          )}
        </>
      )}
    </main>
  )
}

function ParametersForm({ formula, values, byParameter, general, error, simulating, onChange, onSubmit, onReset }) {
  return (
    <form
      className={`${formulaStyles.section} ${formulaStyles.paramsForm}`}
      onSubmit={onSubmit}
      noValidate
      aria-labelledby="params-title"
    >
      <h2 id="params-title" className={formulaStyles.sectionTitle}>
        Parámetros
      </h2>
      {formula.constraints?.length > 0 && (
        <ul className={formulaStyles.list}>
          {formula.constraints.map((c) => (
            <li key={c.parameters.join('-')}>
              {c.label} tienen que sumar {formatNumber(c.total)}.
            </li>
          ))}
        </ul>
      )}

      {formula.parameters.map((p) => (
        <div key={p.key} className={`${authStyles.field} ${formulaStyles.param}`}>
          <label htmlFor={`param-${p.key}`} className={authStyles.label}>
            {p.name}
            {p.unit ? ` (${p.unit})` : ''}
          </label>
          <p className={formulaStyles.hint} id={`hint-${p.key}`}>
            {p.description} Entre {withUnit(p.minimum, p.unit)} y {withUnit(p.maximum, p.unit)}.
          </p>
          <input
            id={`param-${p.key}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={values[p.key] ?? ''}
            onChange={(event) => onChange(p.key, event.target.value)}
            aria-invalid={byParameter[p.key] ? 'true' : undefined}
            aria-describedby={`hint-${p.key}${byParameter[p.key] ? ` error-${p.key}` : ''}`}
            className={authStyles.input}
          />
          {byParameter[p.key] && (
            <p id={`error-${p.key}`} role="alert" className={authStyles.error}>
              {byParameter[p.key]}
            </p>
          )}
        </div>
      ))}

      {(error || general.length > 0) && (
        <div role="alert" className={authStyles.error}>
          {error && <p className={styles.errorTitle}>{error}</p>}
          {general.length > 0 && (
            <ul className={formulaStyles.violations}>
              {general.map((v) => (
                <li key={v.message}>{v.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className={formulaStyles.actions}>
        {onReset && (
          <button type="button" className={authStyles.doorSecondary} onClick={onReset} disabled={simulating}>
            Volver a los valores del ranking
          </button>
        )}
        <button type="submit" className={authStyles.button} disabled={simulating}>
          {simulating ? 'Simulando…' : 'Simular'}
        </button>
      </div>
    </form>
  )
}

export default RulesSimulation
