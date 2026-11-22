import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import HeroHeader from '../components/HeroHeader.jsx'
import HomeChart from '../components/HomeCharts.jsx'
import { useAuth } from '../components/authContext.js'
import {
  attendanceSummary,
  breakdownSummary,
  explanationSummary,
  simulatorSummary,
  formulaSummary,
  historySummary,
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
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l3 2',
  todo: 'M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2',
}

// Cada tarjeta repite una opción de la barra lateral del rol, con un resumen de lo que hay en esa sección.
// size: 'lg' (lo principal del rol, con gráfico), 'md' (gráfico o lista), 'sm' (un dato y el acceso).
// Van en orden de importancia: en el celular quedan en una columna, en ese orden.
const MEMBER_SECTIONS = [
  {
    to: '/ranking',
    icon: 'score',
    title: 'Mi puntaje',
    description: 'Tu prioridad de acceso a la compra de entradas.',
    load: myScoreSummary,
    size: 'lg',
  },
  {
    to: '/events',
    icon: 'events',
    title: 'Próximo evento',
    goLabel: 'Ver todos los eventos',
    description: 'Partidos y eventos del club, y tu turno para reservar.',
    load: upcomingEventsSummary,
    size: 'md',
  },
  {
    to: '/ranking#desglose',
    icon: 'breakdown',
    title: 'Desglose',
    description: 'Lo que más suma y lo que más resta en tu puntaje.',
    load: breakdownSummary,
    size: 'md',
  },
  {
    to: '/ranking/history',
    icon: 'history',
    title: 'Mi historial',
    description: 'Los eventos a los que fuiste, mes a mes.',
    load: historySummary,
    size: 'md',
  },
  {
    to: '/ranking/explanation',
    icon: 'explanation',
    title: 'Cómo se calcula',
    description: 'La fórmula del club explicada en criollo.',
    load: explanationSummary,
    size: 'sm',
  },
  {
    to: '/ranking/simulator',
    icon: 'simulator',
    title: 'Simulador',
    description: 'Mirá cuánto cambia tu puntaje si vas o no a un evento.',
    load: simulatorSummary,
    size: 'sm',
  },
]

const ADMIN_SECTIONS = [
  {
    to: '/events',
    icon: 'events',
    title: 'Eventos pendientes',
    goLabel: 'Ir a Eventos',
    description: 'Plazos de publicación de los próximos 7 días.',
    load: pendingEventsSummary,
    size: 'md',
  },
  {
    to: '/admin/segmentation',
    icon: 'waves',
    title: 'Oleadas',
    description: 'En qué estado están los partidos por jugarse.',
    load: segmentationSummary,
    size: 'md',
  },
  {
    to: '/admin/ranking',
    icon: 'ranking',
    title: 'Ranking',
    description: 'El orden de prioridad de los socios.',
    load: rankingSummary,
    size: 'md',
  },
  {
    to: '/admin/formula',
    icon: 'formula',
    title: 'Fórmula',
    description: 'Cómo se calcula el puntaje de los socios.',
    load: formulaSummary,
    size: 'sm',
  },
  {
    to: '/admin/attendance',
    icon: 'attendance',
    title: 'Asistencias',
    goLabel: 'Ir a Cargar asistencias',
    description: 'Asistencias a eventos y actividades del club.',
    load: attendanceSummary,
    size: 'sm',
  },
]

// Secciones sin mucho para resumir: van como accesos rápidos al pie.
const ADMIN_SHORTCUTS = [
  {
    to: '/admin/rules-simulation',
    icon: 'simulator',
    title: 'Simular reglas',
    description: 'Probá otros valores de la fórmula sin publicar nada.',
  },
  {
    to: '/admin/simulator',
    icon: 'settings',
    title: 'Configuración Socios',
    description: 'Qué ven los socios en su simulador.',
    load: simulatorSettingsSummary,
  },
]

// Las secciones del admin que suman tareas a "Para hacer hoy", en orden de urgencia de la sección.
const TASK_SOURCES = [pendingEventsSummary, formulaSummary, rankingSummary, segmentationSummary, attendanceSummary]
const TONE_ORDER = { alert: 0, warn: 1 }

