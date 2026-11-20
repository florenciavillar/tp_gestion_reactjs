import { useEffect, useId, useRef, useState } from 'react'
import { formatDateTime } from '../services/eventFormat.js'
import {
  downloadExecutiveReportCsv,
  executiveReportErrorMessage,
  getExecutiveReport,
} from '../services/executiveReport.js'
import styles from './ExecutiveReportView.module.css'

export default function ExecutiveReportView({ rankingId }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [hoveredBin, setHoveredBin] = useState(null)
  const [isScrolledPast, setIsScrolledPast] = useState(false)

  const headerRef = useRef(null)
  const histogramDescId = useId()

  useEffect(() => {
    let ignore = false
    getExecutiveReport()
      .then((data) => {
        if (!ignore) {
          setReport(data)
          setError('')
        }
      })
      .catch((err) => {
        if (!ignore) setError(executiveReportErrorMessage(err))
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })
    return () => {
      ignore = true
    }
  }, [rankingId])

  useEffect(() => {
    const el = headerRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsScrolledPast(!entry.isIntersecting && entry.boundingClientRect.top < 60)
      },
      {
        threshold: 0,
        rootMargin: '-60px 0px 0px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [report])

  async function handleDownloadCsv() {
    setDownloading(true)
    setDownloadError('')
    try {
      await downloadExecutiveReportCsv()
    } catch {
      setDownloadError('No se pudo descargar el archivo CSV.')
    } finally {
      setDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingBox} role="status">
        <p>Cargando reporte ejecutivo del ranking…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className={styles.container}>
        <div className={styles.bannerPrivacy} role="alert">
          <p>{error || 'No hay datos disponibles para el reporte ejecutivo.'}</p>
        </div>
      </div>
    )
  }

  const { metadata, summary, histogram, pillars_average, demographic_equity } = report
  const maxHistogramCount = Math.max(1, ...histogram.map((b) => b.count))

  return (
    <section className={styles.container} aria-labelledby="executive-report-title">
      {/* Botón flotante sticky: aparece en la esquina superior derecha únicamente cuando se scrollea por debajo de la cabecera */}
      {isScrolledPast && (
        <div className={styles.floatingStickyBar}>
          <button
            type="button"
            className={styles.btnDownloadFloating}
            onClick={handleDownloadCsv}
            disabled={downloading}
            aria-label="Descargar reporte ejecutivo en formato CSV"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Descargando…' : 'Descargar Reporte (CSV)'}
          </button>
        </div>
      )}

      {/* Cabecera del reporte: alineación natural original idéntica a la inicial */}
      <div className={styles.reportHeader} ref={headerRef}>
        <div>
          <h2 id="executive-report-title" className={styles.reportTitle}>
            Reporte Ejecutivo de Scoring y Equidad
          </h2>
          <div className={styles.reportMeta}>
            <span className={styles.metaItem}>
              <strong>Club:</strong> {metadata.club_name}
            </span>
            <span className={styles.metaItem}>
              <strong>Reglas:</strong> v{metadata.rules_version.version}
            </span>
            <span className={styles.metaItem}>
              <strong>Calculado:</strong> {formatDateTime(metadata.ranking_calculated_at)}
            </span>
            <span className={styles.metaItem}>
              <strong>Emitido por:</strong> {metadata.generated_by}
            </span>
          </div>
        </div>

        <div className={styles.headerAction}>
          <button
            type="button"
            className={styles.btnDownload}
            onClick={handleDownloadCsv}
            disabled={downloading}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {downloading ? 'Descargando…' : 'Descargar Reporte (CSV)'}
          </button>
          {downloadError && <p className={styles.binTooltip} role="alert">{downloadError}</p>}
        </div>
      </div>

      {/* KPIs globales */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Total Socios</span>
          <span className={styles.kpiValue}>{summary.total_socios}</span>
          <span className={styles.kpiDetail}>Padrón evaluado</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Puntaje Medio</span>
          <span className={styles.kpiValue}>{summary.mean_score}</span>
          <span className={styles.kpiDetail}>Promedio general</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Mediana</span>
          <span className={styles.kpiValue}>{summary.median_score}</span>
          <span className={styles.kpiDetail}>Valor central (P50)</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Desvío Estándar</span>
          <span className={styles.kpiValue}>{summary.std_dev}</span>
          <span className={styles.kpiDetail}>Dispersión</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Tope de 100 pts</span>
          <span className={styles.kpiValue}>{summary.socios_at_cap}</span>
          <span className={styles.kpiDetail}>Socios al puntaje máx.</span>
        </div>
        <div className={styles.kpiCard}>
          <span className={styles.kpiLabel}>Empatados</span>
          <span className={styles.kpiValue}>{summary.ties.tied_socios_count}</span>
          <span className={styles.kpiDetail}>Mayor grupo: {summary.ties.largest_tie_size}</span>
        </div>
      </div>

      {/* Percentiles y Promedio por Pilar */}
      <div className={styles.twoColGrid}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Percentiles de Puntaje</h3>
          <dl className={styles.dataList}>
            <dt>Percentil 10 (P10 - base)</dt>
            <dd>{summary.percentiles.p10} pts</dd>
            <dt>Percentil 25 (P25 - cuartil inf.)</dt>
            <dd>{summary.percentiles.p25} pts</dd>
            <dt>Percentil 75 (P75 - cuartil sup.)</dt>
            <dd>{summary.percentiles.p75} pts</dd>
            <dt>Percentil 90 (P90 - cúspide)</dt>
            <dd>{summary.percentiles.p90} pts</dd>
          </dl>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Aporte Promedio por Pilar</h3>
          <dl className={styles.dataList}>
            <dt>Asistencia a Eventos (wA = {metadata.rules_version.parameters.wA ?? '0.6'})</dt>
            <dd>{pillars_average.asistencia} pts</dd>
            <dt>Institucional / Distancia (wP = {metadata.rules_version.parameters.wP ?? '0.2'})</dt>
            <dd>{pillars_average.institucional} pts</dd>
            <dt>Antigüedad societaria (wT = {metadata.rules_version.parameters.wT ?? '0.2'})</dt>
            <dd>{pillars_average.antiguedad} pts</dd>
            <dt>Bonificación socio nuevo</dt>
            <dd>{pillars_average.bonus_nuevo} pts</dd>
          </dl>
        </div>
      </div>

      {/* Histograma desplegable (comienza desplegado) */}
      <details className={styles.widget} open>
        <summary className={styles.widgetSummary}>
          <span className={styles.widgetIcon} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 20h16M6 20v-5M10 20V8M14 20v-9M18 20v-3" />
            </svg>
          </span>
          <span className={styles.widgetHeading}>
            <h3 className={styles.widgetTitle}>Distribución de Puntajes (Histograma)</h3>
            <span className={styles.widgetTeaser}>
              Frecuencia de socios en 20 intervalos de 5 puntos [0–100]
            </span>
          </span>
          <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </summary>

        <div className={styles.widgetBody}>
          <p className={styles.binTooltip} id={histogramDescId}>
            {hoveredBin
              ? `Rango ${hoveredBin.label}: ${hoveredBin.count} socios (${hoveredBin.share_percent}% del padrón)`
              : 'Pasá el cursor o seleccioná una columna para ver el detalle de cada intervalo de 5 puntos.'}
          </p>

          <div
            className={styles.histogramBars}
            role="img"
            aria-describedby={histogramDescId}
            aria-label="Histograma de frecuencias de puntajes de 0 a 100"
          >
            {histogram.map((bin) => {
              const heightPercent = (bin.count / maxHistogramCount) * 100
              return (
                <div
                  key={bin.label}
                  className={styles.histogramBin}
                  onMouseEnter={() => setHoveredBin(bin)}
                  onMouseLeave={() => setHoveredBin(null)}
                >
                  <div
                    className={styles.histogramBar}
                    style={{ height: `${Math.max(4, heightPercent)}%` }}
                    title={`${bin.label}: ${bin.count} socios (${bin.share_percent}%)`}
                    tabIndex={0}
                    onFocus={() => setHoveredBin(bin)}
                    onBlur={() => setHoveredBin(null)}
                  />
                </div>
              )
            })}
          </div>

          <div className={styles.histogramAxis} aria-hidden="true">
            <span>0 pts</span>
            <span>25 pts</span>
            <span>50 pts</span>
            <span>75 pts</span>
            <span>100 pts</span>
          </div>
        </div>
      </details>

      {/* Tablas de Auditoría de Equidad Demográfica separadas y desplegables (comienzan desplegadas) */}
      <h3 className={styles.sectionGroupTitle}>Auditoría de Equidad Demográfica</h3>

      {/* 1. Antigüedad societaria */}
      <DemographicWidget
        icon={
          <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 3" />
          </>
        }
        title="Equidad por Antigüedad societaria"
        teaser="Distribución de puntajes y posiciones según los años de socio en el club"
        equity={demographic_equity.seniority}
      />

      {/* 2. Distancia al estadio */}
      <DemographicWidget
        icon={
          <>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
            <circle cx="12" cy="9" r="2.5" />
          </>
        }
        title="Equidad por Distancia al estadio"
        teaser="Distribución de puntajes y posiciones según la distancia en kilómetros al estadio"
        equity={demographic_equity.distance}
      />

      {/* 3. Rango etario (Edad) */}
      <DemographicWidget
        icon={
          <>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
          </>
        }
        title="Equidad por Rango etario (Edad)"
        teaser="Distribución de puntajes y posiciones según la edad de los socios"
        equity={demographic_equity.age}
      />
    </section>
  )
}

function DemographicWidget({ icon, title, teaser, equity }) {
  return (
    <details className={styles.widget} open>
      <summary className={styles.widgetSummary}>
        <span className={styles.widgetIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24">{icon}</svg>
        </span>
        <span className={styles.widgetHeading}>
          <h4 className={styles.widgetTitle}>{title}</h4>
          {teaser && <span className={styles.widgetTeaser}>{teaser}</span>}
        </span>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>

      <div className={styles.widgetBody}>
        {equity.available ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Segmento</th>
                  <th scope="col" className={styles.numCol}>Socios</th>
                  <th scope="col" className={styles.numCol}>Participación</th>
                  <th scope="col" className={styles.numCol}>Puntaje Promedio</th>
                  <th scope="col" className={styles.numCol}>Posición Promedio</th>
                </tr>
              </thead>
              <tbody>
                {equity.segments.map((seg) => (
                  <tr key={seg.band_label}>
                    <td>
                      <strong>{seg.band_label}</strong>
                    </td>
                    <td className={styles.numCol}>{seg.socio_count}</td>
                    <td className={styles.numCol}>{seg.share_percent}%</td>
                    <td className={styles.numCol}>{seg.average_score} pts</td>
                    <td className={styles.numCol}>#{seg.average_position}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={styles.bannerPrivacy} role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p>
              {equity.message ||
                'No hay suficientes socios para mostrar este desglose respetando la privacidad del grupo (umbral mínimo de k-anonimato).'}
            </p>
          </div>
        )}
      </div>
    </details>
  )
}
