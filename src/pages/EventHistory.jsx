import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatEventDate, formatEventTime, isMatch } from '../services/eventFormat.js'
import { getEventHistory, historyErrorMessage, rulesLinkLabel, rulesPagePath } from '../services/eventHistory.js'
import styles from '../components/Events.module.css'
import pageStyles from './Page.module.css'

const TITLE = 'Mi historial de eventos'

// HU-15: eventos pasados a los que el socio asistió, del más reciente al más antiguo (el back ya los
// ordena), con la versión de reglas que regía en cada uno. Solo lectura.
function EventHistory() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    getEventHistory()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', message: historyErrorMessage(err) })
      })
    return () => {
      ignore = true
    }
  }, [])

  const data = state.status === 'ready' ? state.data : null

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>{TITLE}</h1>
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando tu historial…
        </p>
      )}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      {data?.status === 'empty' && <p className={styles.empty}>{data.message}</p>}

      {data?.status === 'ok' && (
        <ol className={styles.list}>
          {data.events.map((evento) => (
            <li key={evento.id_interno} className={styles.card}>
              <div className={styles.cardTop}>
                <h2 className={styles.cardTitle}>{evento.titulo}</h2>
                <span className={`${styles.type} ${isMatch(evento.tipo) ? '' : styles.typeInstitutional}`}>
                  {evento.tipo}
                </span>
              </div>

              <dl className={styles.meta}>
                <div>
                  <dt>Fecha</dt>
                  <dd>{formatEventDate(evento.fecha_hora)}</dd>
                </div>
                <div>
                  <dt>Hora</dt>
                  <dd>{formatEventTime(evento.fecha_hora)}</dd>
                </div>
              </dl>

              <div className={styles.cardBottom}>
                {evento.rules_version ? (
                  <Link to={rulesPagePath(evento.rules_version.number)} className={styles.secondary}>
                    {rulesLinkLabel(evento.rules_version.number)}
                  </Link>
                ) : (
                  <p className={styles.muted}>{evento.rules_message}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}

export default EventHistory
