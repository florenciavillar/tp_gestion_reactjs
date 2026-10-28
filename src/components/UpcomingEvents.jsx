import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { getUpcomingEvents } from '../services/events.js'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import styles from './Events.module.css'

// HU-17: próximos eventos publicados del club del socio, de solo lectura. Cada evento lleva al
// turno propio del socio (HU-39). El back ya filtra por club y saca los que empezaron.
function UpcomingEvents() {
  const [state, setState] = useState({ status: 'loading' })
  const headingId = useId()

  useEffect(() => {
    let ignore = false
    getUpcomingEvents()
      .then((data) => { if (!ignore) setState({ status: 'ready', data }) })
      .catch(() => { if (!ignore) setState({ status: 'error' }) })
    return () => { ignore = true }
  }, [])

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId} className={styles.heading}>Próximos eventos</h2>

      {state.status === 'loading' && <p className={styles.muted}>Cargando eventos…</p>}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">No pudimos cargar los eventos. Probá de nuevo en un rato.</p>
      )}

      {state.status === 'ready' && state.data.eventos.length === 0 && (
        <p className={styles.empty}>{state.data.mensaje}</p>
      )}

      {state.status === 'ready' && state.data.eventos.length > 0 && (
        <ul className={styles.list}>
          {state.data.eventos.map((evento) => (
            <li key={evento.id_interno} className={styles.card}>
              <div className={styles.cardTop}>
                <h3 className={styles.cardTitle}>{evento.titulo}</h3>
                <span className={`${styles.type} ${evento.tipo === 'Partido' ? '' : styles.typeInstitutional}`}>{evento.tipo}</span>
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
                <div>
                  <dt>Lugar</dt>
                  <dd>{evento.lugar}</dd>
                </div>
              </dl>

              {evento.descripcion && <p className={styles.description}>{evento.descripcion}</p>}

              <div className={styles.cardBottom}>
                <Link to={evento.slot_url} className={styles.secondary}>Ver mi turno</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default UpcomingEvents