import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import RankingExplanation from '../components/RankingExplanation.jsx'
import { getRankingExplanation } from '../services/formula.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'

const TITLE = '¿Cómo se calcula mi puntaje?'
const LOAD_ERROR = 'No pudimos cargar la explicación. Probá de nuevo en un rato.'
const NO_CLUB = 'Tu cuenta no tiene un club asignado. Consultá con el club.'

// HU-13: cómo se calcula el puntaje, de solo lectura, con las reglas vigentes del club del socio.
// El texto lo arma el backend (el mismo que ve el Admin en la vista previa de HU-27).
function RankingExplanationPage() {
  const [state, setState] = useState({ status: 'loading' })

  useEffect(() => {
    let ignore = false
    getRankingExplanation()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data })
      })
      .catch((err) => {
        if (!ignore) setState({ status: 'error', message: err.code === 'MEMBER_WITHOUT_CLUB' ? NO_CLUB : LOAD_ERROR })
      })
    return () => {
      ignore = true
    }
  }, [])

  const data = state.status === 'ready' ? state.data : null

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>{TITLE}</h1>
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando la explicación…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {data?.status === 'none' && <p className={`${pageStyles.card} ${styles.muted}`}>{data.message}</p>}

      {data?.status === 'published' && (
        <>
          {data.notice && (
            <p className={styles.banner} role="status">
              {data.notice.message}
            </p>
          )}
          <RankingExplanation explanation={data.explanation} asPage />
        </>
      )}
    </main>
  )
}

export default RankingExplanationPage
