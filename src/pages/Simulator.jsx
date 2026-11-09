import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import eventStyles from '../components/Events.module.css'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import { getUpcomingEvents } from '../services/events.js'
import { getSimulatorStatus, simulatorErrorMessage } from '../services/simulator.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'

const LOAD_ERROR = 'No pudimos cargar el simulador. Probá de nuevo en un rato.'

// HU-18: el socio elige un evento próximo para simular cuánto cambia su puntaje si va o no va.
// Si todavía no está en el ranking no puede simular (escenario 2): se muestra el motivo y no la lista.
function Simulator() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    Promise.all([getSimulatorStatus(), getUpcomingEvents()])
      .then(([simulator, events]) => {
        if (!ignore) setState({ status: 'ready', simulator, events })
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', message: simulatorErrorMessage(err, LOAD_ERROR) })
      })
    return () => {
      ignore = true
    }
  }, [])

  const ready = state.status === 'ready'
  const available = ready && state.simulator.status === 'available'
  const eventos = ready ? state.events.eventos : []

  return (
    <main className={pageStyles.page}>
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
          Cargando el simulador…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {ready && !available && <p className={`${pageStyles.card} ${styles.muted}`}>{state.simulator.message}</p>}

      {available && (
        <>
          <p className={pageStyles.lead}>Elegí un evento para ver cómo cambia tu puntaje si vas o si no vas.</p>

          {eventos.length === 0 ? (
            <p className={eventStyles.empty}>{state.events.mensaje}</p>
          ) : (
            <ul className={eventStyles.list}>
              {eventos.map((evento) => (
                <li key={evento.id_interno} className={eventStyles.card}>
                  <div className={eventStyles.cardTop}>
                    <h2 className={eventStyles.cardTitle}>{evento.titulo}</h2>
                    <span
                      className={`${eventStyles.type} ${evento.tipo === 'Partido' ? '' : eventStyles.typeInstitutional}`}
                    >
                      {evento.tipo}
                    </span>
                  </div>
                  <dl className={eventStyles.meta}>
                    <div>
                      <dt>Fecha</dt>
                      <dd>{formatEventDate(evento.fecha_hora)}</dd>
                    </div>
                    <div>
                      <dt>Hora</dt>
                      <dd>{formatEventTime(evento.fecha_hora)}</dd>
                    </div>
                  </dl>
                  <div className={eventStyles.cardBottom}>
                    <Link
                      to={`/ranking/simulator/${encodeURIComponent(evento.id_interno)}`}
                      className={eventStyles.primary}
                    >
                      Simular
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}

export default Simulator
