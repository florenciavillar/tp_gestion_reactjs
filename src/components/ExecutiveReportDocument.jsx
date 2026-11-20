import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { formatDateTime } from '../services/eventFormat.js'
import { downloadReportPdf } from '../services/executiveReportPdf.js'
import {
  distributionExplanation,
  equityExplanation,
  equityIntro,
  pillarsExplanation,
  summaryExplanation,
} from '../services/executiveReportNarrative.js'
import styles from './ExecutiveReportDocument.module.css'

// HU-42: el reporte ejecutivo como documento A4, en un pop-up. "Descargar PDF" arma el archivo en el
// navegador a partir de la misma hoja (services/executiveReportPdf.js) y lo baja directo.

// Los decimales llegan como string con punto; se muestran con coma.
function dec(value) {
  return String(value).replace('.', ',')
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

// Fecha para el nombre del archivo (AAAA-MM-DD, hora de Buenos Aires).
function fileDate(iso) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(iso))
}

const PILLARS = [
  { key: 'asistencia', label: 'Asistencia a eventos', weight: 'w_a' },
  { key: 'institucional', label: 'Participación institucional', weight: 'w_p' },
  { key: 'antiguedad', label: 'Antigüedad y edad', weight: 'w_t' },
  { key: 'bonus_nuevo', label: 'Bonificación socio nuevo', weight: null },
]

const EQUITY = [
  { key: 'seniority', title: 'Por antigüedad societaria' },
  { key: 'distance', title: 'Por distancia al estadio' },
  { key: 'age', title: 'Por rango etario' },
]

// Nombre del archivo: reporte-ejecutivo-<club>-<AAAA-MM-DD>.pdf
function fileName(metadata) {
  const club = metadata.club_name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `reporte-ejecutivo-${club}-${fileDate(metadata.generated_at)}.pdf`
}

export default function ExecutiveReportDocument({ report, onClose }) {
  const dialogRef = useRef(null)
  const captureRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')

  // Se abre como modal (el resto de la pantalla queda inactivo) y se bloquea el scroll de fondo.
  useEffect(() => {
    const dialog = dialogRef.current
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      if (dialog.open) dialog.close()
    }
  }, [])

  // La copia para el PDF se monta solo mientras se descarga; cuando está en el DOM se captura.
  useEffect(() => {
    if (!downloading) return
    let cancelled = false
    downloadReportPdf(captureRef.current, fileName(report.metadata))
      .catch(() => {
        if (!cancelled) setError('No se pudo generar el PDF. Probá de nuevo.')
      })
      .finally(() => {
        if (!cancelled) setDownloading(false)
      })
    return () => {
      cancelled = true
    }
  }, [downloading, report])

  function handleDownload() {
    setError('')
    setDownloading(true)
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Documento del reporte ejecutivo"
      onCancel={(event) => {
        // Escape: se cierra igual que con "Volver", desmontando el pop-up.
        event.preventDefault()
        onClose()
      }}
    >
      <div className={styles.toolbar}>
        <button type="button" className={styles.back} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Volver al reporte
        </button>
        <button type="button" className={styles.print} onClick={handleDownload} disabled={downloading}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          {downloading ? 'Generando PDF…' : 'Descargar PDF'}
        </button>
      </div>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      <div className={styles.viewer}>
        <FitToWidth>
          <Paper report={report} />
        </FitToWidth>
      </div>
      {/* Copia sin escalar y fuera de pantalla, con el ancho útil de la hoja: es lo que va al PDF. */}
      {downloading &&
        createPortal(
          <div ref={captureRef} className={styles.capture} aria-hidden="true">
            <Paper report={report} />
          </div>,
          document.body,
        )}
    </dialog>
  )
}

