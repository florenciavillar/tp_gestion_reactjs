import { useId, useMemo, useRef, useState } from 'react'
import styles from './EquityImpactChart.module.css'

/**
 * Gráfico interactivo y exportable de equidad por grupos (HU-30).
 *
 * - Eje X en 0%: representa el estado del ranking anterior (línea base).
 * - Eje Y: variación de la posición media en porcentaje de la población del ranking.
 * - Barras positivas (+Y, verde): grupos favorecidos (suben en el ranking).
 * - Barras negativas (-Y, rojo): grupos perjudicados (bajan en el ranking).
 * - Botón para descargar el gráfico en PNG de alta resolución.
 */
function EquityImpactChart({ segmentations, rankingId }) {
  const chartRef = useRef(null)
  const [filterAttr, setFilterAttr] = useState('all') // 'all' | 'seniority' | 'distance' | 'age'
  const [hoveredGroup, setHoveredGroup] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const chartId = useId()

  // Extraer todos los grupos con cambios en su situación
  const allGroups = useMemo(() => {
    if (!segmentations) return []
    const list = []
    for (const seg of segmentations) {
      if (seg.status !== 'available' || !seg.segments) continue
      for (const s of seg.segments) {
        const val = parseFloat(s.deviation)
        if (isNaN(val) || Math.abs(val) < 0.05) continue
        list.push({
          id: `${seg.attribute}-${s.band.lower}-${s.band.upper}`,
          attribute: seg.attribute,
          attributeLabel: seg.label,
          bandLabel: s.band.label,
          name: `${seg.label}: ${s.band.label}`,
          shortLabel: `${seg.label === 'Antigüedad' ? 'Antig.' : seg.label}: ${s.band.label}`,
          value: val, // > 0 favorecido, < 0 perjudicado
          deviationStr: s.deviation,
          direction: s.direction || (val > 0 ? 'favored' : 'harmed'),
          count: s.count,
          avgPosChange: s.avg_position_change,
          avgScoreDiff: s.avg_score_difference,
          mark: s.mark,
          largestDeviation: s.largest_deviation,
        })
      }
    }
    // Ordenar de mayor beneficio (+Y) a mayor perjuicio (-Y)
    return list.sort((a, b) => b.value - a.value)
  }, [segmentations])

  const filteredGroups = useMemo(() => {
    if (filterAttr === 'all') return allGroups
    return allGroups.filter((g) => g.attribute === filterAttr)
  }, [allGroups, filterAttr])

  // Dimensiones del gráfico SVG
  const barWidth = 38
  const barGap = 20
  const margin = { top: 45, right: 35, bottom: 130, left: 65 }
  const plotWidth = Math.max(680, filteredGroups.length * (barWidth + barGap) + barGap)
  const width = plotWidth + margin.left + margin.right
  const height = 480
  const plotHeight = height - margin.top - margin.bottom

  // Escala Y dinámica simétrica alrededor de 0
  const maxAbsValue = useMemo(() => {
    if (filteredGroups.length === 0) return 10
    const m = Math.max(...filteredGroups.map((g) => Math.abs(g.value)))
    return Math.ceil(Math.max(m * 1.15, 10) / 5) * 5
  }, [filteredGroups])

  const yZero = margin.top + plotHeight / 2
  const yScale = (val) => yZero - (val / maxAbsValue) * (plotHeight / 2)

  // Ticks para el eje Y
  const yTicks = useMemo(() => {
    const step = maxAbsValue <= 15 ? 5 : maxAbsValue <= 35 ? 10 : 15
    const ticks = []
    for (let v = -maxAbsValue; v <= maxAbsValue; v += step) {
      ticks.push(v)
    }
    return ticks
  }, [maxAbsValue])

  // Descarga del gráfico en PNG de alta resolución (2x para retina/print)
  async function handleDownloadPng() {
    if (!chartRef.current) return
    setDownloading(true)
    try {
      const svgElement = chartRef.current
      const svgString = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
      const URLObj = window.URL || window.webkitURL || window
      const blobUrl = URLObj.createObjectURL(svgBlob)

      const img = new Image()
      img.onload = () => {
        const scale = 2
        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale
        const ctx = canvas.getContext('2d')

        // Fondo blanco nítido
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

        const pngUrl = canvas.toDataURL('image/png')
        const link = document.createElement('a')
        link.href = pngUrl
        link.download = `grafico-equidad-ranking-${rankingId || 'sim'}.png`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URLObj.revokeObjectURL(blobUrl)
        setDownloading(false)
      }
      img.onerror = () => {
        setDownloading(false)
      }
      img.src = blobUrl
    } catch {
      setDownloading(false)
    }
  }

  if (allGroups.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No se registraron cambios significativos de posición entre los grupos evaluados.</p>
      </div>
    )
  }

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <div>
          <h3 className={styles.chartTitle}>Impacto en equidad por grupos</h3>
          <p className={styles.chartSubtitle}>
            Variación de la posición media de cada grupo respecto al ranking anterior (0%).
          </p>
        </div>
        <div className={styles.headerControls}>
          <div className={styles.filterPills} role="group" aria-label="Filtrar por atributo">
            <button
              type="button"
              className={`${styles.filterBtn} ${filterAttr === 'all' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAttr('all')}
            >
              Todos ({allGroups.length})
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterAttr === 'seniority' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAttr('seniority')}
            >
              Antigüedad
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterAttr === 'age' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAttr('age')}
            >
              Edad
            </button>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterAttr === 'distance' ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterAttr('distance')}
            >
              Distancia
            </button>
          </div>

          <button
            type="button"
            className={styles.downloadBtn}
            onClick={handleDownloadPng}
            disabled={downloading}
            title="Descargar este gráfico en formato imagen PNG"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
              <path
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
            {downloading ? 'Descargando…' : 'Descargar gráfico (PNG)'}
          </button>
        </div>
      </div>

      {/* Leyenda accesible con significado y contraste */}
      <div className={styles.legendBar} aria-hidden="true">
        <span className={styles.legendItem}>
          <span className={styles.swatchGreen} />
          <strong>Grupos beneficiados (+Y):</strong> suben en promedio en el ranking
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchRed} />
          <strong>Grupos perjudicados (-Y):</strong> bajan en promedio en el ranking
        </span>
        <span className={styles.legendItem}>
          <span className={styles.swatchZero} />
          <strong>Línea base (0%):</strong> situación en el ranking actual
        </span>
      </div>

      {/* Contenedor con scroll horizontal para asegurar legibilidad en cualquier pantalla */}
      <div className={styles.svgScrollWrapper}>
        <svg
          ref={chartRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          className={styles.svgChart}
          role="img"
          aria-labelledby={`${chartId}-title ${chartId}-desc`}
        >
          <title id={`${chartId}-title`}>Gráfico de variación de equidad por grupos de socios</title>
          <desc id={`${chartId}-desc`}>
            Gráfico de barras divergentes donde el eje 0% representa el estado anterior. Muestra {filteredGroups.length} grupos
            evaluados según el porcentaje de variación en su posición en el ranking.
          </desc>

          {/* Fondo para la exportación PNG */}
          <rect x="0" y="0" width={width} height={height} fill="#ffffff" />

          {/* Grilla y Ticks del eje Y */}
          <g className={styles.yGrid}>
            {yTicks.map((tick) => {
              const y = yScale(tick)
              const isZero = tick === 0
              return (
                <g key={tick}>
                  <line
                    x1={margin.left}
                    y1={y}
                    x2={width - margin.right}
                    y2={y}
                    stroke={isZero ? '#1e293b' : '#e2e8f0'}
                    strokeWidth={isZero ? 2 : 1}
                    strokeDasharray={isZero ? 'none' : '4 4'}
                  />
                  <text
                    x={margin.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className={isZero ? styles.tickLabelZero : styles.tickLabel}
                  >
                    {tick > 0 ? `+${tick}` : tick} %
                  </text>
                </g>
              )
            })}
          </g>

          {/* Etiqueta del eje Y */}
          <text
            x={-(margin.top + plotHeight / 2)}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            className={styles.yAxisTitle}
          >
            ← Desvío en el ranking (% de la población) →
          </text>

          {/* Barras de cada grupo */}
          <g className={styles.barsGroup}>
            {filteredGroups.map((g, i) => {
              const x = margin.left + barGap + i * (barWidth + barGap)
              const isPositive = g.value >= 0
              const barHeight = Math.max(2, Math.abs(yScale(g.value) - yZero))
              const barY = isPositive ? yZero - barHeight : yZero
              const isHovered = hoveredGroup?.id === g.id

              const fillColor = isPositive ? '#16a34a' : '#dc2626'
              const hoverColor = isPositive ? '#15803d' : '#b91c1c'
              const labelY = isPositive ? barY - 7 : barY + barHeight + 14

              return (
                <g
                  key={g.id}
                  className={styles.barItem}
                  onMouseEnter={() => setHoveredGroup(g)}
                  onMouseLeave={() => setHoveredGroup(null)}
                  tabIndex={0}
                  role="graphics-symbol"
                  aria-label={`${g.name}: ${isPositive ? '+' : ''}${g.deviationStr}% (${g.direction === 'favored' ? 'beneficiado' : 'perjudicado'})`}
                >
                  {/* Resalte de fondo en hover */}
                  {isHovered && (
                    <rect
                      x={x - 4}
                      y={margin.top}
                      width={barWidth + 8}
                      height={plotHeight}
                      fill="#f1f5f9"
                      rx={4}
                      opacity={0.7}
                    />
                  )}

                  {/* Barra */}
                  <rect
                    x={x}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx={3}
                    fill={isHovered ? hoverColor : fillColor}
                    className={styles.barRect}
                  />

                  {/* Valor en porcentaje sobre/bajo la barra */}
                  <text
                    x={x + barWidth / 2}
                    y={labelY}
                    textAnchor="middle"
                    className={isPositive ? styles.barValuePositive : styles.barValueNegative}
                  >
                    {isPositive ? `+${g.deviationStr}` : g.deviationStr}%
                  </text>

                  {/* Nombre del grupo en el eje X (rotado para evitar solapamientos) */}
                  <text
                    x={x + barWidth / 2}
                    y={height - margin.bottom + 18}
                    transform={`rotate(-42, ${x + barWidth / 2}, ${height - margin.bottom + 18})`}
                    textAnchor="end"
                    className={isHovered ? styles.xLabelHovered : styles.xLabel}
                  >
                    {g.shortLabel}
                  </text>
                </g>
              )
            })}
          </g>

          {/* Línea base destacada 0% (Estado anterior) */}
          <line
            x1={margin.left}
            y1={yZero}
            x2={width - margin.right}
            y2={yZero}
            stroke="#1e293b"
            strokeWidth={2}
          />
          <text
            x={width - margin.right + 8}
            y={yZero + 4}
            className={styles.zeroLineLabel}
          >
            0% (Anterior)
          </text>
        </svg>
      </div>

      {/* Tooltip de detalles cuando el usuario pasa el mouse sobre una barra */}
      {hoveredGroup && (
        <div className={styles.tooltipBox}>
          <div className={styles.tooltipHeader}>
            <span
              className={
                hoveredGroup.value >= 0 ? styles.tooltipPillGreen : styles.tooltipPillRed
              }
            >
              {hoveredGroup.value >= 0 ? '▲ Grupo favorecido' : '▼ Grupo perjudicado'}
            </span>
            <span className={styles.tooltipAttr}>{hoveredGroup.attributeLabel}</span>
          </div>
          <p className={styles.tooltipTitle}>{hoveredGroup.bandLabel}</p>
          <div className={styles.tooltipGrid}>
            <div>
              <span className={styles.tooltipLabel}>Variación posición:</span>
              <strong
                className={
                  hoveredGroup.value >= 0 ? styles.tooltipValPos : styles.tooltipValNeg
                }
              >
                {hoveredGroup.value >= 0 ? `+${hoveredGroup.deviationStr}` : hoveredGroup.deviationStr} %
              </strong>
            </div>
            <div>
              <span className={styles.tooltipLabel}>Puestos promedio:</span>
              <strong>
                {Number(hoveredGroup.avgPosChange) > 0 ? '+' : ''}
                {hoveredGroup.avgPosChange} puestos
              </strong>
            </div>
            <div>
              <span className={styles.tooltipLabel}>Población:</span>
              <strong>{hoveredGroup.count} socios</strong>
            </div>
            <div>
              <span className={styles.tooltipLabel}>Severidad:</span>
              <strong>
                {hoveredGroup.mark === 'strong'
                  ? 'Fuerte (≥ 5%)'
                  : hoveredGroup.mark === 'marked'
                  ? 'Marcado (≥ 2%)'
                  : 'Neutro'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EquityImpactChart
