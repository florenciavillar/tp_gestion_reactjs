import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getOwnSlot } from '../services/events.js'
import { formatCountdown, formatEventDate, formatEventDateInline, formatEventTime } from '../services/eventFormat.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import styles from './EventSlot.module.css'

const LOAD_ERROR = 'No pudimos cargar tu turno. Probá de nuevo en un rato.'
const NOT_FOUND = 'No encontramos este evento.'
const NO_CLUB = 'Tu cuenta no tiene un club asignado. Consultá con el club.'

function errorMessage(err) {
  if (err.status === 404) return NOT_FOUND
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
        if (!ignore) setState({ status: 'error', message: errorMessage(err) })
      })
    return () => {
      ignore = true
    }
  }, [id, version])

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/events" className={pageStyles.back} aria-label="Volver a los eventos">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Tu turno</h1>
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

      {state.status === 'ready' && <SlotCard data={state.data} onExpired={reload} />}
    </main>
  )
}

function SlotCard({ data, onExpired }) {
  const { event } = data
  return (
    <section className={pageStyles.card} aria-labelledby="slot-event">
      <div className={styles.event}>
        <h2 id="slot-event" className={pageStyles.cardTitle}>
          {event.titulo}
        </h2>
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
      </div>

      {data.wave && (
        <p className={styles.wave}>
          Ola {data.wave.order}
          <span className={styles.waveTotal}> de {data.wave.total}</span>
        </p>
      )}

      {data.status === 'pending' && <Pending data={data} onExpired={onExpired} />}
      {data.status === 'open' && <Open data={data} onExpired={onExpired} />}
      {data.message && (
        <p className={data.status === 'no_wave' ? styles.banner : styles.muted} role="status">
          {data.message}
        </p>
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
