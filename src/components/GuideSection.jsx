import styles from './GuideSection.module.css'

// Íconos de 24x24 con trazo, como los de la barra lateral.
const ICONS = {
  start: 'M5 12h14M13 6l6 6-6 6',
  calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 3M16 6h3a3 3 0 0 1-3 3M12 13v4M8 20h8',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  chart: 'M4 18l5-6 4 3 7-9M15 6h5v5',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12',
  bars: 'M4 20h16M7 20v-6M12 20V6M17 20v-10',
  waves: 'M3 7c3-2 6 2 9 0s6-2 9 0M3 12c3-2 6 2 9 0s6-2 9 0M3 17c3-2 6 2 9 0s6-2 9 0',
  clipboard: 'M9 4h6v3H9zM9 5H6v16h12V5h-3M9 13l2 2 4-4',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  route:
    'M6 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM18 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM6 15V9a4 4 0 0 1 4-4h6M18 9v6a4 4 0 0 1-4 4H8',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5ZM19 19v2H6',
  alert: 'M12 3 2 20h20L12 3ZM12 10v4M12 17h.01',
  help: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17.5h.01',
  mail: 'M3 5h18v14H3zM3 7l9 6 9-6',
}

// Sección desplegable del manual. Queda controlada por la página para poder abrir o cerrar todas juntas.
function GuideSection({ id, icon, title, teaser, open, onToggle, children }) {
  return (
    <details id={id} className={styles.section} open={open} onToggle={(event) => onToggle(id, event.target.open)}>
      <summary className={styles.summary}>
        <span className={styles.icon} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d={ICONS[icon]} />
          </svg>
        </span>
        <span className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          {teaser && <span className={styles.teaser}>{teaser}</span>}
        </span>
        <svg className={styles.chevron} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}

export default GuideSection
