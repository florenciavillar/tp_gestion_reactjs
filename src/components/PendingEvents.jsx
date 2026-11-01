import { useEffect, useId, useState } from 'react'
import { Link } from 'react-router'
import { getPendingEvents } from '../services/events.js'
import { eventTypeLabel, formatEventDate, formatEventTime, formatRemaining } from '../services/eventFormat.js'
import styles from './Events.module.css'

const PAGE_SIZE = 10
const TICK_MS = 30_000

// HU-21 sc. 2 y HU-22 sc. 1: eventos recibidos del club que falta publicar, con el tiempo que queda
// hasta su publicación automática. El Admin publica cada uno eligiendo su clase o sus puntos.
function PendingEvents() {
  const [page, setPage] = useState(0)
  const [state, setState] = useState({ status: 'loading' })
  const now = useNow(TICK_MS)
  const headingId = useId()

  useEffect(() => {
    let ignore = false
    getPendingEvents({ limit: PAGE_SIZE, offset: page * PAGE_SIZE })
      .then(({ items, total }) => {
        if (ignore) return
        // Si se publicó el último evento de una página que no es la primera, volver a la anterior.
        if (items.length === 0 && page > 0) {
          setPage(page - 1)
          return
        }
        // El tiempo restante sale del reloj del servidor (cross-cutting §1): se descuenta lo que pasó
        // desde la respuesta con un reloj monótono, nunca con la hora del dispositivo.
        setState({ status: 'ready', items, total, receivedAt: performance.now() })
      })
      .catch(() => { if (!ignore) setState({ status: 'error' }) })
    return () => { ignore = true }
  }, [page])

  const elapsedSeconds = state.status === 'ready' ? Math.floor((now - state.receivedAt) / 1000) : 0
  const firstShown = page * PAGE_SIZE + 1
  const lastShown = state.status === 'ready' ? page * PAGE_SIZE + state.items.length : 0
  const hasNext = state.status === 'ready' && lastShown < state.total

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h2 id={headingId} className={styles.heading}>Eventos pendientes de publicar</h2>
          <p className={styles.muted}>
            Los envía el club. Elegí la clase de cada Partido o los puntos de cada evento institucional y
            publicalo. Si se cumple el plazo, se publica solo con los valores por defecto.
          </p>
        </div>
        <Link to="/admin/attendance" className={styles.secondary}>
          Cargar asistencias
        </Link>
      </div>

      {state.status === 'loading' && <p className={styles.muted}>Cargando eventos…</p>}

      {state.status === 'error' && (
        <p className={styles.error} role="alert">No pudimos cargar los eventos. Probá de nuevo en un rato.</p>
      )}

      {state.status === 'ready' && state.total === 0 && (
        <p className={styles.empty}>No hay eventos pendientes de publicar.</p>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <>
          <ul className={styles.list}>
            {state.items.map((evento) => {
              const remaining = Math.max(0, evento.segundos_restantes_deadline - elapsedSeconds)
              const expired = evento.plazo_expirado || remaining === 0
              return (
                <li key={evento.id_interno} className={styles.card}>
                  <div className={styles.cardTop}>
                    <h3 className={styles.cardTitle}>{evento.titulo}</h3>
                    <span className={`${styles.type} ${String(evento.tipo).toLowerCase() === 'partido' ? '' : styles.typeInstitutional}`}>{eventTypeLabel(evento.tipo)}</span>
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

                  <div className={styles.cardBottom}>
                    {expired ? (
                      <p className={styles.deadlineExpired}>Venció el plazo de publicación</p>
                    ) : (
                      <p className={styles.deadline}>Se publica solo en {formatRemaining(remaining)}</p>
                    )}
                    <Link
                      to={`/admin/events/${encodeURIComponent(evento.id_interno)}/publish`}
                      state={{ evento }}
                      className={styles.primary}
                    >
                      Publicar
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>

          <nav className={styles.pagination} aria-label="Páginas de eventos pendientes">
            <p className={styles.muted}>{firstShown}–{lastShown} de {state.total}</p>
            <div className={styles.paginationButtons}>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setPage((value) => value - 1)}
                disabled={page === 0}
              >
                Anterior
              </button>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => setPage((value) => value + 1)}
                disabled={!hasNext}
              >
                Siguiente
              </button>
            </div>
          </nav>
        </>
      )}
    </section>
  )
}

// Reloj monótono que se actualiza cada `intervalMs`, para refrescar los tiempos restantes.
function useNow(intervalMs) {
  const [now, setNow] = useState(() => performance.now())
  useEffect(() => {
    const id = setInterval(() => setNow(performance.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

export default PendingEvents