import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../components/authContext.js'
import pageStyles from './Page.module.css'
import styles from './Home.module.css'

// Inicio común a socios y administradores. Las acciones de la cuenta están en el menú de usuario
// y cada sección tiene su propia pantalla, accesible desde la barra lateral. Los accesos del inicio
// repiten las secciones de la barra lateral de cada rol.
function Home() {
  const { user } = useAuth()

  return (
    <main className={pageStyles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.greeting}>Hola, {user.name}</h1>
          <p className={styles.lead}>
            {user.role === 'admin'
              ? 'Revisá los eventos pendientes de publicar.'
              : 'Mirá los próximos partidos y eventos del club.'}
          </p>
          <div className={styles.actions}>
            <Link to="/events" className={styles.cta}>
              Ver eventos
            </Link>
            {user.role === 'member' && (
              <>
                <Link to="/ranking" className={styles.secondary}>
                  Ver mi puntaje
                </Link>
                <Link to="/ranking/explanation" className={styles.secondary}>
                  ¿Cómo se calcula mi puntaje?
                </Link>
              </>
            )}
            {user.role === 'admin' && (
              <>
                <Link to="/admin/formula" className={styles.secondary}>
                  Fórmula del puntaje
                </Link>
                <Link to="/admin/ranking" className={styles.secondary}>
                  Ranking de socios
                </Link>
              </>
            )}
          </div>
        </div>
        <Logo />
      </section>
    </main>
  )
}

export default Home
