import { Link } from 'react-router'
import Logo from '../components/Logo.jsx'
import { useAuth } from '../components/authContext.js'
import styles from './Home.module.css'

// Inicio común a socios y administradores. Las acciones de la cuenta están en el menú de usuario
// y los eventos tienen su propia pantalla (/events), accesible desde la barra superior.
function Home() {
  const { user } = useAuth()

  return (
    <main className={styles.page}>
      <Logo />
      <h1 className={styles.greeting}>Hola, {user.name}</h1>
      <p className={styles.lead}>
        {user.role === 'admin'
          ? 'Revisá los eventos pendientes de publicar.'
          : 'Mirá los próximos partidos y eventos del club.'}
      </p>
      <Link to="/events" className={styles.cta}>
        Ver eventos
      </Link>
    </main>
  )
}

export default Home
