import { useEffect, useState } from 'react'
import { formatDateTime } from '../services/eventFormat.js'
import { formatScore } from '../services/memberScore.js'
import { getPillarRankings } from '../services/ranking.js'
import styles from './PillarRankings.module.css'

const LOAD_ERROR_MESSAGE = 'No pudimos cargar los rankings por pilar. Probá de nuevo más tarde.'

// Ícono y bajada de cada pilar. Un pilar que no figura acá usa los de Asistencia.
const PILLAR_LOOK = {
  attendance: {
    caption: 'Frecuencia y distancia a los partidos',
    icon: (
      // Pelota
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="m12 7 4 3-1.5 4.5h-5L8 10zM12 7V3.5M16 10l3.5-1.5M14.5 14.5l2 3.5M9.5 14.5l-2 3.5M8 10 4.5 8.5" />
      </svg>
    ),
  },
  institutional: {
    caption: 'Actividades institucionales del club',
    icon: (
      // Edificio del club
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 21h18M4 10h16M12 3l8 4.5H4zM6 10v8M10 10v8M14 10v8M18 10v8" />
      </svg>
    ),
  },
  seniority_age: {
    caption: 'Años de socio y edad',
    icon: (
      // Reloj
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    ),
  },
}

// HU-44: top 10 de cada pilar del ranking vigente. Solo lectura y solo para Admins.
// `refreshKey` cambia cuando cambia la última corrida (id o estado): así se vuelven a pedir al
// empezar un cálculo (para mostrar «actualizando») y al terminar (para ver las tablas nuevas).
export default function PillarRankings({ refreshKey }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    getPillarRankings()
      .then((result) => {
        if (ignore) return
        setData(result)
        setError('')
      })
      .catch((err) => {
        if (ignore) return
        // 401: el AuthProvider ya cerró la sesión y la ruta redirige al login.
        if (err.status !== 401) setError(LOAD_ERROR_MESSAGE)
      })
    return () => {
      ignore = true
    }
  }, [refreshKey])

  return (
    <section className={styles.section} aria-labelledby="pillar-rankings-title">
      <header className={styles.header}>
        <div className={styles.heading}>
          <h2 id="pillar-rankings-title" className={styles.title}>
            Rankings por pilar
          </h2>
          <p className={styles.subtitle}>Los 10 socios que más puntos sumaron en cada parte del puntaje.</p>
        </div>
        <div className={styles.meta}>
          {data?.updating && (
            <span className={styles.updating} role="status">
              <span className={styles.updatingDot} aria-hidden="true" />
              actualizando
            </span>
          )}
          {data?.ranking && (
            <>
              <span className={styles.chip}>
                Reglas <strong>v{data.ranking.rules_version}</strong>
              </span>
              <span className={styles.chip}>
                Vigente desde <strong>{formatDateTime(data.ranking.completed_at)}</strong>
              </span>
            </>
          )}
        </div>
      </header>
      <PillarRankingsBody data={data} error={error} />
    </section>
  )
}

function PillarRankingsBody({ data, error }) {
  if (error && !data) {
    return (
      <p className={styles.error} role="alert">
        {error}
      </p>
    )
  }
  if (!data) {
    return (
      <div className={styles.grid} aria-busy="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`${styles.card} ${styles.skeleton}`} />
        ))}
        <span className={styles.srOnly}>Cargando…</span>
      </div>
    )
  }
  if (data.message) {
    return (
      <div className={styles.emptyState}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3" />
        </svg>
        <p>{data.message}</p>
      </div>
    )
  }

  return (
    <div className={`${styles.grid} ${data.updating ? styles.stale : ''}`}>
      {data.pillars.map((pillar) => (
        <PillarCard key={pillar.key} pillar={pillar} />
      ))}
    </div>
  )
}

function PillarCard({ pillar }) {
  const look = PILLAR_LOOK[pillar.key] ?? PILLAR_LOOK.attendance
  const titleId = `pillar-${pillar.key}-title`
  const [leader, ...rest] = pillar.rows
  // Las barras se miden contra el primero: muestran qué tan cerca está cada socio del líder.
  const top = leader ? Number(leader.points) : 0

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <div className={styles.cardHeader}>
        <span className={styles.icon}>{look.icon}</span>
        <div>
          <h3 id={titleId} className={styles.cardTitle}>
            {pillar.name}
          </h3>
          <p className={styles.caption}>{look.caption}</p>
        </div>
      </div>

      {!leader ? (
        <p className={styles.emptyPillar}>{pillar.empty_message}</p>
      ) : (
        <ol className={styles.list}>
          <li className={styles.leader}>
            <span className={styles.position}>
              <span className={styles.srOnly}>Posición </span>1
            </span>
            <span className={styles.leaderInfo}>
              <span className={styles.leaderName}>{leader.nombre}</span>
              <span className={styles.number}>Socio N.º {leader.numero_socio}</span>
            </span>
            <span className={styles.leaderPoints}>
              {formatScore(leader.points)}
              <small>pts</small>
            </span>
          </li>
          {rest.map((row) => (
            <li key={row.numero_socio} className={styles.row}>
              <span className={styles.position}>
                <span className={styles.srOnly}>Posición </span>
                {row.position}
              </span>
              <span className={styles.rowInfo}>
                <span className={styles.rowLine}>
                  <span className={styles.name}>{row.nombre}</span>
                  <span className={styles.points}>{formatScore(row.points)}</span>
                </span>
                <span className={styles.rowLine}>
                  <span className={styles.number}>N.º {row.numero_socio}</span>
                </span>
                <span className={styles.bar} aria-hidden="true">
                  <span
                    className={styles.barFill}
                    style={{ width: `${top > 0 ? Math.max(4, (Number(row.points) / top) * 100) : 0}%` }}
                  />
                </span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </article>
  )
}
