import { useEffect, useId, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { getOwnSlot, getUpcomingEvents } from '../services/events.js'
import { formatEventDate, formatEventTime } from '../services/eventFormat.js'
import pageStyles from '../pages/Page.module.css'
import styles from './Events.module.css'

const UNAVAILABLE = 'Este evento ya no está disponible.'

// HU-17: próximos eventos publicados del club del socio, de solo lectura. Cada evento lleva al
// turno propio del socio (HU-39) y a su simulación de puntaje (HU-18). El back ya filtra por club y
// saca los que empezaron.
// Con `?highlight=<id_interno>` (desde una notificación, HU-17 escenario 6) resalta ese evento; si ya no
// está en la lista, avisa que no está disponible (o que se suspendió, si el Admin lo retiró: HU-23B US5
// escenario 6) y muestra la lista sin resaltar.
function UpcomingEvents() {
  const [state, setState] = useState({ status: 'loading' })
  const headingId = useId()
  const [searchParams] = useSearchParams()
  const highlight = searchParams.get('highlight')
  const highlightedRef = useRef(null)
  const ready = state.status === 'ready'
  const highlightFound = ready && Boolean(highlight) && state.data.eventos.some((e) => e.id_interno === highlight)
  const highlightMissing = ready && Boolean(highlight) && !highlightFound
  // El aviso de un evento que no está en la lista: el turno (HU-39) dice si se retiró.
  const [missingNotice, setMissingNotice] = useState(UNAVAILABLE)

  useEffect(() => {
    let ignore = false
    getUpcomingEvents()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => {
    if (!highlightMissing) return
    let ignore = false
    getOwnSlot(highlight)
      .then((slot) => {
        if (!ignore) setMissingNotice(slot.status === 'withdrawn' ? slot.message : UNAVAILABLE)
      })
      .catch(() => {
        if (!ignore) setMissingNotice(UNAVAILABLE)
      })
    return () => {
      ignore = true
    }
  }, [highlightMissing, highlight])

  // Cuando la lista está lista, lleva el evento resaltado al centro y le pasa el foco (lectores de pantalla).
  useEffect(() => {
    if (!highlightFound) return
    highlightedRef.current?.scrollIntoView({ block: 'center' })
    highlightedRef.current?.focus({ preventScroll: true })
  }, [highlightFound, highlight])

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 id={headingId} className={pageStyles.title}>
          Próximos eventos
        </h1>
      </header>

      {state.status === 'loading' && <p className={styles.muted}>Cargando eventos…</p>}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          No pudimos cargar los eventos. Probá de nuevo en un rato.
        </p>
      )}

      {highlightMissing && (
        <p className={styles.notice} role="status">
          {missingNotice}
        </p>
      )}

      {state.status === 'ready' && state.data.eventos.length === 0 && (
        <p className={styles.empty}>{state.data.mensaje}</p>
      )}

      {state.status === 'ready' && state.data.eventos.length > 0 && (
        <ul className={styles.list}>
          {state.data.eventos.map((evento) => {
            const highlighted = highlightFound && evento.id_interno === highlight
            return (
              <li
                key={evento.id_interno}
                ref={highlighted ? highlightedRef : undefined}
                tabIndex={highlighted ? -1 : undefined}
                className={`${styles.card} ${highlighted ? styles.highlighted : ''}`}
              >
                {highlighted && <span className={styles.highlightTag}>Desde tu notificación</span>}
                <div className={styles.cardTop}>
                  <h3 className={styles.cardTitle}>{evento.titulo}</h3>
                  <span className={`${styles.type} ${evento.tipo === 'Partido' ? '' : styles.typeInstitutional}`}>
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
                  <div>
                    <dt>Lugar</dt>
                    <dd>{evento.lugar}</dd>
                  </div>
                </dl>

                {evento.descripcion && <p className={styles.description}>{evento.descripcion}</p>}

                <div className={styles.cardBottom}>
                  <Link to={evento.slot_url} className={styles.secondary}>
                    Ver mi turno
                  </Link>
                  <Link to={`/ranking/simulator/${encodeURIComponent(evento.id_interno)}`} className={styles.secondary}>
                    Simular
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default UpcomingEvents
