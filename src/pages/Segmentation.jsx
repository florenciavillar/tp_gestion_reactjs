import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatDateTime, formatEventDate, formatEventTime } from '../services/eventFormat.js'
import { getSegmentableEvents, segmentationErrorMessage } from '../services/segmentation.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import runStyles from './RankingRun.module.css'
import styles from './Segmentation.module.css'

// Resumen del cronograma de cada partido (HU-37).
function scheduleLabel(schedule) {
  if (schedule.status === 'confirmed') return `Cronograma confirmado · abre el ${formatDateTime(schedule.opening_at)}`
  if (schedule.status === 'invalidated') return 'Cronograma invalidado: hay que generarlo de nuevo'
  return 'Cronograma en borrador'
}

// HU-36: partidos próximos para generar sus olas. Solo admins.
function Segmentation() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    getSegmentableEvents()
      .then((result) => {
        if (!ignore) setItems(result)
      })
      .catch((err) => {
        if (!ignore) setError(segmentationErrorMessage(err))
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Oleadas</h1>
        <p className={pageStyles.lead}>
          Las olas ordenan a los socios según su posición en el ranking para acceder a la reserva de forma escalonada.
          Solo se generan para partidos publicados que todavía no empezaron.
        </p>
      </header>

      <section className={pageStyles.card} aria-labelledby="matches-title">
        <h2 id="matches-title" className={pageStyles.cardTitle}>
          Próximos partidos
        </h2>
        {error && (
          <p className={authStyles.error} role="alert">
            {error}
          </p>
        )}
        {!error && items === null && <p className={runStyles.muted}>Cargando…</p>}
        {items?.length === 0 && <p className={runStyles.muted}>No hay partidos próximos publicados.</p>}
        {items?.length > 0 && (
          <ul className={styles.list}>
            {items.map(({ event, segmentation, schedule }) => (
              <li key={event.id_interno} className={styles.item}>
                <div className={styles.itemText}>
                  <h3 className={styles.itemTitle}>{event.titulo}</h3>
                  <span className={runStyles.muted}>
                    {formatEventDate(event.fecha_hora)}, {formatEventTime(event.fecha_hora)} · {event.lugar}
                  </span>
                  {segmentation ? (
                    <span className={runStyles.pill}>
                      {segmentation.waves_count} olas · generadas el {formatDateTime(segmentation.generated_at)}
                    </span>
                  ) : (
                    <span className={`${runStyles.pill} ${runStyles.pillFailed}`}>Sin olas</span>
                  )}
                  {segmentation &&
                    (schedule ? (
                      <span
                        className={
                          schedule.status === 'invalidated'
                            ? `${runStyles.pill} ${runStyles.pillFailed}`
                            : runStyles.pill
                        }
                      >
                        {scheduleLabel(schedule)}
                      </span>
                    ) : (
                      <span className={runStyles.muted}>Sin cronograma</span>
                    ))}
                </div>
                <div className={styles.itemText}>
                  <Link to={`/admin/segmentation/${encodeURIComponent(event.id_interno)}`} className={styles.link}>
                    {segmentation ? 'Ver olas' : 'Generar olas'}
                  </Link>
                  {segmentation && (
                    <Link
                      to={`/admin/segmentation/${encodeURIComponent(event.id_interno)}/schedule`}
                      className={styles.link}
                    >
                      {schedule ? 'Ver cronograma' : 'Armar cronograma'}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default Segmentation
