import { useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import GuideSection from '../components/GuideSection.jsx'
import HeroHeader from '../components/HeroHeader.jsx'
import { useAuth } from '../components/authContext.js'
import { adminSections, memberSections } from '../guide/sections.js'
import pageStyles from './Page.module.css'
import styles from './UserGuide.module.css'

// Manual de uso: cada rol ve solo el suyo. Un admin puede mirar el del socio para responder consultas.
function UserGuide() {
  const { user } = useAuth()
  const { hash } = useLocation()
  const [searchParams] = useSearchParams()
  const isAdmin = user.role === 'admin'
  const showMember = !isAdmin || searchParams.get('vista') === 'socio'
  const sections = showMember ? memberSections : adminSections

  // Un link con #id llega con esa sección abierta.
  const [openIds, setOpenIds] = useState(() => new Set(hash ? [hash.slice(1)] : []))

  function toggle(id, open) {
    setOpenIds((current) => {
      if (current.has(id) === open) return current
      const next = new Set(current)
      if (open) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const allOpen = sections.every((section) => openIds.has(section.id))

  return (
    <main className={pageStyles.page}>
      <HeroHeader
        title="Manual de uso"
        lead={
          showMember
            ? 'Qué podés hacer en Pasión de 10 y qué encontrás en cada sección.'
            : 'Cómo administrar tu club en Pasión de 10, sección por sección.'
        }
        backTo="/"
      />

      {isAdmin && (
        <p className={styles.viewSwitch}>
          {showMember ? (
            <>
              Estás viendo el manual del socio. <Link to="/help">Volver al manual del admin</Link>
            </>
          ) : (
            <>
              ¿Te consultó un socio? <Link to="/help?vista=socio">Ver lo que ve el socio</Link>
            </>
          )}
        </p>
      )}

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.toggleAll}
          onClick={() => setOpenIds(allOpen ? new Set() : new Set(sections.map((section) => section.id)))}
        >
          {allOpen ? 'Cerrar todas' : 'Abrir todas'}
        </button>
      </div>

      <div className={styles.sections}>
        {sections.map(({ id, icon, title, teaser, Body }) => (
          <GuideSection
            key={id}
            id={id}
            icon={icon}
            title={title}
            teaser={teaser}
            open={openIds.has(id)}
            onToggle={toggle}
          >
            <Body viewerIsAdmin={isAdmin} />
          </GuideSection>
        ))}
      </div>
    </main>
  )
}

export default UserGuide
