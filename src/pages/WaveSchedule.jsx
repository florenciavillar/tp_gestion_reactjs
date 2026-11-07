import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { formatDateTime, formatEventDate, formatEventTime } from '../services/eventFormat.js'
import { getSchedule, isNoScheduleError, scheduleErrorMessage } from '../services/schedule.js'
import { getSegmentation, isNoSegmentationError } from '../services/segmentation.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import runStyles from './RankingRun.module.css'

const STATUS_LABELS = {
  draft: 'Borrador',
  confirmed: 'Confirmado',
  invalidated: 'Invalidado',
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
          {schedule ? (
            <ScheduleSummary schedule={schedule} />
          ) : (
            <p className={runStyles.muted}>Este partido todavía no tiene cronograma.</p>
          )}
        </section>
      )}
    </main>
  )
}

function ScheduleSummary({ schedule }) {
  return (
    <dl className={runStyles.summary}>
      <dt>Estado</dt>
      <dd>{STATUS_LABELS[schedule.status] ?? schedule.status}</dd>
      <dt>Apertura de la primera oleada</dt>
      <dd>{formatDateTime(schedule.opening_at)}</dd>
      <dt>Cierre general</dt>
      <dd>{formatDateTime(schedule.closing_at)}</dd>
      <dt>Generado</dt>
      <dd>
        {formatDateTime(schedule.generated_at)} por {schedule.generated_by}
      </dd>
    </dl>
  )
}

export default WaveSchedule
