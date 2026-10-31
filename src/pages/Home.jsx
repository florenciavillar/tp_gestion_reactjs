import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../components/authContext.js'
import pageStyles from './Page.module.css'
import styles from './Home.module.css'

// Inicio común a socios y administradores. Las acciones de la cuenta están en el menú de usuario
// y los eventos tienen su propia pantalla (/events), accesible desde la barra superior.
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
              <Link to="/ranking/explanation" className={styles.secondary}>
                ¿Cómo se calcula mi puntaje?
              </Link>
            )}
          </div>
        </div>
        <Logo />
      </section>
    </main>
  )
}

export default Home