// Inicio común a socios y administradores: saludo y una tarjeta por sección del rol.
function Home() {
  const { user } = useAuth()
  const isAdmin = user.role === 'admin'
  const sections = isAdmin ? ADMIN_SECTIONS : MEMBER_SECTIONS
  // Cada resumen se pide una sola vez aunque lo usen dos tarjetas (la de la sección y "Para hacer hoy").
  const [cache] = useState(() => new Map())
  const run = useCallback(
    (load) => {
      if (!cache.has(load)) cache.set(load, load())
      return cache.get(load)
    },
    [cache],
  )

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
          {isAdmin && (
            <li className={styles.full}>
              <TodoCard run={run} />
            </li>
          )}
          {sections.map((section) => (
            <li key={section.to} data-size={section.size}>
              <SectionCard {...section} run={run} />
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <section aria-labelledby="home-shortcuts">
          <h2 id="home-shortcuts" className={styles.sectionTitle}>
            Accesos rápidos
          </h2>
          <ul className={styles.shortcuts}>
            {ADMIN_SHORTCUTS.map((shortcut) => (
              <li key={shortcut.to}>
                <Shortcut {...shortcut} run={run} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Icon({ name }) {
  return (
    <span className={styles.icon} aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d={ICONS[name]} />
      </svg>
    </span>
  )
}

function SectionCard({ to, icon, title, goLabel, description, load, size, run }) {
  const summary = useSummary(load, run)
  const badge = summary.status === 'ready' ? summary.data.badge : undefined

  return (
    <Link to={to} className={styles.card} data-size={size}>
      <span className={styles.stripe} data-tone={badge?.tone} aria-hidden="true" />
      <div className={styles.cardTop}>
        <Icon name={icon} />
        <div className={styles.heading}>
          <h3 className={styles.cardTitle}>{title}</h3>
          {size !== 'sm' && <p className={styles.description}>{description}</p>}
        </div>
        {badge && (
          <span className={styles.badge} data-tone={badge.tone}>
            {badge.text}
          </span>
        )}
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
        {goLabel ?? `Ir a ${title}`}
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </Link>
  )
}

// Junta lo pendiente de todas las secciones del admin, lo más urgente primero.
function TodoCard({ run }) {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    Promise.allSettled(TASK_SOURCES.map(run)).then((results) => {
      if (ignore) return
      const tasks = results
        .filter((r) => r.status === 'fulfilled')
        .flatMap((r) => r.value.tasks ?? [])
        .sort((a, b) => (TONE_ORDER[a.tone] ?? 2) - (TONE_ORDER[b.tone] ?? 2))
      const failed = results.some((r) => r.status === 'rejected')
      setState({ status: 'ready', tasks, failed })
    })
    return () => {
      ignore = true
    }
  }, [run])

  const tasks = state.tasks ?? []
  const urgent = tasks.some((t) => t.tone === 'alert')
  const badge =
    state.status !== 'ready'
      ? undefined
      : tasks.length === 0
        ? { text: 'Todo al día', tone: 'ok' }
        : {
            text: `${tasks.length} ${tasks.length === 1 ? 'pendiente' : 'pendientes'}`,
            tone: urgent ? 'alert' : 'warn',
          }

  return (
    <div className={`${styles.card} ${styles.todo}`}>
      <span className={styles.stripe} data-tone={badge?.tone} aria-hidden="true" />
      <div className={styles.cardTop}>
        <Icon name="todo" />
        <div className={styles.heading}>
          <h3 className={styles.cardTitle}>Para hacer hoy</h3>
          <p className={styles.description}>Lo que está esperando una acción tuya, lo más urgente primero.</p>
        </div>
        {badge && (
          <span className={styles.badge} data-tone={badge.tone}>
            {badge.text}
          </span>
        )}
      </div>

      {state.status === 'loading' && (
        <div className={styles.skeleton} aria-hidden="true">
          <span />
          <span />
        </div>
      )}

      {state.status === 'ready' && tasks.length === 0 && (
        <p className={styles.allDone}>No hay nada esperando. Todas las secciones están al día.</p>
      )}

      {tasks.length > 0 && (
        <ul className={styles.tasks}>
          {tasks.map((task) => (
            <li key={task.text} data-tone={task.tone}>
              <span className={styles.taskDot} aria-hidden="true" />
              <span className={styles.taskText}>{task.text}</span>
              <Link to={task.to} className={styles.taskAction}>
                {task.action}
                <span className={styles.srOnly}>: {task.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {state.failed && <p className={styles.muted}>No pudimos revisar todas las secciones.</p>}
    </div>
  )
}

function Shortcut({ to, icon, title, description, load, run }) {
  const summary = useSummary(load, run)
  const badge = summary.status === 'ready' ? summary.data.badge : undefined
  return (
    <Link to={to} className={styles.shortcut}>
      <Icon name={icon} />
      <span className={styles.shortcutText}>
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      {badge && (
        <span className={styles.badge} data-tone={badge.tone}>
          {badge.text}
        </span>
      )}
    </Link>
  )
}

function Summary({ data }) {
  const stats = data.stats ?? []
  const rows = data.rows ?? []
  const lines = data.lines ?? []
  return (
    <>
      {data.chart && <HomeChart chart={data.chart} />}
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
function useSummary(load, run) {
  const [state, setState] = useState(load ? { status: 'loading' } : { status: 'none' })

  useEffect(() => {
    if (!load) return
    let ignore = false
    run(load)
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch(() => {
        if (!ignore) setState({ status: 'error' })
      })
    return () => {
      ignore = true
    }
  }, [load, run])

  return state
}

export default Home
