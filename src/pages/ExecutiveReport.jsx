import { Link } from 'react-router'
import ExecutiveReportView from '../components/ExecutiveReportView.jsx'
import pageStyles from './Page.module.css'

// HU-42: reporte ejecutivo de scoring y equidad, en su propia pantalla (menú Ranking → Reporte ejecutivo).
// Solo admins.
function ExecutiveReport() {
  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/admin/ranking" className={pageStyles.back} aria-label="Volver a Ranking">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Reporte ejecutivo</h1>
      </header>
      <ExecutiveReportView />
    </main>
  )
}

export default ExecutiveReport
