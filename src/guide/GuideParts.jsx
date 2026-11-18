import styles from './GuideParts.module.css'

// Mensajes tal como los muestra la app, con qué los provoca y qué hacer.
// rows: [{ message, cause, action }]
export function ErrorTable({ caption, rows }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <caption className={styles.srOnly}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Si ves</th>
            <th scope="col">Qué pasó</th>
            <th scope="col">Qué hacer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.message}>
              <td className={styles.message}>{row.message}</td>
              <td>{row.cause}</td>
              <td>{row.action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// terms: [{ term, definition }]
export function Glossary({ terms }) {
  return (
    <dl className={styles.glossary}>
      {terms.map(({ term, definition }) => (
        <div key={term} className={styles.term}>
          <dt>{term}</dt>
          <dd>{definition}</dd>
        </div>
      ))}
    </dl>
  )
}

// Recorrido numerado; cada paso con un título corto y su detalle.
// steps: [{ title, detail }]
export function Steps({ steps }) {
  return (
    <ol className={styles.steps}>
      {steps.map(({ title, detail }) => (
        <li key={title}>
          <strong>{title}</strong>
          {detail && <span>{detail}</span>}
        </li>
      ))}
    </ol>
  )
}

export function Note({ children }) {
  return <p className={styles.note}>{children}</p>
}
