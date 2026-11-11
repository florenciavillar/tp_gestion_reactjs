import { useId, useRef, useState } from 'react'
import { equityGroups } from '../services/rulesSimulation.js'
import styles from './EquityChart.module.css'

// HU-30: gráfico de barras divergentes con el desvío de cada grupo (adaptado de la rama US30).
// El cero es la posición de hoy: arriba (verde) los grupos que suben, abajo (rojo) los que bajan.
// Los colores y las fuentes van como atributos del SVG para que la descarga en PNG salga igual.

const COLORS = {
  up: '#3b7a57',
  down: '#d60019',
  text: '#151a17',
  muted: '#56605a',
  grid: '#dfe6e1',
  guide: '#c5d0c8',
  hover: '#f1f4f2',
}
const FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

const BAR = 36
const GAP = 26
const MARGIN = { top: 28, right: 24, bottom: 52, left: 58 }
const HEIGHT = 340

const UNITS = { seniority: 'años', age: 'años', distance: 'km' }

// Intervalo corto para el eje: "<1", "1–5", "20+". La banda completa va en el detalle y en el tooltip.
function shortInterval(group) {
  const lower = Number(group.lower)
  if (group.upper == null) return `${lower}+`
  if (lower === 0) return `<${group.upper}`
  return `${lower}–${group.upper}`
}

function signed(text) {
  const shown = String(text).replace('.', ',')
  return Number(text) > 0 ? `+${shown}` : shown
}

function niceScale(groups) {
  const max = Math.max(6, ...groups.map((g) => Math.abs(g.value) * 1.15))
  const step = max <= 10 ? 2 : max <= 20 ? 5 : 10
  return { max: Math.ceil(max / step) * step, step }
}

