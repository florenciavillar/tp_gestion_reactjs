import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useAuth } from '../components/authContext.js'
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
  const { user } = useAuth()
  const storageKey = `myScore:last:${user?.member_id ?? user?.email ?? 'anon'}`
  const provisional = data.status === 'provisional'
  const target = Math.min(100, Math.max(0, parseFloat(data.score) || 0))
  // Lo último que vio el socio: la animación arranca desde ahí y no desde 0.
  const [previous] = useState(() => readLastSeen(storageKey))
  const animatedScore = useCountUp(target, previous?.score)
  const animatedPosition = useCountUp(data.position ?? 0, previous?.position)

  useEffect(() => {
    writeLastSeen(storageKey, { score: target, position: data.position })
  }, [storageKey, target, data.position])

  return (
    <section className={pageStyles.card} aria-labelledby="score-title">
      {provisional && <span className={styles.pill}>{data.label}</span>}

      <div className={styles.figures}>
        <div>
          <h2 id="score-title" className={styles.figureLabel}>
            Puntaje actual
          </h2>
          <p className={`${styles.score} ${provisional ? styles.scoreProvisional : ''}`}>
            {formatScore(animatedScore.toFixed(2))}
            <span className={styles.scale}> / 100</span>
          </p>
        </div>
        <div className={styles.positionBlock}>
          <Link to="/ranking/breakdown" className={styles.breakdownLink}>
            Ver desglose
          </Link>
          <p className={styles.position}>
            {data.position === null
              ? 'Sin posición en el ranking'
              : formatPosition(Math.round(animatedPosition), data.ranked_total)}
          </p>
        </div>
      </div>

      <div
        className={styles.bar}
        role="meter"
        aria-label="Puntaje actual sobre 100"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={target}
      >
        <div className={styles.barFill} style={{ width: `${animatedScore}%` }} />
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

const COUNT_DURATION_MS = 1200

// Último puntaje y puesto mostrados, por socio. Si el storage no está disponible, no hay animación.
function readLastSeen(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function writeLastSeen(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Sin storage se pierde solo el punto de partida de la próxima animación.
  }
}

// Anima un número desde `from` (el valor anterior) hasta `target`; si después cambia `target`,
// sigue desde el valor actual. Sin valor anterior, o con prefers-reduced-motion, muestra el final directo.
function useCountUp(target, from) {
  const initial = typeof from === 'number' ? from : target
  const [value, setValue] = useState(initial)
  const current = useRef(initial)

  useEffect(() => {
    const start = current.current
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion || start === target) {
      current.current = target
      setValue(target)
      return
    }
    let frame
    const startTime = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - startTime) / COUNT_DURATION_MS)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = start + (target - start) * eased
      current.current = next
      setValue(next)
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target])

  return value
}

export default MyScore
