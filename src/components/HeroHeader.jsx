import { Link } from 'react-router'
import Logo from './Logo.jsx'
import styles from './HeroHeader.module.css'

// Encabezado verde con el escudo. Con `backTo`, muestra la flecha de volver a la izquierda del título.
function HeroHeader({ title, lead, backTo }) {
  return (
    <header className={styles.hero}>
      <div className={styles.heroText}>
        <div className={styles.heading}>
          {backTo && (
            <Link to={backTo} className={styles.back} aria-label="Volver al inicio">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </Link>
          )}
          <h1 className={styles.greeting}>{title}</h1>
        </div>
        {lead && <p className={styles.lead}>{lead}</p>}
      </div>
      <Logo />
    </header>
  )
}

export default HeroHeader
