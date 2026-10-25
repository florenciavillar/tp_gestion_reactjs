import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import Logo from '../components/Logo.jsx'
import { getEventClasses, getPendingEvents, publishEvent } from '../services/events.js'
import { eventTypeLabel, formatEventDate, formatEventTime, formatFactor, isMatch } from '../services/eventFormat.js'
import authStyles from './Auth.module.css'
import styles from './PublishEvent.module.css'

const MIN_POINTS = 1
const MAX_POINTS = 100
// Alcanza para encontrar el evento si se entra por URL: los pendientes son pocos.
const LOOKUP_LIMIT = 500

const ERRORS = {
  POINTS_REQUIRED: 'Ingresá los puntos.',
  POINTS_RANGE: `Los puntos tienen que ser un número entero del ${MIN_POINTS} al ${MAX_POINTS}.`,
  CLASS_REQUIRED: 'Elegí la clase del partido.',
  NOT_PENDING: 'Este evento ya no está pendiente de publicar.',
  ALREADY_PUBLISHED: 'Este evento ya fue publicado y no se puede volver a publicar.',
  FORBIDDEN: 'Solo los admins pueden publicar eventos.',
  GENERIC: 'Algo salió mal. Probá de nuevo.',
}

// HU-22: el Admin elige la clase de un Partido (A, B o C) o los puntos de un evento institucional
// y lo publica. Los datos del evento los manda el club y son de solo lectura (HU-21 sc. 4).
// Después de publicar no se puede cambiar la clase ni los puntos, por eso se confirma antes.
function PublishEvent() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fromList = useLocation().state?.evento
  const [evento, setEvento] = useState(fromList?.id_interno === id ? fromList : null)
  const [loadError, setLoadError] = useState('')
  const [classes, setClasses] = useState(null)
  const [clase, setClase] = useState('')
  const [puntos, setPuntos] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const dialogRef = useRef(null)
  const dialogTitleId = useId()
  const fieldErrorId = useId()

  // Si se entra por URL (sin pasar por la lista), se busca el evento entre los pendientes.
  useEffect(() => {
    if (evento) return
    let ignore = false
    getPendingEvents({ limit: LOOKUP_LIMIT, offset: 0 })
      .then(({ items }) => {
        if (ignore) return
        const found = items.find((item) => item.id_interno === id)
        if (found) setEvento(found)
        else setLoadError(ERRORS.NOT_PENDING)
      })
      .catch(() => { if (!ignore) setLoadError(ERRORS.GENERIC) })
    return () => { ignore = true }
  }, [evento, id])

  const match = evento ? isMatch(evento.tipo) : false

  useEffect(() => {
    if (!match) return
    let ignore = false
    getEventClasses()
      .then((data) => { if (!ignore) setClasses(data) })
      .catch(() => { if (!ignore) setLoadError(ERRORS.GENERIC) })
    return () => { ignore = true }
  }, [match])

  const chosenClass = classes?.find((item) => item.clase === clase)

  function validate() {
    if (match) return clase ? '' : ERRORS.CLASS_REQUIRED
    if (puntos.trim() === '') return ERRORS.POINTS_REQUIRED
    const value = Number(puntos)
    if (!Number.isInteger(value) || value < MIN_POINTS || value > MAX_POINTS) return ERRORS.POINTS_RANGE
    return ''
  }

  function handleReview(event) {
    event.preventDefault()
    const error = validate()
    setFieldError(error)
    setSubmitError('')
    if (!error) dialogRef.current.showModal()
  }

  async function handleConfirm() {
    dialogRef.current.close()
    setSubmitting(true)
    setSubmitError('')
    try {
      await publishEvent(evento.id_interno, match ? { clase } : { puntos: Number(puntos) })
      const applied = match ? `con Clase ${clase}` : `con ${Number(puntos)} puntos`
      navigate('/', { replace: true, state: { notice: `Publicaste «${evento.titulo}» ${applied}.` } })
    } catch (err) {
      setSubmitError(publishErrorMessage(err))
      setSubmitting(false)
    }
  }

  function handleDialogClick(event) {
    // Un clic en el fondo oscuro (fuera del contenido) cancela.
    if (event.target === dialogRef.current) dialogRef.current.close()
  }

  return (
    <main className={authStyles.page}>
      <Logo />

      <section className={`${authStyles.card} ${styles.card}`}>
        <Link to="/" className={authStyles.back} aria-label="Volver a los eventos pendientes">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <h1 className={authStyles.title}>Publicar evento</h1>

        {loadError && <p className={authStyles.error} role="alert">{loadError}</p>}

        {!loadError && !evento && <p className={authStyles.message}>Cargando evento…</p>}

        {evento && (
          <>
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
                <dt>Fecha</dt>
                <dd>{formatEventDate(evento.fecha_hora)}</dd>
              </div>
              <div className={styles.row}>
                <dt>Hora</dt>
                <dd>{formatEventTime(evento.fecha_hora)}</dd>
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
            <p className={styles.note}>Estos datos los envió el club y no se pueden modificar.</p>

            <form className={authStyles.form} onSubmit={handleReview} noValidate>
              {match ? (
                <fieldset className={styles.classes} aria-describedby={fieldError ? fieldErrorId : undefined}>
                  <legend className={authStyles.label}>Clase del partido</legend>
                  <p className={styles.help}>
                    La clase define cuánto pesa la asistencia a este partido en el puntaje. Un factor mayor
                    premia la asistencia a los partidos de menor convocatoria.
                  </p>
                  {!classes && <p className={authStyles.message}>Cargando clases…</p>}
                  {classes?.map((item) => (
                    <label key={item.clase} className={styles.classOption}>
                      <input
                        type="radio"
                        name="clase"
                        value={item.clase}
                        checked={clase === item.clase}
                        onChange={() => { setClase(item.clase); setFieldError('') }}
                      />
                      <span className={styles.classText}>
                        <span className={styles.className}>
                          Clase {item.clase}
                          {item.es_default && <span className={styles.defaultTag}>Por defecto</span>}
                        </span>
                        <span className={styles.classDetail}>
                          Demanda {item.demanda} · Factor {formatFactor(item.factor)}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
              ) : (
                <div className={authStyles.field}>
                  <label htmlFor="puntos" className={authStyles.label}>Puntos</label>
                  <p className={styles.help} id={`${fieldErrorId}-help`}>
                    Los suma cada socio que asiste. Un número entero del {MIN_POINTS} al {MAX_POINTS}.
                  </p>
                  <input
                    id="puntos"
                    name="puntos"
                    type="number"
                    inputMode="numeric"
                    min={MIN_POINTS}
                    max={MAX_POINTS}
                    step={1}
                    placeholder="20"
                    value={puntos}
                    onChange={(event) => { setPuntos(event.target.value); setFieldError('') }}
                    aria-invalid={fieldError ? 'true' : undefined}
                    aria-describedby={fieldError ? fieldErrorId : `${fieldErrorId}-help`}
                    className={authStyles.input}
                  />
                </div>
              )}

              {fieldError && <p id={fieldErrorId} role="alert" className={authStyles.error}>{fieldError}</p>}
              {submitError && <p role="alert" className={authStyles.error}>{submitError}</p>}

              <button type="submit" className={authStyles.button} disabled={submitting || (match && !classes)}>
                {submitting ? 'Publicando…' : 'Revisar y publicar'}
              </button>
            </form>
          </>
        )}
      </section>

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={dialogTitleId}
        onClick={handleDialogClick}
      >
        {evento && (
          <div className={styles.dialogBody}>
            <h2 id={dialogTitleId} className={styles.dialogTitle}>¿Publicar el evento?</h2>
            <p className={styles.dialogText}>
              <strong>{evento.titulo}</strong> se va a publicar{' '}
              {match ? (
                <>
                  con <strong>Clase {clase}</strong>
                  {chosenClass && ` (demanda ${chosenClass.demanda}, factor ${formatFactor(chosenClass.factor)})`}.
                </>
              ) : (
                <>con <strong>{Number(puntos)} puntos</strong>.</>
              )}
            </p>
            <p className={styles.dialogWarning}>
              Los socios lo van a ver en sus próximos eventos y después no se puede cambiar{' '}
              {match ? 'la clase' : 'los puntos'}.
            </p>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.cancel} onClick={() => dialogRef.current.close()} autoFocus>
                Cancelar
              </button>
              <button type="button" className={styles.confirm} onClick={handleConfirm}>
                Publicar
              </button>
            </div>
          </div>
        )}
      </dialog>
    </main>
  )
}

// 409: ya publicado (por otro Admin o por la publicación automática). 422: el back explica el motivo,
// por ejemplo que faltan menos de 48 horas para el inicio.
function publishErrorMessage(err) {
  if (err.status === 409) return ERRORS.ALREADY_PUBLISHED
  if (err.status === 404) return ERRORS.NOT_PENDING
  if (err.status === 403) return ERRORS.FORBIDDEN
  if (err.status === 422 && err.reason) return err.reason
  return ERRORS.GENERIC
}

export default PublishEvent
