import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import styles from './Auth.module.css'

// Destino del link "Ver mi turno" de HU-17 (FR-006). La pantalla del turno es HU-39: hasta que
// exista, avisa que el turno todavía no está disponible.
function EventSlot() {
  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <Link to="/events" className={styles.back} aria-label="Volver a los eventos">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>

        <h1 className={styles.title}>Tu turno</h1>
        <p className={styles.message}>
          Tu turno para este evento todavía no está disponible. Lo vas a ver acá cuando se publique el
          cronograma de ingreso.
        </p>
      </section>
    </main>
  )
}

export default EventSlot