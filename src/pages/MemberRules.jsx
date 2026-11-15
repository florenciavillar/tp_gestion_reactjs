import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import RankingExplanation from '../components/RankingExplanation.jsx'
import { formatDateTime } from '../services/eventFormat.js'
import { getRulesVersion, rulesErrorMessage } from '../services/eventHistory.js'
import authStyles from './Auth.module.css'
import styles from './Formula.module.css'
import pageStyles from './Page.module.css'

// HU-15: una versión de reglas del club del socio, la que regía en un evento de su historial. Solo
// lectura. La explicación la arma el back con la misma función que HU-13.
function MemberRules() {
  const { number } = useParams()
  // `number`: de qué versión es la respuesta guardada. Si no es la de la dirección, está cargando.
  const [loaded, setLoaded] = useState({ number: null })

  useEffect(() => {
    let ignore = false
    getRulesVersion(number)
      .then((data) => {
        if (!ignore) setLoaded({ number, status: 'ready', data })
      })
      .catch((err) => {
        if (!ignore) setLoaded({ number, status: 'error', message: rulesErrorMessage(err) })
      })
    return () => {
      ignore = true
    }
  }, [number])

  const state = loaded.number === number ? loaded : { status: 'loading' }
  const data = state.status === 'ready' ? state.data : null

  return (
    <main className={`${pageStyles.page} ${pageStyles.reading}`}>
      <header className={pageStyles.header}>
        <Link to="/ranking/history" className={pageStyles.back} aria-label="Volver a mi historial">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Reglas de puntaje (versión {number})</h1>
        {data && <p className={pageStyles.lead}>Publicadas el {formatDateTime(data.published_at)}</p>}
      </header>

      {state.status === 'loading' && (
        <p className={styles.muted} role="status">
          Cargando las reglas…
        </p>
      )}

      {state.status === 'error' && (
        <p className={authStyles.error} role="alert">
          {state.message}
        </p>
      )}

      {data && (
        <>
          {!data.in_force && <p className={styles.banner}>Estas reglas ya no están vigentes.</p>}
          <RankingExplanation explanation={data.explanation} asPage />
        </>
      )}
    </main>
  )
}

export default MemberRules
