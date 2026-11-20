import { useEffect, useId, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { getPublishedEvents, previewReschedule, rescheduleEvent } from '../services/events.js'
import {
  eventTypeLabel,
  formatEventDateInline,
  formatEventTime,
  isMatch,
  toDateTimeInputs,
} from '../services/eventFormat.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import styles from './PublishEvent.module.css'

const ERRORS = {
  DATE_REQUIRED: 'Ingresá la nueva fecha y hora.',
  NO_CHANGES: 'No hay cambios para guardar.',
  NOT_LISTED: 'Este evento ya no se puede reprogramar: empezó, fue retirado o no está publicado.',
  FORBIDDEN: 'Solo los admins pueden reprogramar eventos.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// Espera entre que el Admin deja de tipear y se pide la vista previa al back.
const PREVIEW_DELAY_MS = 400

// "el sábado 21 de noviembre a las 17:00".
function when(iso) {
  return `el ${formatEventDateInline(iso)} a las ${formatEventTime(iso)}`
}

// HU-23B US2 escenario 7: qué le pasa al cronograma de olas, con los textos fijos de la spec.
function scheduleEffectText(impact, scheduleStatus) {
  switch (impact.schedule_effect) {
    case 'none':
      return 'El cronograma no cambia.'
    case 'closing_adjusted':
      return `El cierre general pasa al ${formatEventDateInline(impact.new_closing_at)} a las ${formatEventTime(impact.new_closing_at)}.`
    case 'waves_merged': {
      const orders = impact.moved_waves.map((wave) => wave.order)
      const from = orders[0]
      const to = orders.at(-1)
      const moved = from === to ? `La ola ${from} se suma` : `Las olas ${from} a ${to} se suman`
      const closing = `El cierre general pasa al ${formatEventDateInline(impact.new_closing_at)} a las ${formatEventTime(impact.new_closing_at)}.`
      if (impact.target_wave_open) {
        return `${moved} a la ola ${impact.merged_into_order}, que ya está habilitada: sus socios tienen acceso desde ese momento. ${closing}`
      }
      const verb = from === to ? 'se habilita' : 'se habilitan'
      return `${moved} a la ola ${impact.merged_into_order} y ${verb} ${when(impact.target_wave_starts_at)}. ${closing}`
    }
    case 'invalidated':
      return scheduleStatus === 'draft'
        ? 'El cronograma en borrador se invalida y hay que generarlo de nuevo.'
        : 'Todas las olas quedarían después del nuevo inicio: el cronograma se invalida y hay que generarlo de nuevo.'
    default:
      return null
  }
}

function recipientsText(count) {
  if (count === 0) return 'No hay socios con la cuenta activada para avisarles.'
  return count === 1
    ? 'Se le avisa del cambio al socio con la cuenta activada.'
    : `Se les avisa del cambio a los ${count} socios con la cuenta activada.`
}

// HU-23B US4: los socios de las olas sumadas reciben además el aviso de su turno nuevo, o de que ya
// pueden reservar si la ola de destino abrió. Sin socios movidos con cuenta activada, no se muestra.
function movedRecipientsText(notifications) {
  const opened = notifications.wave_opened ?? 0
  const rescheduled = notifications.wave_rescheduled ?? 0
  if (opened > 0) {
    return opened === 1
      ? 'Al socio de las olas sumadas se le avisa que ya puede reservar.'
      : `A los ${opened} socios de las olas sumadas se les avisa que ya pueden reservar.`
  }
  if (rescheduled > 0) {
    return rescheduled === 1
      ? 'Al socio de las olas sumadas se le avisa su nuevo turno.'
      : `A los ${rescheduled} socios de las olas sumadas se les avisa su nuevo turno.`
  }
  return null
}

// HU-23B US2: el Admin cambia la fecha y hora de un evento publicado, lo único editable. El tipo, la
// clase o los puntos y los datos del club se muestran de solo lectura (escenario 1). Antes de confirmar
// ve qué le pasa al cronograma de olas (escenario 7) y confirmar aplica exactamente eso.
function RescheduleEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fromList = useLocation().state?.evento
  const [evento, setEvento] = useState(fromList?.id_interno === id ? fromList : null)
  const [loadError, setLoadError] = useState('')
  const [values, setValues] = useState(() =>
    fromList?.id_interno === id ? toDateTimeInputs(fromList.fecha_hora) : { date: '', time: '' },
  )
  // Vista previa del back para los valores del formulario: { key, impact } o { key, error }.
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const errorId = useId()
  const previewId = useId()

  // Si se entra por URL (sin pasar por la lista), se busca el evento entre los publicados próximos.
  useEffect(() => {
    if (evento) return
    let ignore = false
    getPublishedEvents()
      .then((items) => {
        if (ignore) return
        const found = items.find((item) => item.id_interno === id)
        if (found) {
          setEvento(found)
          setValues(toDateTimeInputs(found.fecha_hora))
        } else setLoadError(ERRORS.NOT_LISTED)
      })
      .catch(() => {
        if (!ignore) setLoadError(ERRORS.GENERIC)
      })
    return () => {
      ignore = true
    }
  }, [evento, id])

  const current = evento ? toDateTimeInputs(evento.fecha_hora) : null
  const changed = Boolean(
    current && values.date && values.time && (values.date !== current.date || values.time !== current.time),
  )
  const fechaHora = `${values.date}T${values.time}:00`
  // La vista previa vale para estos valores y esta versión del evento.
  const previewKey = evento ? `${evento.version}|${fechaHora}` : ''
  const shown = changed && preview?.key === previewKey ? preview : null

  // Escenario 7: cada vez que cambian la fecha o la hora, se pide la vista previa al back.
  useEffect(() => {
    if (!changed) return
    let ignore = false
    const timer = setTimeout(() => {
      previewReschedule(evento.id_interno, { fechaHora })
        .then((impact) => {
          if (!ignore) setPreview({ key: previewKey, impact })
        })
        .catch((err) => {
          if (!ignore) setPreview({ key: previewKey, error: rescheduleErrorMessage(err) })
        })
    }, PREVIEW_DELAY_MS)
    return () => {
      ignore = true
      clearTimeout(timer)
    }
  }, [changed, evento, fechaHora, previewKey])

  function update(field) {
    return (event) => {
      setValues((currentValues) => ({ ...currentValues, [field]: event.target.value }))
      setError('')
    }
  }

  // Escenario 9: otro Admin cambió el evento. Se vuelve a mostrar el formulario con los valores actuales.
  async function reloadCurrent(message) {
    try {
      const items = await getPublishedEvents()
      const found = items.find((item) => item.id_interno === evento.id_interno)
      if (!found) {
        setLoadError(ERRORS.NOT_LISTED)
        return
      }
      setEvento(found)
      setValues(toDateTimeInputs(found.fecha_hora))
      setPreview(null)
      setError(message)
    } catch {
      setError(ERRORS.GENERIC)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!values.date || !values.time) return setError(ERRORS.DATE_REQUIRED)
    // Escenario 4: con los mismos valores no se manda nada.
    if (!changed) return setError(ERRORS.NO_CHANGES)
    if (!shown?.impact) return

    setSubmitting(true)
    setError('')
    try {
      const updated = await rescheduleEvent(evento.id_interno, {
        fechaHora,
        expectedVersion: evento.version,
        impact: shown.impact,
      })
      navigate('/events', {
        replace: true,
        state: { notice: `Reprogramaste «${evento.titulo}» para ${when(updated.fecha_hora)}.` },
      })
    } catch (err) {
      setSubmitting(false)
      if (err.code === 'EVENT_CHANGED') return reloadCurrent(err.reason)
      setError(rescheduleErrorMessage(err))
    }
  }

  const match = evento ? isMatch(evento.tipo) : false
  const effectText = shown?.impact ? scheduleEffectText(shown.impact, evento?.schedule?.status) : null
  const loadingPreview = changed && !shown

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/events" className={pageStyles.back} aria-label="Volver a los eventos publicados">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Reprogramar evento</h1>
      </header>

      {loadError && (
        <p className={authStyles.error} role="alert">
          {loadError}
        </p>
      )}

      {!loadError && !evento && <p className={styles.help}>Cargando evento…</p>}

      {!loadError && evento && (
        <div className={`${pageStyles.split} ${pageStyles.splitEven}`}>
          <section className={pageStyles.card}>
            <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
              <p className={styles.help}>
                Solo se puede cambiar la fecha y la hora, en hora de Buenos Aires. El evento sigue publicado y los
                socios ven la fecha nueva al instante.
              </p>
              <div className={authStyles.field}>
                <label htmlFor="reschedule-date" className={authStyles.label}>
                  Fecha
                </label>
                <input
                  id="reschedule-date"
                  type="date"
                  value={values.date}
                  onChange={update('date')}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={authStyles.input}
                  required
                />
              </div>
              <div className={authStyles.field}>
                <label htmlFor="reschedule-time" className={authStyles.label}>
                  Hora
                </label>
                <input
                  id="reschedule-time"
                  type="time"
                  value={values.time}
                  onChange={update('time')}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={authStyles.input}
                  required
                />
              </div>

              {changed && (
                <div id={previewId} className={styles.preview} aria-live="polite">
                  {loadingPreview && <p className={styles.help}>Revisando qué cambia…</p>}
                  {shown?.error && <p className={authStyles.error}>{shown.error}</p>}
                  {shown?.impact && (
                    <>
                      <p className={styles.previewTitle}>Al guardar</p>
                      <ul className={styles.previewList}>
                        <li>El evento pasa a ser {when(shown.impact.new_fecha_hora)}.</li>
                        {effectText && <li>{effectText}</li>}
                        <li>{recipientsText(shown.impact.notifications.event_rescheduled)}</li>
                        {movedRecipientsText(shown.impact.notifications) && (
                          <li>{movedRecipientsText(shown.impact.notifications)}</li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              )}

              {error && (
                <p id={errorId} role="alert" className={authStyles.error}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                className={authStyles.button}
                disabled={submitting || (changed && !shown?.impact)}
                aria-describedby={changed ? previewId : undefined}
              >
                {submitting ? 'Guardando…' : 'Guardar nueva fecha'}
              </button>
            </form>
          </section>

          <section className={`${pageStyles.card} ${styles.eventData}`}>
            <dl className={styles.summary}>
              <div className={styles.row}>
                <dt>Evento</dt>
                <dd>{evento.titulo}</dd>
              </div>
              <div className={styles.row}>
                <dt>Tipo</dt>
                <dd>{eventTypeLabel(evento.tipo)}</dd>
              </div>
              <div className={styles.row}>
                <dt>{match ? 'Clase' : 'Puntos'}</dt>
                <dd>{match ? `Clase ${evento.clase}` : evento.puntos}</dd>
              </div>
              <div className={styles.row}>
                <dt>Fecha y hora actual</dt>
                <dd>
                  {formatEventDateInline(evento.fecha_hora)}, {formatEventTime(evento.fecha_hora)}
                </dd>
              </div>
              <div className={styles.row}>
                <dt>Lugar</dt>
                <dd>{evento.lugar}</dd>
              </div>
              {evento.descripcion && (
                <div className={styles.row}>
                  <dt>Detalle</dt>
                  <dd>{evento.descripcion}</dd>
                </div>
              )}
            </dl>
            <p className={styles.note}>
              El tipo y la {match ? 'clase' : 'cantidad de puntos'} quedan fijos al publicar; el resto de los datos los
              envía el club.
            </p>
          </section>
        </div>
      )}
    </main>
  )
}

// El back explica el motivo en español: formato inválido, fecha no futura, sin cambios, evento ya empezado.
function rescheduleErrorMessage(err) {
  if (err.status === 404) return ERRORS.NOT_LISTED
  if (err.status === 403) return ERRORS.FORBIDDEN
  if ((err.status === 422 || err.status === 409) && err.reason) return err.reason
  return ERRORS.GENERIC
}

export default RescheduleEvent
