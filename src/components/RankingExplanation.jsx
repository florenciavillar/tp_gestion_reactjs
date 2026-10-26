import styles from './RankingExplanation.module.css'

// Explicación del ranking (HU-13), tal como la leen los socios. La arma el backend con la plantilla
// de la fórmula y sus valores: acá solo se muestra. La usa la vista previa del Admin (HU-27).
function RankingExplanation({ explanation }) {
  return (
    <article className={styles.explanation}>
      <h2 className={styles.title}>{explanation.title}</h2>
      {explanation.blocks.map((block) =>
        block.sections.map((section) => (
          <section key={`${block.id}-${section.heading}`} className={styles.section}>
            <h3 className={styles.heading}>{section.heading}</h3>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className={styles.paragraph}>{paragraph}</p>
            ))}
          </section>
        )),
      )}
    </article>
  )
}

export default RankingExplanation
