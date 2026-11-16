import { useEffect, useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import { formatScore } from '../services/memberScore.js'
import { formatDifference, formatLevel, simulateEvent, simulatorErrorMessage } from '../services/simulator.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'
import resultStyles from './SimulationResult.module.css'

// HU-18: resultado de simular un solo evento (escenario 1). Se pide de nuevo cada vez: no se guarda nada.
// Escenario 13: la posición estimada se muestra como número + rango probable, siempre con el `label`
// visible en la misma pantalla; el `text` del back queda para lectores de pantalla.
function SimulationResult() {
  const { id } = useParams()
  const [state, setState] = useState({ status: 'loading', id })

  // Al cambiar de evento se vuelve a "cargando" sin un efecto extra.
  if (state.id !== id) setState({ status: 'loading', id })

  useEffect(() => {
    let ignore = false
    simulateEvent(id)
      .then((data) => {
        if (!ignore) setState({ status: 'ready', id, data })
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', id, message: simulatorErrorMessage(err) })
      })
    return () => {
      ignore = true
    }
  }, [id])

  const data = state.status === 'ready' ? state.data : null

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/ranking/simulator" className={pageStyles.back} aria-label="Volver al simulador">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>{data ? data.event.titulo : 'Simulación'}</h1>
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Simulando…
        </p>
      )}

      {state.status === 'error' && (
        <>
          <p className={authStyles.error} role="alert">
            {state.message}
          </p>
          <Link to="/ranking/simulator">Volver a los eventos</Link>
        </>
      )}

      {data && <Result data={data} />}
    </main>
  )
}

function Result({ data }) {
  const { event, rules_notice: rulesNotice, distance, current, attend, position_estimate: estimate } = data
  const notAttend = data.not_attend
  const estimated = estimate.status === 'estimated'
  const level = estimated ? formatLevel(estimate.range_level) : null

  return (
    <>
      <div className={resultStyles.eventMeta}>
        <span className={resultStyles.typeChip}>{event.tipo}</span>
        <span className={resultStyles.chip}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          {formatEventDate(event.fecha_hora)}
        </span>
        <span className={resultStyles.chip}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          {formatEventTime(event.fecha_hora)}
        </span>
        {event.puntos != null && (
          <span className={resultStyles.chip}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Vale {event.puntos} puntos de participación
          </span>
        )}
      </div>

      {rulesNotice && (
        <p className={styles.banner} role="status">
          {rulesNotice.message}
        </p>
      )}
      {distance.changed && distance.notice && (
        <p className={styles.banner} role="status">
          {distance.notice}
        </p>
      )}

      <section className={resultStyles.today} aria-label="Tu situación hoy">
        <div className={resultStyles.todayItem}>
          <span className={resultStyles.todayLabel}>Tu puntaje hoy</span>
          <span className={resultStyles.todayValue}>{formatScore(current.score)}</span>
        </div>
        <div className={resultStyles.todayItem}>
          <span className={resultStyles.todayLabel}>Tu posición hoy</span>
          <span className={resultStyles.todayValue}>
            #{integerFormat.format(current.position)}
            <span className={resultStyles.todayOf}> de {integerFormat.format(current.ranked_total)}</span>
          </span>
        </div>
      </section>

      <div className={resultStyles.scenarios}>
        <Scenario title="Si vas" variant="attend" hypothesis={attend} estimated={estimated} level={level} />
        <Scenario title="Si no vas" variant="skip" hypothesis={notAttend} estimated={estimated} level={level} />
      </div>

      {estimated ? (
        <div className={resultStyles.label}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <div>
            <p>{estimate.label}</p>
            <p className={styles.muted}>El rango es el probable, con un {level} de probabilidad.</p>
          </div>
        </div>
      ) : (
        // "No disponible" y "no estimado" son informativos, no errores: sin role="alert".
        estimate.message && <p className={styles.notice}>{estimate.message}</p>
      )}
    </>
  )
}

const integerFormat = new Intl.NumberFormat('es-AR')

function Scenario({ title, variant, hypothesis, estimated, level }) {
  const titleId = useId()
  const sign = Math.sign(Number(hypothesis.difference))
  const diffClass = sign > 0 ? resultStyles.diffUp : sign < 0 ? resultStyles.diffDown : resultStyles.diffFlat
  const position = hypothesis.position

  return (
    <section
      className={`${resultStyles.scenario} ${variant === 'attend' ? resultStyles.scenarioAttend : ''}`}
      aria-labelledby={titleId}
    >
      <h2 id={titleId} className={resultStyles.scenarioTitle}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          {variant === 'attend' ? <path d="M8 12l3 3 5-6" /> : <path d="M15 9l-6 6M9 9l6 6" />}
        </svg>
        {title}
      </h2>

      <div className={resultStyles.metric}>
        <span className={resultStyles.metricLabel}>Puntaje</span>
        <div className={resultStyles.scoreLine}>
          <span className={resultStyles.scoreValue}>{formatScore(hypothesis.score)}</span>
          <span className={`${resultStyles.diff} ${diffClass}`}>{formatDifference(hypothesis.difference)}</span>
        </div>
      </div>

      {estimated && position && (
        <div className={resultStyles.metric}>
          <span className={resultStyles.metricLabel}>Posición estimada</span>
          {/* Visualmente número y rango; el lector de pantalla recibe el texto completo del back. */}
          <span className={resultStyles.srOnly}>{position.text}</span>
          <div aria-hidden="true">
            <span className={resultStyles.positionValue}>#{integerFormat.format(position.estimate)}</span>
            {position.lower !== position.upper && (
              <div className={resultStyles.range}>
                <span>
                  {integerFormat.format(position.lower)} – {integerFormat.format(position.upper)}
                </span>
                <span className={resultStyles.levelChip}>{level}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default SimulationResult
