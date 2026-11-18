import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getPublishedEvents, withdrawEvent } from '../services/events.js'
import { eventTypeLabel, formatDateTime, formatEventTime, formatShortDate, isMatch } from '../services/eventFormat.js'
import dialogStyles from '../pages/PublishEvent.module.css'
import styles from './Events.module.css'

// Estado del cronograma de olas (HU-37) de un Partido, como lo ve el Admin.
const SCHEDULE_LABELS = {
  draft: 'Cronograma en borrador',
  confirmed: 'Cronograma confirmado',
  invalidated: 'Cronograma invalidado',
}

// Una reprogramación (HU-23B US3) puede haber movido el cierre o sumado olas a otra.
function scheduleLabel(schedule) {
  if (!schedule) return 'Sin cronograma'
  const label = SCHEDULE_LABELS[schedule.status] ?? schedule.status
  if (schedule.status !== 'confirmed' || !schedule.adjusted) return label
  return schedule.merged_into_order
    ? `${label}, ajustado: las olas siguientes se sumaron a la ola ${schedule.merged_into_order}`
    : `${label}, ajustado: cierre adelantado`
}

// "Clase A" para un Partido, "25 puntos" para un evento institucional/amateur.
function weightLabel(evento) {
  if (isMatch(evento.tipo)) return evento.clase ? `Clase ${evento.clase}` : 'Sin clase'
  return evento.puntos === 1 ? '1 punto' : `${evento.puntos} puntos`
}

// HU-23B US5 escenario 1: el texto fijo de la confirmación del retiro.
function withdrawQuestion(evento) {
  return `¿Retirar ${evento.titulo} del ${formatShortDate(evento.fecha_hora)} a las ${formatEventTime(evento.fecha_hora)}?`
}

const WITHDRAW_EFFECTS =
  'Los socios y la administración dejan de verlo, se borran sus olas y su cronograma, y se avisa a los socios que ' +
  'el evento se suspendió. Esta acción no se puede deshacer.'

// El back explica el motivo en español (evento cambiado, ya empezado, no encontrado).
function withdrawErrorMessage(err) {
  if (err.status === 404) return 'No encontramos el evento: puede que ya lo hayan retirado.'
  if (err.status === 403) return 'No tenés permiso para retirar eventos.'
  if ((err.status === 409 || err.status === 422) && err.reason) return err.reason
  return 'No pudimos retirar el evento. Intentá de nuevo.'
}

