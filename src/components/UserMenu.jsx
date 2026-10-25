import { useEffect, useId, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from './authContext.js'
import styles from './UserMenu.module.css'

// Botón con el ícono de usuario que abre las opciones de la cuenta. Las opciones dependen del rol.
function UserMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const buttonRef = useRef(null)
  const dialogRef = useRef(null)
  const menuId = useId()
  const dialogTitleId = useId()

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event) {
      if (!containerRef.current.contains(event.target)) setOpen(false)
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false)
        buttonRef.current.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  // HU-11: el logout se confirma antes de cerrar la sesión.
  function askLogout() {
    setOpen(false)
    dialogRef.current.showModal()
  }

  async function handleLogout() {
    dialogRef.current.close()
    await signOut()
    navigate('/sign-in', { replace: true })
  }

  function handleDialogClick(event) {
    // Un clic en el fondo oscuro (fuera del contenido) cancela.
    if (event.target === dialogRef.current) dialogRef.current.close()
  }

  const close = () => setOpen(false)

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menú de la cuenta"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      </button>

      {open && (
        <div id={menuId} className={styles.menu}>
          <div className={styles.header}>
            <span className={styles.name}>{user.name}</span>
            <span className={styles.email}>{user.email}</span>
          </div>
          <ul className={styles.list}>
            <li><Link to="/profile" className={styles.item} onClick={close}>Perfil</Link></li>
            {user.role === 'admin' && (
              <li><Link to="/admin/invite" className={styles.item} onClick={close}>Invitar Admin</Link></li>
            )}
            <li>
              <button type="button" className={styles.item} onClick={askLogout}>Cerrar Sesión</button>
            </li>
          </ul>
        </div>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={dialogTitleId}
        onClick={handleDialogClick}
        onClose={() => buttonRef.current?.focus()}
      >
        <div className={styles.dialogBody}>
          <h2 id={dialogTitleId} className={styles.dialogTitle}>¿Cerrar sesión?</h2>
          <p className={styles.dialogText}>Para volver a ingresar vas a necesitar un código nuevo, que te llega por email.</p>
          <div className={styles.dialogActions}>
            <button type="button" className={styles.cancel} onClick={() => dialogRef.current.close()} autoFocus>
              Cancelar
            </button>
            <button type="button" className={styles.confirm} onClick={handleLogout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </dialog>
    </div>
  )
}

export default UserMenu
