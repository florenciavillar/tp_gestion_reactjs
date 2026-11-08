import { useEffect, useId, useState } from 'react'
import { Link, useParams } from 'react-router'
import { formatDateTime, formatEventDate, formatEventTime, formatRemaining } from '../services/eventFormat.js'
import {
  confirmSchedule,
  generateSchedule,
  getSchedule,
  isNoScheduleError,
  scheduleErrorMessage,
  toBuenosAiresInput,
  toBuenosAiresIso,
} from '../services/schedule.js'
import { getSegmentation, isNoSegmentationError } from '../services/segmentation.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import runStyles from './RankingRun.module.css'
import segStyles from './Segmentation.module.css'

const STATUS_LABELS = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  invalidated: 'Invalidado',
}

// Estado de cada ola según la hora del servidor (escenario 5). Solo para cronogramas confirmados.
const WAVE_STATES = {
  pending: { label: 'Pendiente', className: runStyles.muted },
  open: { label: 'Habilitada', className: runStyles.pill },
  closed: { label: 'Cerrada', className: `${runStyles.pill} ${runStyles.pillFailed}` },
}

// HU-37: cronograma de habilitación de las olas de un partido. Solo admins.
function WaveSchedule() {
  const { id } = useParams()
  const wavesPath = `/admin/segmentation/${encodeURIComponent(id)}`
  // Olas del partido (HU-36); null si todavía no tiene: sin olas no hay cronograma.
  const [segmentation, setSegmentation] = useState(null)
  // Cronograma del partido; null si todavía no tiene.
  const [schedule, setSchedule] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let ignore = false
    Promise.all([
      getSegmentation(id).catch((err) => {
        if (isNoSegmentationError(err)) return null
        throw err
      }),
      getSchedule(id).catch((err) => {
        if (isNoScheduleError(err)) return null
        throw err
      }),
    ])
      .then(([waves, current]) => {
        if (ignore) return
        setSegmentation(waves)
        setSchedule(current)
      })
      .catch((err) => {
        if (!ignore) setLoadError(scheduleErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setLoaded(true)
      })
    return () => {
      ignore = true
    }
  }, [id])

  const event = schedule?.event ?? segmentation?.event

  // Vuelve a leer el cronograma vigente (por ejemplo, si otro Admin lo cambió).
  function reloadSchedule() {
    getSchedule(id)
      .then(setSchedule)
      .catch(() => {
        // Se mantiene lo que había.
      })
  }

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to={wavesPath} className={pageStyles.back} aria-label="Volver a las olas del partido">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Cronograma de oleadas</h1>
        {event && (
          <p className={pageStyles.lead}>
            {event.titulo} · {formatEventDate(event.fecha_hora)}, {formatEventTime(event.fecha_hora)} · {event.lugar}
          </p>
        )}
      </header>

      {loadError && (
        <p className={authStyles.error} role="alert">
          {loadError}
        </p>
      )}
      {!loaded && <p className={runStyles.muted}>Cargando…</p>}

      {loaded && !loadError && !segmentation && (
        <div className={runStyles.banner} role="status">
          <p>Este partido todavía no tiene olas: generalas antes de armar el cronograma.</p>
          <p>
            <Link to={wavesPath}>Ir a las olas del partido</Link>
          </p>
        </div>
      )}

      {loaded && !loadError && segmentation && (
        <section className={runStyles.section} aria-labelledby="schedule-title">
          <h2 id="schedule-title" className={runStyles.sectionTitle}>
            Cronograma
          </h2>
          <div aria-live="polite">
            {schedule ? (
              <ScheduleSummary schedule={schedule} />
            ) : (
              <p className={runStyles.muted}>Este partido todavía no tiene cronograma.</p>
            )}
          </div>
          {schedule?.status === 'draft' && <ConfirmPanel eventId={id} schedule={schedule} onConfirmed={setSchedule} />}
        </section>
      )}

      {loaded && !loadError && schedule?.status === 'invalidated' && (
        <p className={`${runStyles.banner} ${runStyles.bannerError}`} role="status">
          Las olas se regeneraron: este cronograma ya no vale y los socios no lo ven. Generá uno nuevo.
        </p>
      )}

      {loaded && !loadError && schedule?.locked && (
        <p className={runStyles.banner} role="status">
          La primera oleada ya abrió: el cronograma no se puede regenerar.
        </p>
      )}

      {loaded && !loadError && segmentation && !schedule?.locked && (
        <PeriodForm
          eventId={id}
          eventStart={segmentation.event.fecha_hora}
          wavesCount={segmentation.waves.length}
          minStepMinutes={segmentation.min_step_minutes}
          replacing={schedule !== null && schedule.status !== 'invalidated'}
          onGenerated={setSchedule}
          onStale={reloadSchedule}
        />
      )}
    </main>
  )
}

