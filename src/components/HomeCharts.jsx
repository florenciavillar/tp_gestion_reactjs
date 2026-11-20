import { formatEventTime, formatRemaining } from '../services/eventFormat.js'
import styles from './HomeCharts.module.css'

const TIME_ZONE = 'America/Argentina/Buenos_Aires'
const tileFormat = (options) => new Intl.DateTimeFormat('es-AR', { timeZone: TIME_ZONE, ...options })
const weekdayFormat = tileFormat({ weekday: 'short' })
const dayFormat = tileFormat({ day: 'numeric' })
const monthFormat = tileFormat({ month: 'short' })
const percentFormat = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

const short = (format, iso) => format.format(new Date(iso)).replace('.', '')

// El gráfico de una tarjeta del inicio, según `chart.kind` (lo arma homeSummaries.js).
function HomeChart({ chart }) {
  switch (chart.kind) {
    case 'gauge':
      return <Gauge {...chart} />
    case 'date':
      return <DateTile {...chart} />
    case 'bars':
      return <Bars {...chart} />
    case 'months':
      return <Months {...chart} />
    case 'timeline':
      return <Timeline {...chart} />
    case 'segments':
      return <Segments {...chart} />
    default:
      return null
  }
}

// Puntaje de 0 a 100 en un anillo, y en qué parte del ranking está el socio.
function Gauge({ value, display, position, total }) {
  const radius = 52
  const circumference = 2 * Math.PI * radius
  const filled = (Math.min(Math.max(value, 0), 100) / 100) * circumference
  // Porcentaje de socios que quedaron por debajo en el ranking.
  const ahead = position != null && total ? ((total - position) / total) * 100 : null

  return (
    <div className={styles.gauge}>
      <svg viewBox="0 0 128 128" className={styles.ring} role="img" aria-label={`Puntaje ${display} de 100`}>
        <circle cx="64" cy="64" r={radius} className={styles.ringTrack} />
        <circle
          cx="64"
          cy="64"
          r={radius}
          className={styles.ringValue}
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 64 64)"
        />
        <text x="64" y="64" className={styles.ringNumber}>
          {display}
        </text>
        <text x="64" y="86" className={styles.ringUnit}>
          de 100
        </text>
      </svg>

      {ahead !== null && (
        <div className={styles.percentile}>
          <p className={styles.percentileText}>
            Estás por encima del <strong>{percentFormat.format(ahead)} %</strong> de los socios
          </p>
          <div className={styles.percentileTrack} aria-hidden="true">
            <span style={{ width: `${Math.max(ahead, 2)}%` }} />
          </div>
          <div className={styles.percentileScale} aria-hidden="true">
            <span>Último</span>
            <span>Primero</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Fecha del próximo evento como hoja de almanaque.
function DateTile({ iso, title, place, type }) {
  return (
    <div className={styles.dateRow}>
      <div className={styles.tile} aria-hidden="true">
        <span className={styles.tileWeekday}>{short(weekdayFormat, iso)}</span>
        <span className={styles.tileDay}>{dayFormat.format(new Date(iso))}</span>
        <span className={styles.tileMonth}>{short(monthFormat, iso)}</span>
      </div>
      <div className={styles.dateInfo}>
        <strong className={styles.dateTitle}>{title}</strong>
        <span>
          {formatEventTime(iso)} h{place ? ` · ${place}` : ''}
        </span>
        {type && <span className={styles.dateType}>{type}</span>}
      </div>
    </div>
  )
}

// Lo que más suma (verde) y lo que más resta (rojo), con el largo según cuánto pesa.
function Bars({ items }) {
  const max = Math.max(...items.map((i) => Math.abs(i.value)), 1)
  return (
    <ul className={styles.bars}>
      {items.map((item) => (
        <li key={item.label} data-sign={item.value < 0 ? 'minus' : 'plus'}>
          <span className={styles.barLabel}>{item.label}</span>
          <span className={styles.barTrack} aria-hidden="true">
            <span style={{ width: `${(Math.abs(item.value) / max) * 100}%` }} />
          </span>
          <span className={styles.barValue}>{item.display}</span>
        </li>
      ))}
    </ul>
  )
}

// Eventos por mes, en columnas.
function Months({ months }) {
  const max = Math.max(...months.map((m) => m.value), 1)
  const summary = months.map((m) => `${m.label}: ${m.value}`).join(', ')
  return (
    <div className={styles.months} role="img" aria-label={`Eventos por mes. ${summary}`}>
      {months.map((m) => (
        <div key={m.key} className={styles.month}>
          <span className={styles.monthValue}>{m.value > 0 ? m.value : ''}</span>
          <span
            className={styles.monthBar}
            style={{ height: `${(m.value / max) * 100}%` }}
            data-empty={m.value === 0}
          />
          <span className={styles.monthLabel}>{m.label}</span>
        </div>
      ))}
    </div>
  )
}

const WEEK_SECONDS = 7 * 86_400

// Plazos de publicación de los próximos 7 días; los vencidos, aparte y en rojo.
function Timeline({ expired, points }) {
  const inWeek = points.filter((p) => p.seconds <= WEEK_SECONDS)
  const later = points.length - inWeek.length
  const label = `${inWeek.length} plazos en los próximos 7 días, ${expired} vencidos, ${later} más adelante`

  return (
    <div className={styles.timeline} role="img" aria-label={label}>
      <div className={styles.timelineRow}>
        {expired > 0 && <span className={styles.expired}>{expired} vencidos</span>}
        <div className={styles.track}>
          {inWeek.map((p) => (
            <span
              key={p.id}
              className={styles.dot}
              data-soon={p.seconds <= 86_400}
              style={{ left: `${(p.seconds / WEEK_SECONDS) * 100}%` }}
              title={`${p.title} · en ${formatRemaining(p.seconds)}`}
            />
          ))}
        </div>
      </div>
      <div className={styles.timelineScale} aria-hidden="true">
        <span>Hoy</span>
        <span>{later > 0 ? `7 días · ${later} más adelante` : '7 días'}</span>
      </div>
    </div>
  )
}

// En qué estado están las cosas, como una barra partida en tramos.
function Segments({ total, unit, segments }) {
  const visible = segments.filter((s) => s.value > 0)
  return (
    <div className={styles.segments}>
      <p className={styles.segmentsTotal}>
        <strong>{total}</strong> {unit}
      </p>
      <div
        className={styles.segmentBar}
        role="img"
        aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(', ')}
      >
        {visible.map((s) => (
          <span key={s.label} data-tone={s.tone} style={{ flexGrow: s.value }} />
        ))}
      </div>
      <ul className={styles.legend}>
        {segments.map((s) => (
          <li key={s.label} data-tone={s.tone}>
            <span className={styles.swatch} aria-hidden="true" />
            {s.label} <strong>{s.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default HomeChart
