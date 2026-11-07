import { Link, useParams } from 'react-router'
import pageStyles from './Page.module.css'

// HU-37: cronograma de habilitación de las olas de un partido. Solo admins.
function WaveSchedule() {
  const { id } = useParams()

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link
          to={`/admin/segmentation/${encodeURIComponent(id)}`}
          className={pageStyles.back}
          aria-label="Volver a las olas del partido"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Cronograma de oleadas</h1>
        <p className={pageStyles.lead}>
          Definí la apertura de la primera oleada y el cierre general: las demás se habilitan solas, repartidas en
          partes iguales, empezando por la ola 1.
        </p>
      </header>
    </main>
  )
}

export default WaveSchedule
