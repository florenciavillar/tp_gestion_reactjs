import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router'
import EquityChart from '../components/EquityChart.jsx'
import { withUnit } from '../services/formula.js'
import {
  BREAKDOWN_UNAVAILABLE,
  equityGroups,
  exportRulesSimulation,
  formatDecimal,
  formatInteger,
  formatSigned,
  getBreakdown,
  rulesSimulationErrorMessage,
} from '../services/rulesSimulation.js'
import authStyles from './Auth.module.css'
import formulaStyles from './Formula.module.css'
import pageStyles from './Page.module.css'
import styles from './RulesSimulation.module.css'

const STATS = [
  ['mean', 'Media'],
  ['median', 'Mediana'],
  ['std_dev', 'Desvío estándar'],
  ['p10', 'Percentil 10'],
  ['p90', 'Percentil 90'],
]

const SATURATION = [
  ['at_cap', 'En el tope de 100'],
  ['needs_cap_adjustment', 'Con ajuste por tope'],
  ['tied', 'Empatados'],
  ['largest_tie', 'Empate más grande'],
]

// HU-29: resultado de la simulación que se acaba de hacer. Vive solo en memoria, en el estado del flujo
// (RulesSimulationFlow): si se recarga la página o se entra directo, se vuelve al formulario.
function RulesSimulationResult() {
  const { simulation, setSimulation } = useOutletContext()
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')
  const pending = simulation?.result.breakdown.status === 'pending'
  const hasBreakdown = Boolean(simulation?.breakdown)
  const simulationId = simulation?.id

  // El desglose se pide apenas se ve el resultado, sin bloquearlo (escenario 21). La respuesta se
  // guarda solo si sigue siendo la misma simulación: un desglose viejo nunca pisa a uno nuevo (escenario 24).
  useEffect(() => {
    if (!pending || hasBreakdown) return
    const keep = (breakdown) =>
      setSimulation((current) => (current?.id === simulationId ? { ...current, breakdown } : current))
    getBreakdown(simulation.result.ranking.id, simulation.values)
      .then((data) => keep(data.status === 'available' ? { status: 'available', data } : { status: 'message', data }))
      .catch((err) =>
        keep({
          status: 'unavailable',
          message: err.code === 'BASELINE_NOT_FOUND' ? err.reason : BREAKDOWN_UNAVAILABLE,
        }),
      )
  }, [simulation, simulationId, pending, hasBreakdown, setSimulation])

  if (!simulation) return <Navigate to="/admin/rules-simulation" replace />

  async function handleExport() {
    setExporting(true)
    setExportError('')
    try {
      await exportRulesSimulation(simulation.result.ranking.id, simulation.values)
    } catch (err) {
      setExportError(rulesSimulationErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/admin/rules-simulation" className={pageStyles.back} aria-label="Volver a simular reglas">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Resultado de la simulación</h1>
        <p className={pageStyles.lead}>Así cambiaría el ranking con los valores que probaste. No se guardó nada.</p>
      </header>

      <p className={styles.baseline}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 20h16M7 20v-6M12 20V6M17 20v-10" />
        </svg>
        <span>{simulation.result.baseline_text}</span>
      </p>
      <Result
        result={simulation.result}
        formula={simulation.formula}
        breakdown={pending ? (simulation.breakdown ?? { status: 'loading' }) : null}
        exporting={exporting}
        exportError={exportError}
        onExport={handleExport}
      />
    </main>
  )
}

function Result({ result, formula, breakdown, exporting, exportError, onExport }) {
  const labels = plainLabels(result.labels)
  const units = Object.fromEntries(formula.parameters.map((p) => [p.key, p.unit]))
  const names = Object.fromEntries(formula.parameters.map((p) => [p.key, p.name]))
  const noChanges = result.status === 'no_changes'
  const total = result.components.find((c) => c.key === 'total')

  return (
    <div className={styles.result}>
      {noChanges && (
        <p className={styles.info} role="status">
          {result.message.text}
        </p>
      )}

      {!noChanges && (
        <section className={formulaStyles.section} aria-labelledby="changed-title">
          <h3 id="changed-title" className={formulaStyles.sectionTitle}>
            Parámetros cambiados
          </h3>
          <div className={formulaStyles.tableWrap}>
            <table className={formulaStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Parámetro</th>
                  <th scope="col">{labels.before}</th>
                  <th scope="col">{labels.after}</th>
                </tr>
              </thead>
              <tbody>
                {result.changed_parameters.map((p) => (
                  <tr key={p.key}>
                    <th scope="row" className={styles.rowHead}>
                      {p.name}
                    </th>
                    <td className={styles.before}>{withUnit(p.before, units[p.key])}</td>
                    <td className={styles.after}>{withUnit(p.after, units[p.key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {result.alerts.map((alert) => (
        <p key={alert.code} className={`${formulaStyles.banner} ${styles.alert}`} role="status">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3 2 21h20L12 3ZM12 10v5M12 18h.01" />
          </svg>
          <span>{alert.text}</span>
        </p>
      ))}

      <Movement movement={result.movement} population={result.ranking.population_size} />

      <div className={styles.widgets}>
        <Widget
          icon="distribution"
          title="Distribución de puntajes"
          teaser={
            <BeforeAfter
              label="Media"
              before={formatDecimal(result.summary.before.mean)}
              after={formatDecimal(result.summary.after.mean)}
              difference={result.summary.difference.mean}
            />
          }
        >
          <div className={formulaStyles.tableWrap}>
            <table className={formulaStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Medida</th>
                  <th scope="col">{labels.before}</th>
                  <th scope="col">{labels.after}</th>
                  <th scope="col">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {STATS.map(([key, label]) => (
                  <tr key={key}>
                    <th scope="row" className={styles.rowHead}>
                      {label}
                    </th>
                    <td className={styles.before}>{formatDecimal(result.summary.before[key])}</td>
                    <td className={styles.after}>{formatDecimal(result.summary.after[key])}</td>
                    <td>
                      <Difference value={result.summary.difference[key]} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Widget>

        <Histogram bins={result.histogram} labels={labels} />

        <Widget
          icon="cap"
          title="Tope y empates"
          teaser={
            <BeforeAfter
              label="En el tope de 100"
              before={formatInteger(result.saturation.before.at_cap)}
              after={formatInteger(result.saturation.after.at_cap)}
            />
          }
        >
          <div className={formulaStyles.tableWrap}>
            <table className={formulaStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Socios</th>
                  <th scope="col">{labels.before}</th>
                  <th scope="col">{labels.after}</th>
                </tr>
              </thead>
              <tbody>
                {SATURATION.map(([key, label]) => (
                  <tr key={key}>
                    <th scope="row" className={styles.rowHead}>
                      {label}
                    </th>
                    <td className={styles.before}>{formatInteger(result.saturation.before[key])}</td>
                    <td className={styles.after}>{formatInteger(result.saturation.after[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Widget>

        <Widget
          icon="components"
          title="Cambio por componente"
          teaser={
            total && (
              <BeforeAfter
                label="Total medio"
                before={formatDecimal(total.before)}
                after={formatDecimal(total.after)}
                difference={total.difference}
              />
            )
          }
        >
          <p className={formulaStyles.hint}>Promedio de cada componente sobre todos los socios.</p>
          <div className={formulaStyles.tableWrap}>
            <table className={formulaStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Componente</th>
                  <th scope="col">{labels.before}</th>
                  <th scope="col">{labels.after}</th>
                  <th scope="col">Diferencia</th>
                </tr>
              </thead>
              <tbody>
                {result.components.map((c) => (
                  <tr key={c.key} className={c.key === 'total' ? styles.totalRow : undefined}>
                    <th scope="row" className={styles.rowHead}>
                      {capitalize(c.label)}
                    </th>
                    <td className={styles.before}>{formatDecimal(c.before)}</td>
                    <td className={styles.after}>{formatDecimal(c.after)}</td>
                    <td>
                      <Difference value={c.difference} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Widget>

        {result.breakdown.status !== 'no_changes' && (
          <Breakdown status={result.breakdown} breakdown={breakdown} names={names} />
        )}
      </div>

      {result.equity && <Equity equity={result.equity} rankingId={result.ranking.id} />}

      <section className={`${formulaStyles.section} ${styles.actionsCard}`} aria-labelledby="actions-title">
        <h3 id="actions-title" className={formulaStyles.srOnly}>
          Acciones
        </h3>
        <p className={formulaStyles.muted}>
          Para hacer oficiales estos valores, ajustá los parámetros en{' '}
          <Link to="/admin/formula" className={styles.link}>
            Fórmula del puntaje
          </Link>
          .
        </p>
        <div className={styles.actionButtons}>
          <Link to="/admin/rules-simulation" className={authStyles.door}>
            Modificar valores
          </Link>
          <button type="button" className={authStyles.doorSecondary} onClick={onExport} disabled={exporting}>
            {exporting ? 'Descargando…' : 'Descargar CSV'}
          </button>
        </div>
        {exportError && (
          <p role="alert" className={`${authStyles.error} ${styles.fullRow}`}>
            {exportError}
          </p>
        )}
      </section>
    </div>
  )
}

// Las columnas dicen solo "Ranking actual": la versión de reglas y la fecha ya están en la línea de la base.
function plainLabels(labels) {
  return { before: withoutSymbol(labels.before), after: labels.after }
}

// Saca el paréntesis final: "(reglas versión 1, 08/11/2026)" o el símbolo técnico, como "(αA)".
function withoutSymbol(text) {
  return text.replace(/\s*\([^)]*\)\s*$/, '')
}

function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text
}

function Difference({ value }) {
  const text = formatSigned(value)
  const tone = text.startsWith('+') ? styles.diffUp : text.startsWith('-') ? styles.diffDown : styles.diffFlat
  return <span className={`${styles.diff} ${tone}`}>{text}</span>
}

// Las posiciones son de suma cero: siempre se muestra la cantidad junto con la magnitud.
function Movement({ movement, population }) {
  const threshold = movement.relevant_threshold
  const puestos = threshold === 1 ? 'puesto' : 'puestos'
  return (
    <section className={formulaStyles.section} aria-labelledby="movement-title">
      <h3 id="movement-title" className={formulaStyles.sectionTitle}>
        Movimiento en el ranking
      </h3>
      <div className={styles.tiles}>
        <Tile tone="up" label="Suben" value={movement.up} population={population} />
        <Tile tone="down" label="Bajan" value={movement.down} population={population} />
        <Tile tone="flat" label="Sin cambios" value={movement.unchanged} population={population} />
      </div>
      <dl className={formulaStyles.summary}>
        <dt>Cambio medio de posición</dt>
        <dd>{formatDecimal(movement.mean_abs_position_change)} puestos</dd>
        <dt>
          Cambian {formatInteger(threshold)} {puestos} o más
        </dt>
        <dd>
          suben {formatInteger(movement.relevant_up)}, bajan {formatInteger(movement.relevant_down)}
        </dd>
      </dl>
    </section>
  )
}

function Tile({ tone, label, value, population }) {
  const share = population > 0 ? (value / population) * 100 : 0
  return (
    <div className={`${styles.tile} ${styles[`tile_${tone}`]}`}>
      <span className={styles.tileLabel}>{label}</span>
      <span className={styles.tileValue}>{formatInteger(value)}</span>
      <span className={styles.tileBar} aria-hidden="true">
        <span style={{ width: `${share}%` }} />
      </span>
    </div>
  )
}

// Barras con CSS, proporcionales al máximo de los 40 valores. Los números exactos van en la tabla.
function Histogram({ bins, labels }) {
  const max = Math.max(1, ...bins.flatMap((b) => [b.before, b.after]))
  return (
    <Widget icon="histogram" title="Histograma de puntajes" teaser={<MiniHistogram bins={bins} max={max} />}>
      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendBefore}>{labels.before}</span>
        <span className={styles.legendAfter}>{labels.after}</span>
      </div>
      <div className={styles.histogram} aria-hidden="true">
        {bins.map((b) => (
          <div key={b.label} className={styles.bin} title={`${b.label}: ${b.before} → ${b.after}`}>
            <div className={styles.bars}>
              <span className={styles.barBefore} style={{ height: `${(b.before / max) * 100}%` }} />
              <span className={styles.barAfter} style={{ height: `${(b.after / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className={styles.axis} aria-hidden="true">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
      <details className={formulaStyles.details}>
        <summary>Ver los números</summary>
        <div className={formulaStyles.tableWrap}>
          <table className={formulaStyles.table}>
            <caption className={formulaStyles.srOnly}>Socios por rango de puntaje</caption>
            <thead>
              <tr>
                <th scope="col">Puntaje</th>
                <th scope="col">{labels.before}</th>
                <th scope="col">{labels.after}</th>
              </tr>
            </thead>
            <tbody>
              {bins.map((b) => (
                <tr key={b.label}>
                  <th scope="row" className={styles.rowHead}>
                    {b.label}
                  </th>
                  <td className={styles.before}>{formatInteger(b.before)}</td>
                  <td className={styles.after}>{formatInteger(b.after)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Widget>
  )
}

function Breakdown({ status, breakdown, names }) {
  const listNames = (keys) => keys.map((key) => names[key] ?? key).join(', ')
  return (
    <Widget
      icon="factors"
      title="Efecto de cada parámetro"
      teaser={<BreakdownTeaser status={status} breakdown={breakdown} />}
    >
      {status.status === 'single_factor' && <p className={formulaStyles.muted}>{status.message}</p>}

      {status.status === 'pending' && breakdown?.status === 'loading' && (
        <p className={styles.loading} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          {status.message}
        </p>
      )}
      {breakdown?.status === 'unavailable' && (
        <p className={formulaStyles.banner} role="status">
          {breakdown.message}
        </p>
      )}
      {breakdown?.status === 'message' && breakdown.data.message && (
        <p className={formulaStyles.muted}>{breakdown.data.message}</p>
      )}

      {breakdown?.status === 'available' && (
        <>
          <div className={formulaStyles.tableWrap}>
            <table className={formulaStyles.table}>
              <thead>
                <tr>
                  <th scope="col">Factor</th>
                  <th scope="col">Cambio del total medio</th>
                  <th scope="col">Suben</th>
                  <th scope="col">Bajan</th>
                  <th scope="col">Cambio medio de posición</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.data.factors.map((f) => (
                  <tr key={f.factor} className={f.weighs_most ? styles.weighsMost : undefined}>
                    <th scope="row" className={styles.rowHead}>
                      <span className={styles.factorName}>{withoutSymbol(f.label)}</span>
                      <span className={styles.factorParams}>{listNames(f.parameters)}</span>
                      {f.weighs_most && (
                        <span className={`${formulaStyles.pill} ${styles.factorPill}`}>{f.weighs_most_text}</span>
                      )}
                    </th>
                    <td>
                      <Difference value={f.mean_total_change} />
                    </td>
                    <td>{formatInteger(f.up)}</td>
                    <td>{formatInteger(f.down)}</td>
                    <td>{formatDecimal(f.mean_abs_position_change)}</td>
                  </tr>
                ))}
                {breakdown.data.remainder && (
                  <tr className={styles.remainderRow}>
                    <th scope="row" className={styles.rowHead}>
                      <span className={styles.factorName}>{breakdown.data.remainder.label}</span>
                      {breakdown.data.remainder.parameters.length > 0 && (
                        <span className={styles.factorParams}>{listNames(breakdown.data.remainder.parameters)}</span>
                      )}
                    </th>
                    <td>
                      <Difference value={breakdown.data.remainder.mean_total_change} />
                    </td>
                    <td>—</td>
                    <td>—</td>
                    <td>—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {breakdown.data.non_additive_note && <p className={formulaStyles.hint}>{breakdown.data.non_additive_note}</p>}
        </>
      )}
    </Widget>
  )
}

// Lo que se ve del desglose con el widget cerrado.
function BreakdownTeaser({ status, breakdown }) {
  if (status.status === 'single_factor') return <span>Un solo grupo de parámetros</span>
  if (!breakdown || breakdown.status === 'loading')
    return (
      <span className={styles.teaserLoading}>
        <span className={styles.spinner} aria-hidden="true" />
        Calculando…
      </span>
    )
  if (breakdown.status === 'available' && breakdown.data.factors.length > 0)
    return (
      <span>
        Mueve más: <strong>{withoutSymbol(breakdown.data.factors[0].label)}</strong>
      </span>
    )
  return <span>No disponible</span>
}

const WIDGET_ICONS = {
  chart: 'M4 12h16M7 12V6M11 12V9M15 12v5M19 12v3',
  segments: 'M12 3v18M5 7h14M5 7l-3 7h6L5 7ZM19 7l-3 7h6l-3-7Z',
  profile: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21a7 7 0 0 1 14 0M17 11h5M19.5 8.5v5',
  distribution: 'M3 20h18M5 20c2-9 4-14 7-14s5 5 7 14',
  histogram: 'M4 20h16M6 20v-5M10 20V8M14 20v-9M18 20v-3',
  cap: 'M4 6h16M8 6v14M16 6v14M8 13h8',
  components: 'M12 3v9l7 4M12 12l-7 4M12 3a9 9 0 1 0 9 9',
  factors: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M16 6a2 2 0 1 0 0 .01M10 12a2 2 0 1 0 0 .01M18 18a2 2 0 1 0 0 .01',
}

// Tarjeta plegable: cerrada muestra el título y un adelanto; se abre a voluntad.
function Widget({ icon, title, teaser, children }) {
  return (
    <details className={styles.widget}>
      <summary className={styles.widgetSummary}>
        <span className={styles.widgetIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d={WIDGET_ICONS[icon]} />
          </svg>
        </span>
        <span className={styles.widgetHeading}>
          <h3 className={styles.widgetTitle}>{title}</h3>
          {teaser && <span className={styles.widgetTeaser}>{teaser}</span>}
        </span>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className={styles.widgetBody}>{children}</div>
    </details>
  )
}

// "Media 28,37 → 30,95 (+2,58)", para el adelanto de un widget cerrado.
function BeforeAfter({ label, before, after, difference }) {
  return (
    <span className={styles.beforeAfter}>
      <span>{label}</span>
      <span className={styles.teaserBefore}>{before}</span>
      <span aria-label="pasa a">→</span>
      <strong className={styles.teaserAfter}>{after}</strong>
      {difference != null && <Difference value={difference} />}
    </span>
  )
}

// Silueta del histograma de la simulación, solo decorativa.
function MiniHistogram({ bins, max }) {
  return (
    <span className={styles.miniHistogram} aria-hidden="true">
      {bins.map((b) => (
        <span key={b.label} style={{ height: `${Math.max(4, (b.after / max) * 100)}%` }} />
      ))}
    </span>
  )
}

// ---------------------------------------------------------------------------------------------
// HU-30: análisis de equidad. Llega dentro del mismo resultado (`result.equity`): no hay otro pedido.
// Los textos (veredictos, mensajes, bandas) vienen del back en español y se muestran tal cual.

const VERDICT_TONES = {
  EQUITY_OK: 'verdictOk',
  EQUITY_ATTENTION: 'verdictAttention',
  EQUITY_BIAS: 'verdictBias',
}

// Las cinco variables del perfil (escenario 5), con su unidad.
const PROFILE_VARIABLES = [
  ['distance_km', 'Distancia al estadio', 'km', 'Mediana'],
  ['seniority_years', 'Antigüedad', 'años', 'Mediana'],
  ['age_years', 'Edad', 'años', 'Mediana'],
  ['class_c_attendance', 'Asistencia a partidos Clase C', '%', 'Mediana, entre quienes tuvieron al menos 1'],
  ['institutional_points', 'Puntos de participación institucional', 'pts', 'Mediana, antes del tope'],
  ['with_institutional', 'Socios con participación institucional', '%', 'Porcentaje del grupo'],
]

// Sección plegable (no es un widget): el título con la flecha abre y cierra todo lo de adentro.
function Equity({ equity, rankingId }) {
  const segmentations = equity.segmentations ?? []
  return (
    <details className={styles.equity} open>
      <summary className={styles.equitySummary}>
        <h2 className={styles.equityTitle}>Análisis de equidad</h2>
        <svg className={styles.equityChevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className={styles.equityBody}>
        {equity.status !== 'available' ? (
          <p className={formulaStyles.banner} role="status">
            {equity.message}
          </p>
        ) : (
          <>
            <Verdict verdict={equity.verdict} segmentations={segmentations} />
            <div className={styles.widgets}>
              {segmentations.length > 0 && <ChartWidget segmentations={segmentations} rankingId={rankingId} />}
              {segmentations.length > 0 && <Segments segmentations={segmentations} />}
              {equity.profile && <Profile profile={equity.profile} />}
            </div>
          </>
        )}
      </div>
    </details>
  )
}

// Titular de cada veredicto. El detalle de los grupos sale de `verdict.items`, que son las mismas
// piezas del texto del back, ordenadas de mayor a menor desvío.
const VERDICT_HEADLINES = {
  EQUITY_OK: ['Sin diferencias marcadas', 'El cambio no favorece ni perjudica de más a ningún grupo.'],
  EQUITY_ATTENTION: ['Hay grupos con diferencias para revisar', 'Ningún grupo tiene una diferencia fuerte.'],
  EQUITY_BIAS: ['El cambio favorece o perjudica de forma marcada', 'Al menos un grupo se mueve 5 % del ranking o más.'],
}

// Ícono neutro (una balanza) para cualquier veredicto: la tarjeta no cambia de color según el resultado.
const VERDICT_ICON = 'M12 3v18M7 21h10M5 7h14M5 7l-3 7a3 3 0 0 0 6 0L5 7ZM19 7l-3 7a3 3 0 0 0 6 0l-3-7Z'

// Veredicto general (escenario 14). El de cada atributo se ve en "Equidad por segmentos".
function Verdict({ verdict, segmentations }) {
  const labels = Object.fromEntries(segmentations.map((seg) => [seg.attribute, seg.label]))
  if (!verdict) {
    return (
      <div className={`${styles.verdict} ${styles.verdictNone}`} role="status">
        <p className={styles.verdictLead}>No hay suficientes socios para dar un veredicto de equidad.</p>
      </div>
    )
  }

  const [headline, lead] = VERDICT_HEADLINES[verdict.code]
  return (
    <div className={styles.verdict} role="status">
      <div className={styles.verdictHead}>
        <span className={styles.verdictIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d={VERDICT_ICON} />
          </svg>
        </span>
        <div className={styles.verdictHeadText}>
          <p className={styles.verdictHeadline}>{headline}</p>
          <p className={styles.verdictLead}>{verdict.items.length > 0 ? 'Grupos marcados:' : lead}</p>
        </div>
      </div>

      {verdict.items.length > 0 && (
        <ul className={styles.verdictItems}>
          {verdict.items.map((item) => {
            const favored = item.direction === 'favored'
            return (
              <li key={`${item.attribute}-${item.band}`} className={styles.verdictItem}>
                <span
                  className={`${styles.verdictArrow} ${favored ? styles.tagFavored : styles.tagHarmed}`}
                  aria-hidden="true"
                >
                  {favored ? '↑' : '↓'}
                </span>
                <span className={styles.verdictGroup}>
                  <span className={styles.verdictAttribute}>{labels[item.attribute] ?? item.attribute}</span>
                  <strong>{item.band}</strong>
                </span>
                <span className={`${styles.segmentTag} ${favored ? styles.tagFavored : styles.tagHarmed}`}>
                  {favored ? 'Favorecido' : 'Perjudicado'}
                  {item.mark === 'strong' ? ', fuerte' : ''}
                </span>
                <span className={styles.verdictDeviation}>
                  <strong>{formatDecimal(item.deviation.replace('-', ''))} %</strong> del ranking
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <p className={styles.verdictScope}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 16v-4M12 8h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z" />
        </svg>
        {verdict.scope}
      </p>
    </div>
  )
}

function ChartWidget({ segmentations, rankingId }) {
  const groups = equityGroups(segmentations)
  const up = groups.filter((g) => g.value > 0).length
  const down = groups.length - up
  return (
    <Widget
      icon="chart"
      title="Gráfico de equidad por grupos"
      teaser={
        <span>
          {up} {up === 1 ? 'grupo sube' : 'grupos suben'} · {down} {down === 1 ? 'grupo baja' : 'grupos bajan'}
        </span>
      }
    >
      <EquityChart segmentations={segmentations} rankingId={rankingId} />
    </Widget>
  )
}

function percent(value) {
  return `${formatSigned(value)} %`
}

// Equidad por segmentos: se cambia de atributo sin volver a simular (escenario 8).
function Segments({ segmentations }) {
  const [attribute, setAttribute] = useState(segmentations[0].attribute)
  const selected = segmentations.find((seg) => seg.attribute === attribute) ?? segmentations[0]
  // Una sola escala para los tres atributos, así las barras se comparan entre sí. Mínimo 5 %: el umbral fuerte.
  const scale = Math.max(
    5,
    ...segmentations.flatMap((seg) => seg.segments.map((segment) => Math.abs(Number(segment.deviation)))),
  )
  const largest = segmentations
    .flatMap((seg) => seg.segments.filter((segment) => segment.largest_deviation).map((segment) => ({ seg, segment })))
    .sort((a, b) => Math.abs(Number(b.segment.deviation)) - Math.abs(Number(a.segment.deviation)))[0]

  return (
    <Widget
      icon="segments"
      title="Equidad por segmentos"
      teaser={
        largest ? (
          <span>
            Mayor desvío: {largest.seg.label}, {largest.segment.band.label} (
            <strong>{percent(largest.segment.deviation)}</strong>)
          </span>
        ) : (
          <span>Sin desvíos entre grupos</span>
        )
      }
    >
      <p className={formulaStyles.hint}>
        El desvío es el cambio medio de posición del grupo como porcentaje del ranking: positivo, el grupo sube. Se
        marca desde 2 % y es fuerte desde 5 %.
      </p>
      <div className={styles.segmentTabs} role="group" aria-label="Atributo">
        {segmentations.map((seg) => (
          <button
            key={seg.attribute}
            type="button"
            className={styles.segmentTab}
            aria-pressed={seg.attribute === selected.attribute}
            onClick={() => setAttribute(seg.attribute)}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {selected.status !== 'available' ? (
        <p className={formulaStyles.banner} role="status">
          {selected.message}
        </p>
      ) : (
        <>
          {selected.verdict && (
            <p className={`${styles.attributeVerdict} ${styles[VERDICT_TONES[selected.verdict.code]]}`}>
              {selected.verdict.text}
            </p>
          )}
          <div className={formulaStyles.tableWrap}>
            <table className={formulaStyles.table}>
              <caption className={formulaStyles.srOnly}>Equidad por {selected.label.toLowerCase()}</caption>
              <thead>
                <tr>
                  <th scope="col">Grupo</th>
                  <th scope="col">Socios</th>
                  <th scope="col">Puntaje medio</th>
                  <th scope="col">Posición media</th>
                  <th scope="col">Desvío</th>
                </tr>
              </thead>
              <tbody>
                {selected.segments.map((segment) => (
                  <tr key={segment.band.label}>
                    <th scope="row" className={styles.rowHead}>
                      <span className={styles.factorName}>{segment.band.label}</span>
                      <SegmentTags segment={segment} />
                    </th>
                    <td>{formatInteger(segment.count)}</td>
                    <td>
                      <span className={styles.change}>
                        <span className={styles.teaserBefore}>{formatDecimal(segment.avg_score_before)}</span>
                        <span aria-label="pasa a">→</span>
                        <strong className={styles.teaserAfter}>{formatDecimal(segment.avg_score_after)}</strong>
                        <Difference value={segment.avg_score_difference} />
                      </span>
                    </td>
                    <td>
                      <span className={styles.change}>
                        <span className={styles.teaserBefore}>{formatDecimal(segment.avg_position_before)}</span>
                        <span aria-label="pasa a">→</span>
                        <strong className={styles.teaserAfter}>{formatDecimal(segment.avg_position_after)}</strong>
                        <Difference value={segment.avg_position_change} />
                      </span>
                    </td>
                    <td>
                      <DeviationBar value={segment.deviation} scale={scale} mark={segment.mark} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Widget>
  )
}

function SegmentTags({ segment }) {
  if (segment.mark === 'none' && !segment.largest_deviation) return null
  const favored = segment.direction === 'favored'
  return (
    <span className={styles.segmentTags}>
      {segment.mark !== 'none' && (
        <span className={`${styles.segmentTag} ${favored ? styles.tagFavored : styles.tagHarmed}`}>
          {favored ? 'Favorecido' : 'Perjudicado'}
          {segment.mark === 'strong' ? ', fuerte' : ''}
        </span>
      )}
      {segment.largest_deviation && <span className={`${styles.segmentTag} ${styles.tagLargest}`}>Mayor desvío</span>}
    </span>
  )
}

// Barra divergente: a la derecha (verde) el grupo sube; a la izquierda (rojo) baja.
function DeviationBar({ value, scale, mark }) {
  const number = Number(value)
  const width = Math.min(50, (Math.abs(number) / scale) * 50)
  const side = number >= 0 ? styles.deviationUp : styles.deviationDown
  return (
    <span className={styles.deviation}>
      <span className={styles.deviationTrack} aria-hidden="true">
        <span
          className={`${styles.deviationFill} ${side} ${mark === 'strong' ? styles.deviationStrong : ''}`}
          style={{ width: `${width}%` }}
        />
      </span>
      <strong className={styles.deviationValue}>{percent(value)}</strong>
    </span>
  )
}

// Perfil de los que se mueven: descriptivo, sin marcas ni colores de bueno o malo (escenario 7).
function Profile({ profile }) {
  const groups = profile.groups
  const threshold = profile.relevant_threshold
  return (
    <Widget
      icon="profile"
      title="Perfil de los socios que se mueven"
      teaser={
        <span>
          {groups
            .filter((g) => g.group !== 'all')
            .map((g) => `${g.label}: ${formatInteger(g.count)}`)
            .join(' · ')}
        </span>
      }
    >
      <p className={formulaStyles.hint}>
        Suben o bajan quienes cambian {formatInteger(threshold)} {threshold === 1 ? 'puesto' : 'puestos'} o más. Es
        descriptivo: qué perfil premiar es decisión del club.
      </p>
      <div className={formulaStyles.tableWrap}>
        <table className={formulaStyles.table}>
          <caption className={formulaStyles.srOnly}>Perfil de los socios que se mueven</caption>
          <thead>
            <tr>
              <th scope="col">Variable</th>
              {groups.map((g) => (
                <th key={g.group} scope="col">
                  {g.label}
                  <span className={styles.groupMeta}>
                    {formatInteger(g.count)} socios · {formatDecimal(g.share)} %
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROFILE_VARIABLES.map(([key, label, unit, how]) => (
              <tr key={key}>
                <th scope="row" className={styles.rowHead}>
                  <span className={styles.factorName}>{label}</span>
                  <span className={styles.factorParams}>{how}</span>
                </th>
                {groups.map((g) => (
                  <td key={g.group}>
                    <ProfileCell group={g} variable={key} unit={unit} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Widget>
  )
}

function ProfileCell({ group, variable, unit }) {
  if (group.too_small || !group.variables) return <span className={styles.tooSmall}>{group.message}</span>
  const data = group.variables[variable]
  if (data.too_small || data.value == null) {
    return (
      <span className={styles.tooSmall}>
        {data.message}
        {data.count != null && ` (${formatInteger(data.count)} socios)`}
      </span>
    )
  }
  return (
    <span className={styles.profileValue}>
      <strong>
        {formatDecimal(data.value)} {unit}
      </strong>
      {group.group !== 'all' && <span className={styles.profileDiff}>{formatSigned(data.difference)} vs. todos</span>}
      {data.count != null && <span className={styles.profileDiff}>sobre {formatInteger(data.count)} socios</span>}
    </span>
  )
}

export default RulesSimulationResult
