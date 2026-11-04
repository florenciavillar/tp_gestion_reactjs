import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import { formatPosition, formatScore } from '../services/memberScore.js'
import {
  formatDifference,
  formatLevel,
  simulateEvent,
  simulatorErrorMessage,
} from '../services/simulator.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'
import resultStyles from './SimulationResult.module.css'

// HU-18: resultado de simular un solo evento (escenario 1). Se pide de nuevo cada vez: no se guarda nada.
// Regla del escenario 13: una posición estimada se muestra siempre con su `text` y con el `label`
// visible en la misma pantalla; nunca el número suelto.
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

  return (
    <>
      <div className={resultStyles.eventMeta}>
        <span className={styles.pill}>{event.tipo}</span>
        <span>
          {formatEventDate(event.fecha_hora)} · {formatEventTime(event.fecha_hora)}
        </span>
        {event.puntos != null && <span>Vale {event.puntos} puntos de participación</span>}
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

      <dl className={`${pageStyles.card} ${styles.summary}`}>
        <dt>Tu puntaje hoy</dt>
        <dd>{formatScore(current.score)}</dd>
        <dt>Tu posición hoy</dt>
        <dd>{formatPosition(current.position, current.ranked_total)}</dd>
      </dl>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <caption className={styles.srOnly}>Puntaje si vas y si no vas al evento</caption>
          <thead>
            <tr>
              <td />
              <th scope="col">Si vas</th>
              <th scope="col">Si no vas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">Puntaje</th>
              <td>
                <Score hypothesis={attend} />
              </td>
              <td>
                <Score hypothesis={notAttend} />
              </td>
            </tr>
            {estimated && (
              <tr>
                <th scope="row">Posición estimada</th>
                <td>{attend.position.text}</td>
                <td>{notAttend.position.text}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {estimated ? (
        <div className={resultStyles.label}>
          <p>{estimate.label}</p>
          <p className={styles.muted}>«Probable» significa con un {formatLevel(estimate.range_level)} de probabilidad.</p>
        </div>
      ) : (
        // "No disponible" y "no estimado" son informativos, no errores: sin role="alert".
        estimate.message && <p className={styles.notice}>{estimate.message}</p>
      )}
    </>
  )
}

function Score({ hypothesis }) {
  return (
    <>
      <strong>{formatScore(hypothesis.score)}</strong>{' '}
      <span className={resultStyles.difference}>({formatDifference(hypothesis.difference)})</span>
    </>
  )
}

export default SimulationResult
