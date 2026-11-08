import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { getScoreBreakdown } from '../services/formula.js'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import styles from './ScoreBreakdown.module.css'

const TITLE = 'Desglose de mi puntaje'
const LOAD_ERROR = 'No pudimos cargar el desglose de tu puntaje. Probá de nuevo en un rato.'

function ScoreBreakdownPage() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    getScoreBreakdown()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error', message: LOAD_ERROR })
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
        <h1 className={pageStyles.title}>{TITLE}</h1>
        {state.status === 'ready' && state.data.has_ranking && (
          <p className={pageStyles.lead}>Evaluado con la versión de reglas del ranking #{state.data.rules_version}</p>
        )}
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando desglose de puntaje…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'ready' && !state.data.has_ranking && (
        <section className={pageStyles.card}>
          <div className={styles.emptyBody}>
            <div className={styles.emptyIcon}>
              <svg
                viewBox="0 0 24 24"
                width="28"
                height="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Sin ranking completado</h2>
            <p className={styles.emptyMessage}>{state.data.message}</p>
            <Link to="/ranking/explanation" className={authStyles.button}>
              Ver cómo funciona la fórmula
            </Link>
          </div>
        </section>
      )}

      {state.status === 'ready' && state.data.has_ranking && (
        <div className={styles.dashboardLayout}>
          {/* Tarjeta de Resumen superior */}
          <section className={styles.summaryCard} aria-label="Resumen del puntaje">
            <div className={styles.summaryHeader}>
              <div className={styles.summaryInfo}>
                <div className={styles.badges}>
                  {state.data.rules_version && <span className={styles.badge}>Reglas v{state.data.rules_version}</span>}
                  {state.data.calculation_date && (
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>Fecha: {state.data.calculation_date}</span>
                  )}
                </div>
              </div>

              <div className={styles.scoreRow}>
                <div className={styles.scoreItem}>
                  <span className={styles.scoreLabel}>Puntaje total</span>
                  <span className={styles.scoreValue}>{state.data.total} pts</span>
                </div>
                {state.data.position && (
                  <div className={styles.scoreItem}>
                    <span className={styles.scoreLabel}>Posición en el club</span>
                    <span className={styles.positionValue}>#{state.data.position}</span>
                  </div>
                )}
              </div>
            </div>

            <footer className={styles.summaryFooter}>
              <span>
                Suma de componentes: <strong>{state.data.total} pts</strong>
              </span>
              <Link to="/ranking/explanation" className={styles.explanationLink}>
                ¿Cómo se calcula cada componente?
              </Link>
            </footer>
          </section>

          {/* Sección de Componentes en grilla */}
          <section className={styles.componentsSection} aria-labelledby="components-title">
            <h2 id="components-title" className={styles.componentsTitle}>
              Componentes del puntaje
            </h2>
            <div className={styles.componentsGrid}>
              {state.data.components.map((comp) => (
                <ComponentItem key={comp.key} component={comp} />
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

function ComponentItem({ component }) {
  const pointsNumber = parseFloat(component.points)
  const isNegative = pointsNumber < 0
  const isZero = pointsNumber === 0

  let badgeClass = styles.pointsBadge
  if (isNegative) badgeClass += ` ${styles.pointsNegative}`
  else if (isZero) badgeClass += ` ${styles.pointsZero}`

  const signedPoints = isNegative ? `${component.points} pts` : `+${component.points} pts`

  return (
    <details className={styles.componentCard} open>
      <summary className={styles.componentSummary}>
        <div className={styles.nameRow}>
          <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span className={styles.componentName}>{component.name}</span>
        </div>
        <span className={badgeClass}>{signedPoints}</span>
      </summary>

      <div className={styles.componentBody}>
        {component.explanation && (
          <div className={styles.capNotice} role="note">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{component.explanation}</span>
          </div>
        )}

        <SupportingFigures keyName={component.key} figures={component.supporting_figures || {}} />
      </div>
    </details>
  )
}

function SupportingFigures({ keyName, figures }) {
  if (keyName === 'attendance_frequency') {
    const matches = figures.matches_by_class || {}
    const attended = figures.attended_by_class || {}
    return (
      <div className={styles.figuresGrid}>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Partidos asistidos / evaluados</span>
          <span className={styles.figureValue}>
            {figures.total_attended || 0} de {figures.total_matches || 0}
          </span>
          <div className={styles.classBreakdown}>
            <div className={styles.classRow}>
              <span>Clase A (factor 1.0)</span>
              <strong>
                {attended.A || 0} / {matches.A || 0}
              </strong>
            </div>
            <div className={styles.classRow}>
              <span>Clase B (factor 1.3)</span>
              <strong>
                {attended.B || 0} / {matches.B || 0}
              </strong>
            </div>
            <div className={styles.classRow}>
              <span>Clase C (factor 1.8)</span>
              <strong>
                {attended.C || 0} / {matches.C || 0}
              </strong>
            </div>
          </div>
        </div>
        {figures.effective_start && (
          <div className={styles.figureBox}>
            <span className={styles.figureLabel}>Ventana de evaluación</span>
            <span className={styles.figureValue}>Desde {figures.effective_start}</span>
          </div>
        )}
      </div>
    )
  }

  if (keyName === 'attendance_distance') {
    return (
      <div className={styles.figuresGrid}>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Distancia declarada al estadio</span>
          <span className={styles.figureValue}>{figures.distance_km || '0.00'} km</span>
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Partidos asistidos computados</span>
          <span className={styles.figureValue}>{figures.attended_matches || 0}</span>
        </div>
      </div>
    )
  }

  if (keyName === 'institutional') {
    const activities = figures.activity_months || {}
    return (
      <div className={styles.figuresGrid}>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Eventos institucionales</span>
          <span className={styles.figureValue}>
            {figures.events_count || 0} eventos ({figures.event_points || 0} pts)
          </span>
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Actividades recurrentes</span>
          <span className={styles.figureValue}>{figures.activity_points || 0} pts acumulados</span>
          {Object.keys(activities).length > 0 && (
            <div className={styles.classBreakdown}>
              {Object.entries(activities).map(([kind, months]) => (
                <div key={kind} className={styles.classRow}>
                  <span>{kind.replace(/_/g, ' ')}</span>
                  <strong>{months} meses</strong>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Total puntos brutos institucionales</span>
          <span className={styles.figureValue}>{figures.total_points_before_cap || 0} pts</span>
        </div>
      </div>
    )
  }

  if (keyName === 'seniority_age') {
    return (
      <div className={styles.figuresGrid}>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Antigüedad ininterrumpida</span>
          <span className={styles.figureValue}>{figures.seniority_years || 0} años</span>
          {figures.seniority_start && (
            <span className={styles.figureLabel} style={{ marginTop: '0.2rem' }}>
              Desde {figures.seniority_start}
            </span>
          )}
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Edad del socio</span>
          <span className={styles.figureValue}>{figures.age_years || 0} años</span>
        </div>
      </div>
    )
  }

  if (keyName === 'new_member_bonus') {
    return (
      <div className={styles.figuresGrid}>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Días desde la fecha de alta</span>
          <span className={styles.figureValue}>{figures.days_since_alta || 0} días</span>
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Estado del bono</span>
          <span className={styles.figureValue}>{figures.bonus_applied ? 'Bono otorgado' : 'No aplicable'}</span>
        </div>
      </div>
    )
  }

  if (keyName === 'cap_adjustment') {
    return (
      <div className={styles.figuresGrid}>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Suma antes del tope</span>
          <span className={styles.figureValue}>{figures.unadjusted_sum || '0.00'} pts</span>
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Tope máximo reglamentario</span>
          <span className={styles.figureValue}>{figures.max_cap || '100.00'} pts</span>
        </div>
        <div className={styles.figureBox}>
          <span className={styles.figureLabel}>Ajuste aplicado</span>
          <span className={styles.figureValue}>{figures.difference || '0.00'} pts</span>
        </div>
      </div>
    )
  }

  return null
}

export default ScoreBreakdownPage
