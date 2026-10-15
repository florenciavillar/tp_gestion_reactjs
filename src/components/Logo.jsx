import styles from './Logo.module.css'

const CENTER = 100
const BALL_RADIUS = 34
const PATCH_RADIUS = 12

// Vértices de un pentágono regular centrado en (cx, cy), rotado `rotation` grados.
function pentagon(cx, cy, r, rotation) {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = ((rotation + i * 72) * Math.PI) / 180
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)]
  })
}

const toPoints = (vertices) => vertices.map(([x, y]) => `${x},${y}`).join(' ')

const centerPatch = pentagon(CENTER, CENTER, PATCH_RADIUS, -90)

// Un parche en el borde por cada vértice del pentágono central, apuntando hacia adentro.
const edgePatches = centerPatch.map((_, i) => {
  const angle = ((-90 + i * 72) * Math.PI) / 180
  const cx = CENTER + (BALL_RADIUS + 2) * Math.cos(angle)
  const cy = CENTER + (BALL_RADIUS + 2) * Math.sin(angle)
  return pentagon(cx, cy, PATCH_RADIUS, -90 + i * 72 + 180)
})

function Logo() {
  return (
    <svg className={styles.logo} viewBox="0 0 200 200" role="img" aria-label="Pasión de 10">
      <defs>
        <path id="logo-top-arc" d="M 50 100 A 50 50 0 0 1 150 100" />
        <path id="logo-bottom-arc" d="M 40 100 A 60 60 0 0 0 160 100" />
        <clipPath id="logo-ball-clip">
          <circle cx={CENTER} cy={CENTER} r={BALL_RADIUS} />
        </clipPath>
      </defs>

      <text className={styles.text}>
        <textPath href="#logo-top-arc" startOffset="50%" textAnchor="middle">
          Pasión
        </textPath>
      </text>

      <g clipPath="url(#logo-ball-clip)">
        <circle cx={CENTER} cy={CENTER} r={BALL_RADIUS} className={styles.ballFill} />
        {centerPatch.map(([x, y], i) => {
          const [ex, ey] = edgePatches[i][0]
          return <line key={i} x1={x} y1={y} x2={ex} y2={ey} className={styles.seam} />
        })}
        <polygon points={toPoints(centerPatch)} className={styles.patch} />
        {edgePatches.map((patch, i) => (
          <polygon key={i} points={toPoints(patch)} className={styles.patch} />
        ))}
      </g>
      <circle cx={CENTER} cy={CENTER} r={BALL_RADIUS} className={styles.ballOutline} />

      <text className={styles.text}>
        <textPath href="#logo-bottom-arc" startOffset="50%" textAnchor="middle">
          de 10
        </textPath>
      </text>
    </svg>
  )
}

export default Logo