// Abre el calendario al tocar cualquier parte del campo, no solo el ícono. `showPicker` no existe en
// navegadores viejos y puede tirar error (por ejemplo, dentro de un iframe): ahí queda el comportamiento nativo.
function openPicker(event) {
  try {
    event.currentTarget.showPicker?.()
  } catch {
    // Se sigue pudiendo abrir desde el ícono o escribir la fecha.
  }
}

// Período de reserva: apertura de la primera oleada y cierre general (escenario 2).
// Las reglas las valida el backend; acá solo se ayuda con los límites del selector.
// Si ya hay un cronograma, reemplazarlo pide confirmación y lo vuelve a borrador (escenario 6).
function PeriodForm({ eventId, eventStart, wavesCount, minStepMinutes, replacing, onGenerated, onStale }) {
  const openingId = useId()
  const closingId = useId()
  const [opening, setOpening] = useState('')
  const [closing, setClosing] = useState('')
  const [asking, setAsking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function submit(confirmed) {
    setAsking(false)
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      onGenerated(
        await generateSchedule(eventId, {
          openingAt: toBuenosAiresIso(opening),
          closingAt: toBuenosAiresIso(closing),
          confirmed,
        }),
      )
      setNotice(
        confirmed
          ? 'El cronograma se regeneró y volvió a borrador: revisalo y confirmalo de nuevo.'
          : 'El cronograma se generó en borrador.',
      )
    } catch (err) {
      if (err.code === 'CONFIRMATION_REQUIRED') {
        // Otro Admin lo generó mientras tanto: se muestra el vigente y se pide confirmar el reemplazo.
        onStale()
        setAsking(true)
      } else {
        setError(scheduleErrorMessage(err))
      }
    } finally {
      setSubmitting(false)
    }
  }

  let buttonLabel = replacing ? 'Regenerar cronograma' : 'Generar cronograma'
  if (submitting) buttonLabel = 'Generando…'

  function handleSubmit(event) {
    event.preventDefault()
    if (!opening || !closing) {
      setError('Completá la apertura y el cierre.')
      return
    }
    if (replacing) {
      setError('')
      setNotice('')
      setAsking(true)
      return
    }
    submit(false)
  }

  return (
    <section className={runStyles.section} aria-labelledby="period-title">
      <h2 id="period-title" className={runStyles.sectionTitle}>
        {replacing ? 'Regenerar cronograma' : 'Período de reserva'}
      </h2>
      <p className={runStyles.muted}>
        Las {wavesCount} oleadas se habilitan repartidas en partes iguales entre la apertura y el cierre, empezando por
        la ola 1. Entre una oleada y la siguiente tiene que haber al menos {minStepMinutes} minutos: el período tiene
        que durar al menos {wavesCount * minStepMinutes} minutos. El cierre no puede ser posterior al inicio del
        partido. Las horas son de Buenos Aires.
      </p>
      <form className={authStyles.form} onSubmit={handleSubmit} noValidate>
        <div className={authStyles.field}>
          <label htmlFor={openingId} className={authStyles.label}>
            Apertura de la primera oleada
          </label>
          <input
            id={openingId}
            type="datetime-local"
            className={authStyles.input}
            value={opening}
            max={toBuenosAiresInput(eventStart)}
            onChange={(e) => setOpening(e.target.value)}
            onClick={openPicker}
            required
          />
        </div>
        <div className={authStyles.field}>
          <label htmlFor={closingId} className={authStyles.label}>
            Cierre general
          </label>
          <input
            id={closingId}
            type="datetime-local"
            className={authStyles.input}
            value={closing}
            min={opening || undefined}
            max={toBuenosAiresInput(eventStart)}
            onChange={(e) => setClosing(e.target.value)}
            onClick={openPicker}
            required
          />
        </div>
        {asking && (
          <div className={runStyles.confirmation} role="alert">
            <p className={runStyles.confirmationTitle}>
              Este partido ya tiene un cronograma. Si continuás, se reemplaza y vuelve a borrador: los socios dejan de
              verlo hasta que lo confirmes de nuevo.
            </p>
            <div className={runStyles.actions}>
              <button type="button" className={authStyles.button} onClick={() => submit(true)}>
                Reemplazar cronograma
              </button>
              <button type="button" className={authStyles.doorSecondary} onClick={() => setAsking(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className={authStyles.error} role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className={runStyles.muted} role="status">
            {notice}
          </p>
        )}
        <button type="submit" className={authStyles.button} disabled={submitting || asking}>
          {buttonLabel}
        </button>
      </form>
    </section>
  )
}

// Escenario 4: el Admin revisa el borrador y lo confirma; recién ahí lo ven los socios.
function ConfirmPanel({ eventId, schedule, onConfirmed }) {
  const [asking, setAsking] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')

  async function handleConfirm() {
    setConfirming(true)
    setError('')
    try {
      onConfirmed(await confirmSchedule(eventId))
    } catch (err) {
      setError(scheduleErrorMessage(err))
      setAsking(false)
    } finally {
      setConfirming(false)
    }
  }

  return (
    <>
      <p className={runStyles.banner} role="status">
        <strong>Borrador:</strong> los socios todavía no ven este cronograma. Revisalo y confirmalo para publicarlo.
      </p>
      {asking ? (
        <div className={runStyles.confirmation} role="alert">
          <p className={runStyles.confirmationTitle}>
            ¿Confirmás el cronograma? Son {schedule.waves.length} oleadas, del {formatDateTime(schedule.opening_at)} al{' '}
            {formatDateTime(schedule.closing_at)}. Desde ahora los socios lo van a ver.
          </p>
          <div className={runStyles.actions}>
            <button type="button" className={authStyles.button} onClick={handleConfirm} disabled={confirming}>
              {confirming ? 'Confirmando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              className={authStyles.doorSecondary}
              onClick={() => setAsking(false)}
              disabled={confirming}
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={authStyles.button} onClick={() => setAsking(true)}>
          Confirmar cronograma
        </button>
      )}
      {error && (
        <p className={authStyles.error} role="alert">
          {error}
        </p>
      )}
    </>
  )
}

function ScheduleSummary({ schedule }) {
  return (
    <>
      <dl className={runStyles.summary}>
        <dt>Estado</dt>
        <dd>{STATUS_LABELS[schedule.status] ?? schedule.status}</dd>
        <dt>Apertura de la primera oleada</dt>
        <dd>{formatDateTime(schedule.opening_at)}</dd>
        <dt>Cierre general</dt>
        <dd>{formatDateTime(schedule.closing_at)}</dd>
        <dt>Entre oleadas</dt>
        <dd>
          {formatRemaining(schedule.step_seconds)} (mínimo {schedule.min_step_minutes} min)
        </dd>
        <dt>Generado</dt>
        <dd>
          {formatDateTime(schedule.generated_at)} por {schedule.generated_by}
        </dd>
        {schedule.confirmed_at && (
          <>
            <dt>Confirmado</dt>
            <dd>
              {formatDateTime(schedule.confirmed_at)} por {schedule.confirmed_by}
            </dd>
          </>
        )}
      </dl>
      <ScheduledWaves schedule={schedule} />
    </>
  )
}

// Cada ola con su hora de habilitación; todas quedan abiertas hasta el cierre general.
function ScheduledWaves({ schedule }) {
  const showStates = schedule.status === 'confirmed'
  return (
    <div className={segStyles.tableWrap}>
      <table className={segStyles.table}>
        <caption className={runStyles.muted}>
          Cuando una oleada llega a su hora, el acceso queda abierto para ella y las anteriores hasta el cierre general.
        </caption>
        <thead>
          <tr>
            <th scope="col">Ola</th>
            <th scope="col">Percentil</th>
            <th scope="col">Posiciones</th>
            <th scope="col">Socios</th>
            <th scope="col">Habilita desde</th>
            <th scope="col">Hasta</th>
            {showStates && <th scope="col">Estado</th>}
          </tr>
        </thead>
        <tbody>
          {schedule.waves.map((wave) => (
            <tr key={wave.order}>
              <td>{wave.order}</td>
              <td>
                {wave.percentile_from}–{wave.percentile_to} %
              </td>
              <td>
                {wave.position_from === wave.position_to
                  ? wave.position_from
                  : `${wave.position_from} a ${wave.position_to}`}
              </td>
              <td>{wave.socios}</td>
              <td>{formatDateTime(wave.starts_at)}</td>
              <td>{formatDateTime(schedule.closing_at)}</td>
              {showStates && (
                <td>
                  <span className={WAVE_STATES[wave.state]?.className}>
                    {WAVE_STATES[wave.state]?.label ?? wave.state}
                  </span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default WaveSchedule
