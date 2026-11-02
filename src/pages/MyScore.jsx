import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { formatDateTime } from '../services/eventFormat.js'
import { formatPosition, formatScore, getCurrentScore } from '../services/memberScore.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import styles from './MyScore.module.css'

const LOAD_ERROR = 'No pudimos cargar tu puntaje. Probá de nuevo en un rato.'
const NO_CLUB = 'Tu cuenta no tiene un club asignado. Consultá con el club.'

// HU-14: puntaje actual y posición del socio, de solo lectura. Los datos salen del último ranking
// completado (HU-25); sin datos, el backend devuelve la vista provisional con su etiqueta y su mensaje.
function MyScore() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    getCurrentScore()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', message: err.code === 'MEMBER_WITHOUT_CLUB' ? NO_CLUB : LOAD_ERROR })
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Mi puntaje</h1>
        <p className={pageStyles.lead}>Tu situación frente a la prioridad de acceso a la compra de entradas.</p>
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando tu puntaje…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && <ScoreCard data={state.data} />}
    </main>
  )
}

function ScoreCard({ data }) {
  const provisional = data.status === 'provisional'
  return (
    <section className={pageStyles.card} aria-labelledby="score-title">
      {provisional && <span className={styles.pill}>{data.label}</span>}

      <div className={styles.figures}>
        <div>
          <h2 id="score-title" className={styles.figureLabel}>
            Puntaje actual
          </h2>
          <p className={`${styles.score} ${provisional ? styles.scoreProvisional : ''}`}>
            {formatScore(data.score)}
            <span className={styles.scale}> / 100</span>
          </p>
        </div>
        <p className={styles.position}>
          {data.position === null ? 'Sin posición en el ranking' : formatPosition(data.position, data.ranked_total)}
        </p>
      </div>

      {data.message && (
        <p className={data.reason === 'FEES_OVERDUE' ? styles.banner : styles.muted} role="status">
          {data.message}
        </p>
      )}

      {data.ranking ? (
        <dl className={styles.summary}>
          <dt>Último ranking</dt>
          <dd>{formatDateTime(data.ranking.completed_at)}</dd>
          <dt>Versión de reglas</dt>
          <dd>{data.ranking.rules_version}</dd>
        </dl>
      ) : (
        <p className={styles.muted}>Todavía no se calculó ningún ranking.</p>
      )}

      <Link to="/ranking/explanation" className={authStyles.switchLink}>
        ¿Cómo se calcula mi puntaje?
      </Link>
    </section>
  )
}

export default MyScore
