import { useEffect, useState } from 'react'
import { Link, Navigate, useOutletContext } from 'react-router'
import { withUnit } from '../services/formula.js'
import {
  BREAKDOWN_UNAVAILABLE,
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

      {/* HU-30 todavía no existe en el back: cuando llegue, `result.equity` va acá. */}

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

export default RulesSimulationResult
