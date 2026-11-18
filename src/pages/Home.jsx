import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import HeroHeader from '../components/HeroHeader.jsx'
import { useAuth } from '../components/authContext.js'
import {
  attendanceSummary,
  breakdownSummary,
  explanationSummary,
  simulatorSummary,
  formulaSummary,
  myScoreSummary,
  pendingEventsSummary,
  rankingSummary,
  segmentationSummary,
  simulatorSettingsSummary,
  upcomingEventsSummary,
} from '../services/homeSummaries.js'
import pageStyles from './Page.module.css'
import styles from './Home.module.css'

// Los mismos íconos que la barra lateral.
const ICONS = {
  events: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 10h18M8 3v4M16 3v4',
  score: 'M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8 20h8',
  breakdown: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  explanation: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01',
  simulator: 'M4 18l5-6 4 3 7-9M15 6h5v5',
  formula:
    'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 4a2 2 0 1 1 0 4 2 2 0 0 1 0-4M10 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4M18 16a2 2 0 1 1 0 4 2 2 0 0 1 0-4',
  ranking: 'M4 20h16M7 20v-6M12 20V6M17 20v-10',
  waves: 'M3 7c3-2 6 2 9 0s6-2 9 0M3 12c3-2 6 2 9 0s6-2 9 0M3 17c3-2 6 2 9 0s6-2 9 0',
  settings: 'M4 6h16M4 12h16M4 18h16M8 4v4M16 10v4M11 16v4',
  attendance: 'M9 4h6v3H9zM9 5H6v16h12V5h-3M9 13l2 2 4-4',
}

// Cada tarjeta repite una opción de la barra lateral del rol, con un resumen de lo que hay en esa sección.
const MEMBER_SECTIONS = [
  {
    to: '/events',
    icon: 'events',
    title: 'Eventos',
    description: 'Partidos y eventos del club, y tu turno para reservar.',
    load: upcomingEventsSummary,
  },
  {
    to: '/ranking',
    icon: 'score',
    title: 'Mi puntaje',
    description: 'Tu prioridad de acceso a la compra de entradas.',
    load: myScoreSummary,
  },
  {
    to: '/ranking/breakdown',
    icon: 'breakdown',
    title: 'Desglose',
    description: 'De dónde sale cada punto de tu puntaje.',
    load: breakdownSummary,
  },
  {
    to: '/ranking/explanation',
    icon: 'explanation',
    title: 'Cómo se calcula',
    description: 'La fórmula del club explicada en criollo.',
    load: explanationSummary,
  },
  {
    to: '/ranking/simulator',
    icon: 'simulator',
    title: 'Simulador',
    description: 'Mirá cuánto cambia tu puntaje si vas o no a un evento.',
    load: simulatorSummary,
  },
]

const ADMIN_SECTIONS = [
  {
    to: '/events',
    icon: 'events',
    title: 'Eventos',
    description: 'Eventos que mandó el club y falta publicar.',
    load: pendingEventsSummary,
  },
  {
    to: '/admin/formula',
    icon: 'formula',
    title: 'Fórmula',
    description: 'Cómo se calcula el puntaje de los socios.',
    load: formulaSummary,
  },
  {
    to: '/admin/ranking',
    icon: 'ranking',
    title: 'Ranking',
    description: 'El orden de prioridad de los socios.',
    load: rankingSummary,
  },
  {
    to: '/admin/segmentation',
    icon: 'waves',
    title: 'Oleadas',
    description: 'Olas y cronogramas de reserva de cada partido.',
    load: segmentationSummary,
  },
  {
    to: '/admin/rules-simulation',
    icon: 'simulator',
    title: 'Simular reglas',
    description: 'Probá otros valores de la fórmula y compará el ranking, sin publicar nada.',
  },
  {
    to: '/admin/simulator',
    icon: 'settings',
    title: 'Configuración Socios',
    description: 'Qué ven los socios en su simulador.',
    load: simulatorSettingsSummary,
  },
  {
    to: '/admin/attendance',
    icon: 'attendance',
    title: 'Cargar asistencias',
    description: 'Asistencias a eventos y actividades del club.',
    load: attendanceSummary,
  },
]

// Inicio común a socios y administradores: saludo y una tarjeta por sección del rol.
function Home() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const sections = isAdmin ? ADMIN_SECTIONS : MEMBER_SECTIONS

  return (
    <main className={`${pageStyles.page} ${styles.page}`}>
      <HeroHeader
        title={`Hola, ${user.name}`}
        lead={isAdmin ? 'Esto es lo que está pasando hoy en el club.' : 'Tu puntaje y los próximos eventos del club.'}
      />

      <section aria-labelledby="home-sections">
        <h2 id="home-sections" className={styles.srOnly}>
          Secciones
        </h2>
        <ul className={styles.grid}>
          {sections.map((section) => (
            <li key={section.to}>
              <SectionCard {...section} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}

function SectionCard({ to, icon, title, description, load }) {
  const summary = useSummary(load)
  const badge = summary.status === 'ready' ? summary.data.badge : undefined

  return (
    <Link to={to} className={styles.card}>
      <span className={styles.stripe} data-tone={badge?.tone} aria-hidden="true" />
      <div className={styles.cardTop}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d={ICONS[icon]} />
          </svg>
        </span>
        {badge && (
          <span className={styles.badge} data-tone={badge.tone}>
            {badge.text}
          </span>
        )}
      </div>

      <div>
        <h3 className={styles.cardTitle}>{title}</h3>
        <p className={styles.description}>{description}</p>
      </div>

      {summary.status === 'loading' && (
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
        </div>
      )}
      {summary.status === 'error' && <p className={styles.muted}>No pudimos cargar el resumen.</p>}
      {summary.status === 'ready' && <Summary data={summary.data} />}

      <span className={styles.go}>
        Ir a {title}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  )
}

function Summary({ data }) {
  const stats = data.stats ?? []
  const rows = data.rows ?? []
  const lines = data.lines ?? []
  return (
    <>
      {stats.length > 0 && (
        <dl className={styles.stats}>
          {stats.map((s) => (
            <div key={s.label} data-tone={s.tone}>
              <dt>{s.label}</dt>
              <dd>{s.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {rows.length > 0 && (
        <dl className={styles.rows}>
          {rows.map((r) => (
            <div key={r.label} data-tone={r.tone}>
              <dt>{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {lines.length > 0 && (
        <ul className={styles.lines}>
          {lines.map((l) => (
            <li key={l.text} data-tone={l.tone}>
              {l.text}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

// Sin `load`, la tarjeta muestra solo su descripción.
function useSummary(load) {
  const [state, setState] = useState(load ? { status: 'loading' } : { status: 'none' })

  useEffect(() => {
    if (!load) return
    let ignore = false
    load()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [load])

  return state
}

export default Home