function EquityChart({ segmentations, rankingId }) {
  const [filter, setFilter] = useState('all')
  const [hovered, setHovered] = useState(null)
  const [downloading, setDownloading] = useState(false)
  const svgRef = useRef(null)
  const id = useId()

  const all = equityGroups(segmentations)
  const attributes = segmentations.filter((seg) => seg.status === 'available')
  const groups = filter === 'all' ? all : all.filter((g) => g.attribute === filter)

  if (all.length === 0) {
    return <p className={styles.empty}>Ningún grupo cambia de posición en promedio con estos valores.</p>
  }

  const { max, step } = niceScale(groups)
  const plotWidth = Math.max(560, groups.length * (BAR + GAP) + GAP)
  const width = plotWidth + MARGIN.left + MARGIN.right
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom
  const zero = MARGIN.top + plotHeight / 2
  const y = (value) => zero - (value / max) * (plotHeight / 2)
  const ticks = []
  for (let v = -max; v <= max; v += step) ticks.push(v)
  // Umbrales del spec: se marca desde 2 % y es fuerte desde 5 %.
  const guides = [2, 5, -2, -5].filter((v) => Math.abs(v) < max)

  function handleDownload() {
    const svg = svgRef.current
    if (!svg) return
    setDownloading(true)
    const url = URL.createObjectURL(
      new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }),
    )
    const image = new Image()
    image.onload = () => {
      const scale = 2
      const canvas = document.createElement('canvas')
      canvas.width = width * scale
      canvas.height = HEIGHT * scale
      const context = canvas.getContext('2d')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const link = document.createElement('a')
      link.href = canvas.toDataURL('image/png')
      link.download = `equidad-ranking-${rankingId ?? 'simulacion'}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setDownloading(false)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      setDownloading(false)
    }
    image.src = url
  }

  return (
    <div className={styles.chart}>
      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="Filtrar por atributo">
          <button
            type="button"
            className={styles.filter}
            aria-pressed={filter === 'all'}
            onClick={() => setFilter('all')}
          >
            Todos ({all.length})
          </button>
          {attributes.map((seg) => (
            <button
              key={seg.attribute}
              type="button"
              className={styles.filter}
              aria-pressed={filter === seg.attribute}
              onClick={() => setFilter(seg.attribute)}
            >
              {seg.label}
            </button>
          ))}
        </div>
        <button type="button" className={styles.download} onClick={handleDownload} disabled={downloading}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
          </svg>
          {downloading ? 'Descargando…' : 'Descargar PNG'}
        </button>
      </div>

      <div className={styles.legend} aria-hidden="true">
        <span className={styles.legendUp}>Sube en el ranking</span>
        <span className={styles.legendDown}>Baja en el ranking</span>
        <span className={styles.legendGuide}>Umbrales: marcado 2 %, fuerte 5 %</span>
      </div>

      {groups.length === 0 ? (
        <p className={styles.empty}>Ningún grupo de este atributo cambia de posición en promedio.</p>
      ) : (
        <div className={styles.scroll}>
          <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`0 0 ${width} ${HEIGHT}`}
            width={width}
            height={HEIGHT}
            fontFamily={FONT}
            role="img"
            aria-labelledby={`${id}-title ${id}-desc`}
          >
            <title id={`${id}-title`}>Desvío de cada grupo en el ranking</title>
            <desc id={`${id}-desc`}>
              {groups.map((g) => `${g.attributeLabel}, ${g.band}: ${signed(g.deviation)} %`).join('. ')}
            </desc>
            <rect width={width} height={HEIGHT} fill="#ffffff" />

            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={COLORS.grid}
                  strokeWidth={1}
                />
                <text x={MARGIN.left - 10} y={y(tick) + 4} textAnchor="end" fontSize={12} fill={COLORS.muted}>
                  {tick > 0 ? `+${tick}` : tick} %
                </text>
              </g>
            ))}

            {guides.map((guide) => (
              <line
                key={guide}
                x1={MARGIN.left}
                x2={width - MARGIN.right}
                y1={y(guide)}
                y2={y(guide)}
                stroke={guide > 0 ? COLORS.up : COLORS.down}
                strokeOpacity={Math.abs(guide) === 5 ? 0.55 : 0.3}
                strokeDasharray="5 5"
              />
            ))}

            {groups.map((g, i) => {
              const x = MARGIN.left + GAP + i * (BAR + GAP)
              const up = g.value > 0
              const barHeight = Math.max(2, Math.abs(y(g.value) - zero))
              const barY = up ? zero - barHeight : zero
              const active = hovered?.id === g.id
              const labelX = x + BAR / 2
              const labelY = HEIGHT - MARGIN.bottom + 18
              return (
                <g
                  key={g.id}
                  tabIndex={0}
                  className={styles.bar}
                  aria-label={`${g.attributeLabel}, ${g.band}: ${signed(g.deviation)} %`}
                  onMouseEnter={() => setHovered(g)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(g)}
                  onBlur={() => setHovered(null)}
                >
                  {active && (
                    <rect x={x - 5} y={MARGIN.top} width={BAR + 10} height={plotHeight} rx={6} fill={COLORS.hover} />
                  )}
                  <rect
                    x={x}
                    y={barY}
                    width={BAR}
                    height={barHeight}
                    rx={4}
                    fill={up ? COLORS.up : COLORS.down}
                    fillOpacity={g.mark === 'strong' ? 1 : g.mark === 'marked' ? 0.8 : 0.45}
                  />
                  <text
                    x={labelX}
                    y={up ? barY - 7 : barY + barHeight + 15}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={up ? COLORS.up : COLORS.down}
                  >
                    {signed(g.deviation)}%
                  </text>
                  <title>{`${g.attributeLabel}: ${g.band}`}</title>
                  {/* Dos líneas cortas y horizontales: el intervalo y, debajo, el atributo (o la unidad si ya
                      se filtró por uno). */}
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor="middle"
                    fontSize={12}
                    fontWeight={700}
                    fill={active ? COLORS.text : COLORS.muted}
                  >
                    {shortInterval(g)}
                  </text>
                  <text
                    x={labelX}
                    y={labelY + 15}
                    textAnchor="middle"
                    fontSize={10.5}
                    fontWeight={500}
                    fill={COLORS.muted}
                  >
                    {filter === 'all' ? g.attributeLabel : UNITS[g.attribute]}
                  </text>
                </g>
              )
            })}

            <line
              x1={MARGIN.left}
              x2={width - MARGIN.right}
              y1={zero}
              y2={zero}
              stroke={COLORS.text}
              strokeWidth={1.5}
            />
          </svg>
        </div>
      )}

      <div className={styles.detail} aria-live="polite">
        {hovered ? (
          <>
            <span className={`${styles.detailTag} ${hovered.value > 0 ? styles.detailUp : styles.detailDown}`}>
              {hovered.value > 0 ? '↑ Sube' : '↓ Baja'}
            </span>
            <span className={styles.detailGroup}>
              <span className={styles.detailAttribute}>{hovered.attributeLabel}</span>
              <strong>{hovered.band}</strong>
            </span>
            <span className={styles.detailFigures}>
              <span>
                Desvío <strong>{signed(hovered.deviation)} %</strong>
              </span>
              <span>
                Posición media <strong>{signed(hovered.positionChange)} puestos</strong>
              </span>
              <span>
                <strong>{hovered.count}</strong> socios
              </span>
              <span>{hovered.mark === 'strong' ? 'Fuerte' : hovered.mark === 'marked' ? 'Marcado' : 'Sin marca'}</span>
            </span>
          </>
        ) : (
          <span className={styles.detailHint}>Pasá el mouse o enfocá una barra para ver el detalle del grupo.</span>
        )}
      </div>
    </div>
  )
}

export default EquityChart