// HU-23B US1: eventos publicados del club que todavía no empezaron, el más cercano primero, cada uno
// con "Reprogramar" y "Retirar evento". El club sale de la sesión del Admin: no se manda club_id.
function PublishedEvents() {
  const [state, setState] = useState({ status: 'loading' })
  const headingId = useId()
  const dialogTitleId = useId()
  const dialogRef = useRef(null)
  // El evento que se está por retirar (US5): se elige con "Retirar evento" y se confirma en el diálogo.
  const [target, setTarget] = useState(null)
  const [withdrawing, setWithdrawing] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(() => {
    let ignore = false
    getPublishedEvents()
      .then((items) => {
        if (!ignore) setState({ status: 'ready', items: items ?? [] })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [])

  useEffect(() => load(), [load])

  const retry = () => {
    setState({ status: 'loading' })
    load()
  }

  function askWithdraw(evento) {
    setTarget(evento)
    setMessage(null)
  }

  // Se abre después de pintar el contenido, así "Cancelar" toma el foco inicial.
  useEffect(() => {
    if (target && !dialogRef.current.open) dialogRef.current.showModal()
  }, [target])

  // Escenario 2: "Cancelar", Escape o un clic en el fondo cierran sin cambiar nada.
  function closeDialog() {
    dialogRef.current.close()
  }

  function handleDialogClick(event) {
    if (event.target === dialogRef.current) closeDialog()
  }

  async function confirmWithdraw() {
    const evento = target
    closeDialog()
    setWithdrawing(true)
    try {
      await withdrawEvent(evento.id_interno, evento.version)
      setMessage({ kind: 'notice', text: `Retiraste «${evento.titulo}». Se avisó a los socios que se suspendió.` })
    } catch (err) {
      setMessage({ kind: 'error', text: withdrawErrorMessage(err) })
    } finally {
      setWithdrawing(false)
      // Escenario 3: el evento retirado sale del listado; si falló, se ven los datos actuales.
      load()
    }
  }

  return (
    <section className={styles.section} aria-labelledby={headingId} style={{ marginTop: '3rem' }}>
      <div className={styles.headerRow}>
        <div className={styles.headerText}>
          <h2 id={headingId} className={styles.heading}>
            Eventos publicados
          </h2>
          <p className={styles.muted}>
            Los eventos publicados que todavía no empezaron, el más cercano primero. Desde acá se reprograma la fecha y
            hora de un evento o se lo retira.
          </p>
        </div>
      </div>

      {message && (
        <p
          className={message.kind === 'error' ? styles.error : styles.notice}
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}

      {state.status === 'loading' && <p className={styles.muted}>Cargando eventos publicados…</p>}

      {state.status === 'error' && (
        <div role="alert">
          <p className={styles.error}>No pudimos cargar los eventos publicados. Intentá de nuevo.</p>
          <button type="button" className={styles.secondary} onClick={retry}>
            Reintentar
          </button>
        </div>
      )}

      {state.status === 'ready' && state.items.length === 0 && (
        <p className={styles.empty}>No hay eventos publicados próximos.</p>
      )}

      {state.status === 'ready' && state.items.length > 0 && (
        <ul className={styles.list}>
          {state.items.map((evento) => (
            <li key={evento.id_interno} className={styles.card}>
              <div className={styles.cardTop}>
                <div style={{ flex: '1 1 12rem' }}>
                  <h3 className={styles.cardTitle}>{evento.titulo}</h3>
                  <span className={styles.clubId}>ID Club: {evento.id_externo}</span>
                </div>
                <span className={`${styles.type} ${isMatch(evento.tipo) ? '' : styles.typeInstitutional}`}>
                  {eventTypeLabel(evento.tipo)}
                </span>
              </div>

              {evento.cancelado_por_el_club && <p className={styles.deadlineExpired}>Cancelado por el club</p>}

              <dl className={styles.meta}>
                <div>
                  <dt>Fecha y hora</dt>
                  <dd>{formatDateTime(evento.fecha_hora)}</dd>
                </div>
                <div>
                  <dt>Lugar</dt>
                  <dd>{evento.lugar}</dd>
                </div>
                <div>
                  <dt>{isMatch(evento.tipo) ? 'Clase' : 'Puntos'}</dt>
                  <dd>{weightLabel(evento)}</dd>
                </div>
                {isMatch(evento.tipo) && (
                  <div>
                    <dt>Olas</dt>
                    <dd>{scheduleLabel(evento.schedule)}</dd>
                  </div>
                )}
              </dl>

              <div className={styles.cardBottom}>
                <Link
                  to={`/admin/events/${encodeURIComponent(evento.id_interno)}/reschedule`}
                  state={{ evento }}
                  className={styles.secondary}
                >
                  Reprogramar
                </Link>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => askWithdraw(evento)}
                  disabled={withdrawing}
                >
                  Retirar evento
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* US5 escenario 1: la confirmación nombra el evento y su fecha y explica los efectos. "Cancelar" tiene
          el foco inicial, así un Enter accidental no retira el evento (edge case de accesibilidad). */}
      <dialog
        ref={dialogRef}
        className={dialogStyles.dialog}
        aria-labelledby={dialogTitleId}
        onClick={handleDialogClick}
        onClose={() => setTarget(null)}
      >
        {target && (
          <div className={dialogStyles.dialogBody}>
            <h2 id={dialogTitleId} className={dialogStyles.dialogTitle}>
              {withdrawQuestion(target)}
            </h2>
            <p className={dialogStyles.dialogWarning}>{WITHDRAW_EFFECTS}</p>
            <div className={dialogStyles.dialogActions}>
              <button type="button" className={dialogStyles.cancel} onClick={closeDialog} autoFocus>
                Cancelar
              </button>
              <button type="button" className={dialogStyles.confirm} onClick={confirmWithdraw}>
                Retirar evento
              </button>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}

export default PublishedEvents
