import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { eventTypeLabel, formatDateTime, isMatch } from '../services/eventFormat.js'
import { getEventHistory, historyErrorMessage, rulesLinkLabel, rulesPagePath } from '../services/eventHistory.js'
import eventStyles from '../components/Events.module.css'
import styles from './EventHistory.module.css'
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
        <p className={eventStyles.muted} role="status">
          Cargando tu historial…
        </p>
      )}

      {state.status === 'error' && (
        <p className={eventStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {data?.status === 'empty' && <p className={eventStyles.empty}>{data.message}</p>}

      {data?.status === 'ok' && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <caption className={styles.srOnly}>Eventos a los que asististe, del más reciente al más antiguo</caption>
            <thead>
              <tr>
                <th scope="col">Evento</th>
                <th scope="col">Fecha</th>
                <th scope="col">Tipo</th>
                <th scope="col">Reglas</th>
              </tr>
            </thead>
            <tbody>
              {data.events.map((evento) => (
                <tr key={evento.id_interno}>
                  <th scope="row" className={styles.name}>
                    {evento.titulo}
                  </th>
                  <td className={styles.date}>{formatDateTime(evento.fecha_hora)}</td>
                  <td>
                    <span
                      className={`${eventStyles.type} ${isMatch(evento.tipo) ? '' : eventStyles.typeInstitutional}`}
                    >
                      {eventTypeLabel(evento.tipo)}
                    </span>
                  </td>
                  <td>
                    {evento.rules_version ? (
                      <Link to={rulesPagePath(evento.rules_version.number)} className={styles.rulesLink}>
                        {rulesLinkLabel(evento.rules_version.number)}
                      </Link>
                    ) : (
                      <span className={styles.unavailable} title={evento.rules_message ?? undefined}>
                        No disponible
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default EventHistory
