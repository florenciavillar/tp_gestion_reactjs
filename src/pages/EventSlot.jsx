import { Link } from 'react-router'
import styles from './Page.module.css'

// Destino del link "Ver mi turno" de HU-17 (FR-006). La pantalla del turno es HU-39: hasta que
// exista, avisa que el turno todavía no está disponible.
function EventSlot() {
  return (
    <main className={`${styles.page} ${styles.single}`}>
      <header className={styles.header}>
        <Link to="/events" className={styles.back} aria-label="Volver a los eventos">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={styles.title}>Tu turno</h1>
      </header>

      <section className={styles.card}>
        <p className={styles.lead}>
          Tu turno para este evento todavía no está disponible. Lo vas a ver acá cuando se publique el
          cronograma de ingreso.
        </p>
      </section>
    </main>
  )
}

export default EventSlot