// Muestra la hoja A4 entera, achicada para que entre en el ancho de la pantalla (como un visor de PDF).
// La hoja conserva su tamaño real, así que el diseño es el mismo que sale impreso.
function FitToWidth({ children }) {
  const outer = useRef(null)
  const inner = useRef(null)
  const [fit, setFit] = useState({ scale: 1, height: undefined })

  useLayoutEffect(() => {
    function update() {
      const page = inner.current
      const scale = Math.min(1, outer.current.clientWidth / page.offsetWidth)
      setFit({ scale, height: page.offsetHeight * scale })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(outer.current)
    observer.observe(inner.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={outer} className={styles.fit} style={{ height: fit.height }}>
      <div ref={inner} className={styles.fitPage} style={{ transform: `scale(${fit.scale})` }}>
        {children}
      </div>
    </div>
  )
}

function Paper({ report }) {
  const { metadata, summary, histogram, pillars_average, demographic_equity } = report
  const params = metadata.rules_version.parameters
  const [pillarsIntro, ...pillarsRest] = pillarsExplanation(pillars_average, params)

  return (
    <article className={styles.paper}>
      <header className={styles.cover} data-keep>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true">
            P10
          </span>
          <span>Pasión de 10</span>
        </div>
        <p className={styles.club}>{metadata.club_name}</p>
        <h1 className={styles.title}>Reporte ejecutivo de scoring y equidad</h1>
        <dl className={styles.meta}>
          <div>
            <dt>Ranking</dt>
            <dd>N.º {metadata.ranking_id}</dd>
          </div>
          <div>
            <dt>Vigente desde</dt>
            <dd>{formatDateTime(metadata.ranking_calculated_at)}</dd>
          </div>
          <div>
            <dt>Reglas</dt>
            <dd>Versión {metadata.rules_version.version}</dd>
          </div>
          <div>
            <dt>Emitido</dt>
            <dd>{formatDateTime(metadata.generated_at)}</dd>
          </div>
          <div>
            <dt>Emitido por</dt>
            <dd>{metadata.generated_by}</dd>
          </div>
        </dl>
      </header>

      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span>1</span>Resumen
        </h2>
        <p className={styles.lead}>
          El ranking vigente incluye <strong>{plural(summary.total_socios, 'socio', 'socios')}</strong>. El puntaje
          medio es de <strong>{dec(summary.mean_score)} puntos</strong> y la mediana de{' '}
          <strong>{dec(summary.median_score)}</strong>; la mitad central de los socios está entre{' '}
          {dec(summary.percentiles.p25)} y {dec(summary.percentiles.p75)} puntos.
        </p>
        <div className={styles.kpis} data-keep>
          <Kpi label="Socios" value={summary.total_socios} />
          <Kpi label="Puntaje medio" value={dec(summary.mean_score)} />
          <Kpi label="Mediana" value={dec(summary.median_score)} />
          <Kpi label="Desvío estándar" value={dec(summary.std_dev)} />
          <Kpi label="En el tope" value={summary.socios_at_cap} />
          <Kpi label="Empatados" value={summary.ties.tied_socios_count} />
        </div>
        <Explain paragraphs={summaryExplanation(summary)} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span>2</span>Distribución de puntajes
        </h2>
        <div className={styles.distribution} data-keep>
          <Histogram bins={histogram} />
          <table className={styles.table}>
            <caption>Percentiles</caption>
            <tbody>
              <tr>
                <th scope="row">P10</th>
                <td>{dec(summary.percentiles.p10)}</td>
              </tr>
              <tr>
                <th scope="row">P25</th>
                <td>{dec(summary.percentiles.p25)}</td>
              </tr>
              <tr>
                <th scope="row">P50 (mediana)</th>
                <td>{dec(summary.median_score)}</td>
              </tr>
              <tr>
                <th scope="row">P75</th>
                <td>{dec(summary.percentiles.p75)}</td>
              </tr>
              <tr>
                <th scope="row">P90</th>
                <td>{dec(summary.percentiles.p90)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Explain paragraphs={distributionExplanation(summary, histogram)} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span>3</span>Aporte promedio por pilar
        </h2>
        <p className={styles.text}>{rich(pillarsIntro)}</p>
        <PillarBars average={pillars_average} params={params} />
        <Explain paragraphs={pillarsRest} />
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>
          <span>4</span>Equidad demográfica
        </h2>
        <p className={styles.text}>{rich(equityIntro())}</p>
        {EQUITY.map(({ key, title }) => (
          <EquityTable key={key} attribute={key} title={title} equity={demographic_equity[key]} />
        ))}
      </section>

      <footer className={styles.footer}>
        <p>
          Datos agregados del ranking N.º {metadata.ranking_id}: el documento no incluye datos personales de ningún
          socio. Los grupos con pocos socios se omiten para proteger su privacidad.
        </p>
        <p>Generado por Pasión de 10 el {formatDateTime(metadata.generated_at)}.</p>
      </footer>
    </article>
  )
}

// Las palabras clave de los textos vienen entre **dobles asteriscos**: se muestran en negrita.
function rich(text) {
  return text.split('**').map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part))
}

// Bloque "Cómo leerlo": la explicación en palabras de un gráfico o una tabla.
function Explain({ paragraphs }) {
  return (
    <div className={styles.explain} data-keep>
      <p className={styles.explainLabel}>Cómo leerlo</p>
      {paragraphs.map((text) => (
        <p key={text}>{rich(text)}</p>
      ))}
    </div>
  )
}

function Kpi({ label, value }) {
  return (
    <div className={styles.kpi}>
      <span className={styles.kpiValue}>{value}</span>
      <span className={styles.kpiLabel}>{label}</span>
    </div>
  )
}

// Histograma en SVG: imprime nítido en cualquier tamaño.
function Histogram({ bins }) {
  const width = 520
  const height = 200
  const top = 18
  const bottom = 24
  const chart = height - top - bottom
  const max = Math.max(1, ...bins.map((b) => b.count))
  const slot = width / bins.length

  return (
    <figure className={styles.histogram}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cantidad de socios por intervalo de 5 puntos">
        <line x1="0" x2={width} y1={top + chart} y2={top + chart} className={styles.axis} />
        {bins.map((bin, i) => {
          const h = (bin.count / max) * chart
          const x = i * slot + 2
          return (
            <g key={bin.label}>
              <rect x={x} y={top + chart - h} width={slot - 4} height={h} rx="2" className={styles.bar} />
              {bin.count > 0 && (
                <text x={x + (slot - 4) / 2} y={top + chart - h - 4} className={styles.barLabel}>
                  {bin.count}
                </text>
              )}
            </g>
          )
        })}
        {[0, 25, 50, 75, 100].map((tick) => (
          <text
            key={tick}
            x={(tick / 100) * width}
            y={height - 6}
            className={styles.tick}
            textAnchor={tick === 0 ? 'start' : tick === 100 ? 'end' : 'middle'}
          >
            {tick}
          </text>
        ))}
      </svg>
      <figcaption>Socios por intervalo de 5 puntos (0 a 100)</figcaption>
    </figure>
  )
}

function PillarBars({ average, params }) {
  const values = PILLARS.map((p) => Number(average[p.key]))
  const max = Math.max(1, ...values)
  return (
    <table className={`${styles.table} ${styles.pillars}`}>
      <thead>
        <tr>
          <th scope="col">Pilar</th>
          <th scope="col" className={styles.num}>
            Peso
          </th>
          <th scope="col" className={styles.barCol} aria-hidden="true" />
          <th scope="col" className={styles.num}>
            Puntos
          </th>
        </tr>
      </thead>
      <tbody>
        {PILLARS.map((p, i) => (
          <tr key={p.key}>
            <th scope="row">{p.label}</th>
            <td className={styles.num}>{p.weight && params[p.weight] ? dec(params[p.weight]) : '—'}</td>
            <td className={styles.barCol} aria-hidden="true">
              <span className={styles.track}>
                <span className={styles.fill} style={{ width: `${(values[i] / max) * 100}%` }} />
              </span>
            </td>
            <td className={styles.num}>{dec(average[p.key])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function EquityTable({ attribute, title, equity }) {
  return (
    <div className={styles.equity}>
      <h3 className={styles.subheading}>{title}</h3>
      {equity.available ? (
        <table className={styles.table} data-keep>
          <thead>
            <tr>
              <th scope="col">Grupo</th>
              <th scope="col" className={styles.num}>
                Socios
              </th>
              <th scope="col" className={styles.num}>
                % del padrón
              </th>
              <th scope="col" className={styles.num}>
                Puntaje prom.
              </th>
              <th scope="col" className={styles.num}>
                Posición prom.
              </th>
            </tr>
          </thead>
          <tbody>
            {equity.segments.map((seg) => (
              <tr key={seg.band_label}>
                <th scope="row">{seg.band_label}</th>
                <td className={styles.num}>{seg.socio_count}</td>
                <td className={styles.num}>{dec(seg.share_percent)} %</td>
                <td className={styles.num}>{dec(seg.average_score)}</td>
                <td className={styles.num}>{dec(seg.average_position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className={styles.unavailable}>
          {equity.message || 'No hay suficientes socios para mostrar este desglose sin comprometer su privacidad.'}
        </p>
      )}
      <p className={styles.equityNote}>{rich(equityExplanation(attribute, equity))}</p>
    </div>
  )
}
