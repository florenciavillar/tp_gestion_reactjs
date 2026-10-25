import { Link, useLocation } from 'react-router'
import Logo from '../components/Logo.jsx'
import styles from './Auth.module.css'

// Pantalla inicial (HU-00): dos puertas, una para socios y otra para admins. Cada una tiene sus cuentas.
function SignIn() {
  // Aviso que deja la pantalla anterior (por ejemplo, la sesión cerrada).
  const notice = useLocation().state?.notice

  return (
    <main className={styles.page}>
      <Logo />

      <section className={styles.card}>
        <h1 className={styles.title}>Bienvenido</h1>

        {notice && <p className={styles.message} role="status">{notice}</p>}

        <nav className={styles.doors} aria-label="Elegí cómo ingresar">
          <Link to="/sign-in/member" className={styles.door}>Acceso socios</Link>
          <Link to="/sign-in/admin" className={styles.doorSecondary}>Acceso admins</Link>
        </nav>

        <p className={styles.switch}>
          ¿Primera vez como socio? <Link to="/sign-up" className={styles.switchLink}>Activá tu cuenta</Link>
        </p>
      </section>
    </main>
  )
}

export default SignIn
