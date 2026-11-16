import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { getEventSlot } from '../services/events.js'
import styles from './Page.module.css'

// Destino del link "Ver mi turno" de HU-17 (FR-006) y HU-39.
// Muestra el estado del turno, o mensaje si fue retirado / sin cronograma (HU-23 US2 Esc. 6).
function EventSlot() {
  const { id } = useParams()
  const [slot, setSlot] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    getEventSlot(id)
      .then((data) => {
        if (!ignore) {
          setSlot(data)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!ignore) {
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [id])

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
        {loading ? (
          <p className={styles.muted}>Cargando información del turno…</p>
        ) : slot ? (
          <>
            <h2 className={styles.cardTitle}>{slot.event?.titulo}</h2>
            {slot.status === 'withdrawn' ? (
              <p className={styles.lead} role="alert" style={{ color: 'var(--color-error, #b00020)' }}>
                {slot.message || 'Este evento fue retirado.'}
              </p>
            ) : slot.message ? (
              <p className={styles.lead}>{slot.message}</p>
            ) : (
              <p className={styles.lead}>
                Tu turno está asignado. Cierre general: {slot.closing_at || 'A confirmar'}
              </p>
            )}
          </>
        ) : (
          <p className={styles.lead}>
            Tu turno para este evento todavía no está disponible. Lo vas a ver acá cuando se publique el cronograma de
            ingreso.
          </p>
        )}
      </section>
    </main>
  )
}

export default EventSlot
