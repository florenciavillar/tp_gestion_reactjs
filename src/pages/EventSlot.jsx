import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { getOwnSlot } from '../services/events.js'
import { formatCountdown, formatEventDate, formatEventDateInline, formatEventTime } from '../services/eventFormat.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import styles from './EventSlot.module.css'

const LOAD_ERROR = 'No pudimos cargar tu turno. Probá de nuevo en un rato.'
const NOT_FOUND = 'No encontramos este evento.'
// Si se llegó desde una notificación (bandeja o botón del correo de HU-19), el evento existió: ya no está (HU-20).
const UNAVAILABLE = 'Este evento ya no está disponible.'
// Aviso de turno habilitado cuyo cronograma ya no está confirmado (HU-20, notificaciones §3).
const SCHEDULE_CHANGED = 'El cronograma de reservas de este evento cambió y todavía no está definido de nuevo.'
const WITHDRAWN = 'Este evento fue retirado.'
const NO_CLUB = 'Tu cuenta no tiene un club asignado. Consultá con el club.'

function errorMessage(err, fromNotification) {
  if (err.status === 404) return fromNotification ? UNAVAILABLE : NOT_FOUND
  if (err.code === 'MEMBER_WITHOUT_CLUB') return NO_CLUB
  return LOAD_ERROR
}

// Reloj del server, no del dispositivo, así un reloj desfasado no cambia la cuenta (SC-003).
function useCountdown(seconds, onDone) {
  const [left, setLeft] = useState(seconds)

  useEffect(() => {
    if (seconds == null) return undefined
    const anchor = performance.now()
    let done = false
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(seconds - (performance.now() - anchor) / 1000))
      setLeft(remaining)
      if (remaining === 0 && !done) {
        done = true
        onDone()
      }
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [seconds, onDone])

  return seconds == null ? null : left
}

// HU-39: la ola del socio para un evento y cuándo se le habilita la reserva. Solo lectura.
function EventSlot() {
  const { id } = useParams()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const fromNotification = location.state?.fromNotification === true || searchParams.get('from') === 'notification'
  const [state, setState] = useState({ status: 'loading' })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])

  useEffect(() => {
    let ignore = false
    getOwnSlot(id)
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', message: errorMessage(err, fromNotification) })
      })
    return () => {
      ignore = true
    }
  }, [id, version, fromNotification])

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/events" className={pageStyles.back} aria-label="Volver a los eventos">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Mi turno</h1>
        <p className={pageStyles.lead}>Desde cuándo podés reservar tu lugar para este evento.</p>
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando tu turno…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && (
        <SlotCard data={state.data} onExpired={reload} fromNotification={fromNotification} />
      )}
    </main>
  )
}

function SlotCard({ data, onExpired, fromNotification }) {
  const { event } = data
  const scheduleChanged = fromNotification && data.status === 'no_schedule'
  return (
    <section className={pageStyles.card} aria-labelledby="slot-event">
      <div className={styles.event}>
        <h2 id="slot-event" className={pageStyles.cardTitle}>
          {event?.titulo || 'Evento'}
        </h2>
        {event && (
          <dl className={styles.meta}>
            <div>
              <dt>Fecha</dt>
              <dd>{formatEventDate(event.fecha_hora)}</dd>
            </div>
            <div>
              <dt>Hora</dt>
              <dd>{formatEventTime(event.fecha_hora)}</dd>
            </div>
            <div>
              <dt>Lugar</dt>
              <dd>{event.lugar}</dd>
            </div>
          </dl>
        )}
      </div>

      {data.status === 'withdrawn' ? (
        // HU-23 escenario 6: se dice que fue retirado, vengas o no de una notificación.
        <div className={`${styles.banner} ${styles.withdrawn}`} role="alert">
          <p className={styles.bannerText}>{data.message || WITHDRAWN}</p>
          <Link to="/events" className={styles.bannerLink}>
            Ver los eventos
          </Link>
        </div>
      ) : scheduleChanged ? (
        <div className={styles.banner} role="status">
          <p className={styles.bannerText}>{SCHEDULE_CHANGED}</p>
          <Link to="/events" className={styles.bannerLink}>
            Ver los eventos
          </Link>
        </div>
      ) : (
        <>
          {data.status === 'pending' && <Pending data={data} onExpired={onExpired} />}
          {data.status === 'open' && <Open data={data} onExpired={onExpired} />}
          {data.message && (
            <p className={data.status === 'no_wave' ? styles.banner : styles.muted} role="status">
              {data.message}
            </p>
          )}
        </>
      )}
    </section>
  )
}

function at(iso) {
  return `el ${formatEventDateInline(iso)} a las ${formatEventTime(iso)}`
}

function Pending({ data, onExpired }) {
  const left = useCountdown(data.seconds_until_start, onExpired)
  return (
    <>
      <p className={styles.text}>Tu acceso a la reserva se habilita {at(data.starts_at)}.</p>
      <p className={styles.countdown} role="timer">
        {formatCountdown(left)}
      </p>
      <p className={styles.muted}>Disponible hasta {at(data.closing_at)}.</p>
    </>
  )
}

function Open({ data, onExpired }) {
  useCountdown(data.seconds_until_closing, onExpired)
  return (
    <>
      <p className={styles.openText}>Tu acceso a la reserva ya está habilitado hasta {at(data.closing_at)}.</p>
      <p className={styles.muted}>La compra se hace en la plataforma de entradas del club.</p>
    </>
  )
}

export default EventSlot
