import { Link } from 'react-router'
import { useAuth } from '../components/authContext.js'
import pageStyles from './Page.module.css'
import styles from './Profile.module.css'

const ROLE_LABELS = { admin: 'Admin', member: 'Socio' }

// Datos de la cuenta logueada, solo lectura.
function Profile() {
  const { user } = useAuth()

  return (
    <main className={`${pageStyles.page} ${pageStyles.single}`}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className={pageStyles.title}>Perfil</h1>
      </header>

      <section className={pageStyles.card} aria-label="Datos de la cuenta">
        <div className={styles.avatar} aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 21a8 8 0 0 1 16 0" />
          </svg>
        </div>

        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>Nombre</dt>
            <dd>{user.name}</dd>
          </div>
          <div className={styles.row}>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
          <div className={styles.row}>
            <dt>Rol</dt>
            <dd>{ROLE_LABELS[user.role] ?? user.role}</dd>
          </div>
          {user.member_id && (
            <div className={styles.row}>
              <dt>Número de socio</dt>
              <dd>{user.member_id}</dd>
            </div>
          )}
        </dl>
      </section>
    </main>
  )
}

export default Profile
