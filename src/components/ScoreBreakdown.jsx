import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router'
import { getScoreBreakdown } from '../services/formula.js'
import authStyles from '../pages/Auth.module.css'
import pageStyles from '../pages/Page.module.css'
import styles from './ScoreBreakdown.module.css'

const LOAD_ERROR = 'No pudimos cargar el desglose de tu puntaje. Probá de nuevo en un rato.'

// HU-16: desglose del puntaje del socio, como sección de "Mi puntaje". Empieza colapsada y se abre
// tocando el título. `reveal` ({ n, smooth }) la abre y baja hasta ella: cambia cada vez que se toca
// "Ver desglose", o viene de entrada si se llegó con /ranking#desglose (desde el inicio). Espera a que
// carguen el desglose y el resto de la página (`pageReady`) para no bajar a una posición que se corre.
export default function ScoreBreakdown({ reveal = null, pageReady = true }) {
  const [state, setState] = useState({ status: 'loading' })
  // Lo último que eligió el socio con el título, y a qué pedido de `reveal` respondía. Un pedido
  // nuevo (más alto que `at`) abre la sección aunque el socio la hubiera cerrado antes.
  const [toggle, setToggle] = useState({ open: false, at: 0 })
  const sectionRef = useRef(null)
  const bodyId = useId()

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

  const loaded = state.status !== 'loading'
  const revealCount = reveal?.n ?? 0
  const smooth = reveal?.smooth
  const open = revealCount > toggle.at ? true : toggle.open

  // Bajar hasta la sección cuando hay un pedido y la página ya no se va a mover.
  useEffect(() => {
    if (!revealCount || !loaded || !pageReady) return
    const frame = requestAnimationFrame(() =>
      sectionRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' }),
    )
    return () => cancelAnimationFrame(frame)
  }, [revealCount, smooth, loaded, pageReady])

  return (
    <section id="desglose" ref={sectionRef} className={styles.section} aria-labelledby="breakdown-title">
      <h2 id="breakdown-title" className={styles.sectionTitle}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => setToggle({ open: !open, at: revealCount })}
        >
          <span className={styles.toggleText}>
            <span>Desglose</span>
            <span className={styles.toggleHint}>
              De dónde sale cada punto de tu puntaje, componente por componente.
            </span>
          </span>
          <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </h2>

      <div id={bodyId} className={styles.body} hidden={!open}>
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
          <div className={pageStyles.card}>
            <div className={styles.emptyBody}>
              <h3 className={styles.emptyTitle}>Sin ranking completado</h3>
              <p className={styles.emptyMessage}>{state.data.message}</p>
            </div>
          </div>
        )}

        {state.status === 'ready' && state.data.has_ranking && (
          <div className={styles.dashboardLayout}>
            <div className={styles.summaryCard}>
              <div className={styles.summaryHeader}>
                <div className={styles.badges}>
                  {state.data.rules_version && <span className={styles.badge}>Reglas v{state.data.rules_version}</span>}
                  {state.data.calculation_date && (
                    <span className={`${styles.badge} ${styles.badgeMuted}`}>Fecha: {state.data.calculation_date}</span>
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
            </div>

            <div className={styles.componentsGrid}>
              {state.data.components.map((comp) => (
                <ComponentItem key={comp.key} component={comp} />
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
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
    <div className={styles.componentCard}>
      <div className={styles.componentSummary}>
        <div className={styles.nameRow}>
          <span className={styles.componentName}>{capitalize(component.name)}</span>
        </div>
        <span className={badgeClass}>{signedPoints}</span>
      </div>

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
    </div>
  )
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
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
