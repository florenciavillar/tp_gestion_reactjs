import styles from './RankingExplanation.module.css'

// Explicación del ranking (HU-13), tal como la leen los socios. La arma el backend con la plantilla
// de la fórmula y sus valores: acá solo se muestra. La usa la vista previa del Admin (HU-27) y la
// pantalla del socio.
// `asPage`: la pantalla ya pone el título como h1, así que no se repite y las secciones pasan a h2.
function RankingExplanation({ explanation, asPage = false }) {
  const Heading = asPage ? 'h2' : 'h3'
  return (
    <article className={asPage ? styles.page : styles.explanation}>
      {!asPage && <h2 className={styles.title}>{explanation.title}</h2>}
      {explanation.blocks.map((block) =>
        block.sections.map((section, sectionIndex) => (
          <section key={`${block.id}-${sectionIndex}`} className={styles.section}>
            <Heading className={styles.heading}>{section.heading}</Heading>
            {section.paragraphs.map((paragraph, index) => (
              <p key={index} className={styles.paragraph}>
                {paragraph}
              </p>
            ))}
          </section>
        )),
      )}
    </article>
  )
}

export default RankingExplanation
