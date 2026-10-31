import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import { formatDateTime } from '../services/eventFormat.js'
import {
  getLatestRun,
  getPreflight,
  isNoRunError,
  rankingErrorMessage,
  startRun,
} from '../services/ranking.js'
import authStyles from './Auth.module.css'
import styles from './RankingRun.module.css'

// HU-25: cálculo del ranking de socios. Solo admins.
function RankingRun() {
  const [run, setRun] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [checking, setChecking] = useState(false)
  // Advertencias previas al cálculo. null = no se está pidiendo confirmación.
  // { warnings, checked }: `checked` es false si no se pudo consultar el preflight.
  const [confirmation, setConfirmation] = useState(null)
  const [calculating, setCalculating] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let ignore = false
    getLatestRun()
      .then((result) => { if (!ignore) setRun(result) })
      .catch((err) => {
        if (ignore) return
        // Sin corridas todavía: se muestra el estado vacío, no un error.
        if (!isNoRunError(err)) setLoadError(rankingErrorMessage(err))
      })
      .finally(() => { if (!ignore) setLoaded(true) })
    return () => { ignore = true }
  }, [])

  async function refreshLatest() {
    try {
      setRun(await getLatestRun())
    } catch {
      // Se mantiene lo que ya estaba en pantalla.
    }
  }

  async function handleStart() {
    setConfirmation(null)
    setCalculating(true)
    setError(null)
    try {
      setRun(await startRun())
    } catch (err) {
      if (err.code === 'RANKING_RUN_IN_PROGRESS' || err.code === 'RANKING_RUN_FAILED') {
        // Ya había una corrida en curso, o el cálculo falló y quedó registrado:
        // el estado real está en la última corrida.
        await refreshLatest()
      } else {
        setError({ code: err.code, message: rankingErrorMessage(err) })
      }
    } finally {
      setCalculating(false)
    }
  }

  // Consulta las advertencias antes de calcular. Sin advertencias, calcula directo.
  async function handleCalculate() {
    setError(null)
    setChecking(true)
    let warnings = []
    let checked = true
    try {
      warnings = (await getPreflight()).warnings
    } catch {
      // Las advertencias no bloquean: si no se pudieron consultar, se avisa y se deja continuar.
      checked = false
    } finally {
      setChecking(false)
    }
    if (checked && warnings.length === 0) {
      await handleStart()
      return
    }
    setConfirmation({ warnings, checked })
  }

  const running = calculating || run?.status === 'running'
  const busy = running || checking || confirmation !== null

  let buttonLabel = 'Calcular ranking'
  if (checking) buttonLabel = 'Verificando datos…'
  else if (running) buttonLabel = 'Calculando…'

  return (
    <main className={authStyles.page}>
      <Logo />
      <section className={`${authStyles.card} ${styles.card}`}>
        <Link to="/" className={authStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={authStyles.title}>Ranking de socios</h1>

        {loadError && <p className={authStyles.error} role="alert">{loadError}</p>}
        {!loaded && <p className={authStyles.message}>Cargando…</p>}

        {loaded && !loadError && (
          <>
            <section className={styles.section} aria-labelledby="status-title">
              <h2 id="status-title" className={styles.sectionTitle}>Estado</h2>
              <div aria-live="polite">
                <RunStatus run={run} calculating={calculating} />
              </div>
            </section>

            <section className={styles.section} aria-labelledby="run-title">
              <h2 id="run-title" className={styles.sectionTitle}>Calcular</h2>
              <p className={styles.muted}>
                El cálculo usa las reglas vigentes y los datos cargados hasta ahora. Al terminar, el nuevo ranking reemplaza al anterior.
              </p>

              {confirmation && (
                <PreflightConfirmation
                  confirmation={confirmation}
                  onConfirm={handleStart}
                  onCancel={() => setConfirmation(null)}
                />
              )}

              {error && (
                <div role="alert">
                  <p className={authStyles.error}>{error.message}</p>
                  {error.code === 'FORMULA_NOT_PUBLISHED' && (
                    <Link to="/admin/formula" className={authStyles.switchLink}>
                      Ir a Fórmula
                    </Link>
                  )}
                </div>
              )}

              <button
                type="button"
                className={authStyles.button}
                onClick={handleCalculate}
                disabled={busy}
              >
                {buttonLabel}
              </button>
            </section>
          </>
        )}
      </section>
    </main>
  )
}

function PreflightConfirmation({ confirmation, onConfirm, onCancel }) {
  const { warnings, checked } = confirmation
  return (
    <div className={styles.confirmation} role="alert">
      <p className={styles.confirmationTitle}>
        {checked
          ? 'Antes de calcular, revisá estas advertencias:'
          : 'No pudimos verificar si los datos están al día.'}
      </p>
      {checked && (
        <ul className={styles.warningList}>
          {warnings.map((warning) => (
            <li key={warning.code} className={styles.warning}>
              <span>{warning.message}</span>
              {warning.data_as_of && (
                <span className={styles.warningDate}>
                  Fecha del dato: {formatDateTime(warning.data_as_of)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.muted}>Podés calcular igual si querés.</p>
      <div className={styles.actions}>
        <button type="button" className={authStyles.button} onClick={onConfirm}>
          Calcular igual
        </button>
        <button type="button" className={authStyles.doorSecondary} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </div>
  )
}

function RunStatus({ run, calculating }) {
  if (calculating || run?.status === 'running') {
    return (
      <>
        <span className={styles.pill}>En curso</span>
        <p className={styles.muted}>
          El ranking se está calculando. No se puede iniciar otro cálculo hasta que termine.
        </p>
      </>
    )
  }

  if (!run) {
    return <p className={styles.muted}>Todavía no se calculó ningún ranking.</p>
  }

  if (run.status === 'failed') {
    return (
      <>
        <span className={`${styles.pill} ${styles.pillFailed}`}>Falló</span>
        <p className={styles.banner}>{run.error}</p>
        <p className={styles.muted}>Si había un ranking vigente, no se modificó.</p>
      </>
    )
  }

  return (
    <>
      <span className={styles.pill}>Completado</span>
      <p>El ranking rige desde el {formatDateTime(run.completed_at)}.</p>
      <dl className={styles.summary}>
        <dt>Versión de reglas</dt>
        <dd>{run.rules_version}</dd>
        <dt>Socios incluidos</dt>
        <dd>{run.population_size}</dd>
        <dt>Calculado el</dt>
        <dd>{formatDateTime(run.calculated_at)}</dd>
      </dl>
    </>
  )
}

export default RankingRun
