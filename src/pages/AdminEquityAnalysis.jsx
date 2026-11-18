import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  downloadEquitySimulationCsv,
  equitySimulationErrorMessage,
  getRulesSimulationForm,
  runRulesSimulation,
} from '../services/equitySimulation.js'
import EquityImpactChart from '../components/EquityImpactChart.jsx'
import authStyles from './Auth.module.css'
import pageStyles from './Page.module.css'
import styles from './AdminEquityAnalysis.module.css'

function AdminEquityAnalysis() {
  const [formConfig, setFormConfig] = useState(null)
  const [formValues, setFormValues] = useState({})
  const [activeTab, setActiveTab] = useState('seniority') // 'seniority' | 'distance' | 'age'
  const [loadError, setLoadError] = useState('')
  const [simError, setSimError] = useState('')
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    let ignore = false
    getRulesSimulationForm()
      .then((cfg) => {
        if (!ignore) {
          setFormConfig(cfg)
          setFormValues({ ...cfg.values })
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!ignore) {
          setLoadError(equitySimulationErrorMessage(err))
          setLoading(false)
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  function handleInputChange(key, val) {
    setFormValues((prev) => ({ ...prev, [key]: val }))
  }

  function handleReset() {
    if (formConfig) {
      setFormValues({ ...formConfig.values })
      setResult(null)
      setSimError('')
    }
  }

  function handleLoadRulesInForce() {
    if (formConfig?.rules_in_force?.values) {
      setFormValues({ ...formConfig.rules_in_force.values })
    }
  }

  async function handleSimulate(e) {
    e.preventDefault()
    setSimulating(true)
    setSimError('')
    try {
      const res = await runRulesSimulation(formValues)
      setResult(res)
    } catch (err) {
      setSimError(equitySimulationErrorMessage(err))
    } finally {
      setSimulating(false)
    }
  }

  async function handleExportCsv() {
    if (!result?.ranking?.id) return
    setExporting(true)
    try {
      await downloadEquitySimulationCsv(result.ranking.id, formValues)
    } catch (err) {
      setSimError(equitySimulationErrorMessage(err, 'No se pudo descargar el archivo CSV.'))
    } finally {
      setExporting(false)
    }
  }

  const equity = result?.equity
  const selectedSegmentation = equity?.segmentations?.find((s) => s.attribute === activeTab)

  return (
    <main className={pageStyles.page}>
      <header className={pageStyles.header}>
        <Link to="/" className={pageStyles.back} aria-label="Volver al inicio">
          <svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20">
            <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </Link>
        <div>
          <h1 className={pageStyles.title}>Análisis de equidad</h1>
          <p className={styles.cardSubtitle}>
            Simulación del impacto en los perfiles de socios y equidad por grupos
          </p>
        </div>
      </header>

      {loadError && (
        <p className={authStyles.error} role="alert">
          {loadError}
        </p>
      )}

      {loading && <p className={styles.baselineText}>Cargando datos de la simulación…</p>}

      {!loading && formConfig && (
        <div className={styles.container}>
          {/* Tarjeta de contexto de referencia */}
          <section className={styles.introCard}>
            <p className={styles.baselineText}>{formConfig.baseline_text}</p>
            {formConfig.rules_in_force?.differs && (
              <div className={styles.noticeDiffers}>
                <span>{formConfig.rules_in_force.notice}</span>
                <button
                  type="button"
                  onClick={handleLoadRulesInForce}
                  className={styles.btnSecondarySmall}
                >
                  Cargar reglas vigentes
                </button>
              </div>
            )}
          </section>

          {/* Formulario de parámetros */}
          <section className={styles.formSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Parámetros de la simulación</h2>
              <button
                type="button"
                onClick={handleReset}
                className={styles.btnSecondarySmall}
                disabled={simulating}
              >
                Restablecer a valores del ranking
              </button>
            </div>

            <form onSubmit={handleSimulate}>
              <div className={styles.formGrid}>
                {formConfig.formula?.parameters?.map((p) => (
                  <div key={p.key} className={styles.field}>
                    <label htmlFor={`param-${p.key}`} className={styles.label}>
                      {p.name}
                    </label>
                    <span className={styles.sublabel}>
                      {p.description}
                    </span>
                    <input
                      id={`param-${p.key}`}
                      type="text"
                      className={styles.input}
                      value={formValues[p.key] ?? ''}
                      onChange={(e) => handleInputChange(p.key, e.target.value)}
                      disabled={simulating}
                    />
                  </div>
                ))}
              </div>

              {simError && (
                <p className={authStyles.error} role="alert" style={{ marginBottom: '1rem' }}>
                  {simError}
                </p>
              )}

              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.btnPrimary}
                  disabled={simulating}
                >
                  {simulating ? 'Simulando…' : 'Simular impacto y equidad'}
                </button>
              </div>
            </form>
          </section>

          {/* Resultados de equidad */}
          {equity && equity.status === 'unavailable' && (
            <section className={styles.introCard}>
              <p className={authStyles.error} role="alert">
                {equity.message || 'No pudimos calcular el análisis de equidad. Los resultados generales siguen siendo válidos.'}
              </p>
            </section>
          )}

          {equity && equity.status === 'available' && (
            <>
              {/* Veredicto General */}
              {equity.verdict && (
                <section className={styles.verdictCard}>
                  {equity.verdict.code === 'EQUITY_OK' && (
                    <span className={styles.verdictBadgeOk}>Equidad OK</span>
                  )}
                  {equity.verdict.code === 'EQUITY_ATTENTION' && (
                    <span className={styles.verdictBadgeAttention}>Atención / Revisar diferencias</span>
                  )}
                  {equity.verdict.code === 'EQUITY_BIAS' && (
                    <span className={styles.verdictBadgeBias}>Sesgo / Diferencia marcada</span>
                  )}
                  <p className={styles.verdictExecutive}>
                    {equity.verdict.code === 'EQUITY_BIAS'
                      ? 'El cambio favorece o perjudica de forma marcada a grupos específicos del padrón. En el gráfico siguiente se detalla el porcentaje de impacto por grupo.'
                      : equity.verdict.code === 'EQUITY_ATTENTION'
                      ? 'El cambio genera diferencias moderadas entre grupos de socios para revisar antes de publicar.'
                      : 'Sin diferencias marcadas: el cambio propuesto no favorece ni perjudica de más a ningún grupo.'}
                  </p>
                  <p className={styles.verdictScope}>{equity.verdict.scope}</p>

                  <details className={styles.verdictDetails}>
                    <summary className={styles.verdictSummaryToggle}>
                      Ver detalle textual completo del veredicto
                    </summary>
                    <p className={styles.verdictTextDetail}>{equity.verdict.text}</p>
                  </details>
                </section>
              )}

              {/* Gráfico interactivo y visual de impacto en equidad */}
              {equity.segmentations && (
                <EquityImpactChart
                  segmentations={equity.segmentations}
                  rankingId={result?.ranking?.id}
                />
              )}

              {/* Perfil de los socios que se mueven */}
              {equity.profile && (
                <section className={styles.tableCard}>
                  <h2 className={styles.sectionTitle}>Perfil de los socios que se mueven</h2>
                  <p className={styles.cardSubtitle}>
                    Compara a los socios que suben o bajan al menos {equity.profile.relevant_threshold} posiciones
                    con respecto al total del ranking. Este perfil es descriptivo: qué perfil premiar es decisión del club.
                  </p>

                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Variable / Indicador</th>
                        {equity.profile.groups.map((g) => (
                          <th key={g.group}>
                            {g.label}
                            <span className={styles.groupHeaderSub}>
                              {g.count} socios ({g.share} %)
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><strong>Distancia al estadio (mediana km)</strong></td>
                        {equity.profile.groups.map((g) => (
                          <td key={g.group}>
                            {g.too_small ? (
                              <span className={styles.groupTooSmall}>{g.message}</span>
                            ) : (
                              <>
                                <span className={styles.valuePrimary}>{g.variables.distance_km.value} km</span>
                                {g.group !== 'all' && (
                                  <span
                                    className={
                                      Number(g.variables.distance_km.difference) > 0
                                        ? styles.valueDiffPositive
                                        : Number(g.variables.distance_km.difference) < 0
                                        ? styles.valueDiffNegative
                                        : styles.valueDiffZero
                                    }
                                  >
                                    ({Number(g.variables.distance_km.difference) > 0 ? '+' : ''}
                                    {g.variables.distance_km.difference})
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td><strong>Antigüedad ininterrumpida (mediana años)</strong></td>
                        {equity.profile.groups.map((g) => (
                          <td key={g.group}>
                            {g.too_small ? (
                              <span className={styles.groupTooSmall}>{g.message}</span>
                            ) : (
                              <>
                                <span className={styles.valuePrimary}>{g.variables.seniority_years.value} años</span>
                                {g.group !== 'all' && (
                                  <span
                                    className={
                                      Number(g.variables.seniority_years.difference) > 0
                                        ? styles.valueDiffPositive
                                        : Number(g.variables.seniority_years.difference) < 0
                                        ? styles.valueDiffNegative
                                        : styles.valueDiffZero
                                    }
                                  >
                                    ({Number(g.variables.seniority_years.difference) > 0 ? '+' : ''}
                                    {g.variables.seniority_years.difference})
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td><strong>Edad del socio (mediana años)</strong></td>
                        {equity.profile.groups.map((g) => (
                          <td key={g.group}>
                            {g.too_small ? (
                              <span className={styles.groupTooSmall}>{g.message}</span>
                            ) : (
                              <>
                                <span className={styles.valuePrimary}>{g.variables.age_years.value} años</span>
                                {g.group !== 'all' && (
                                  <span
                                    className={
                                      Number(g.variables.age_years.difference) > 0
                                        ? styles.valueDiffPositive
                                        : Number(g.variables.age_years.difference) < 0
                                        ? styles.valueDiffNegative
                                        : styles.valueDiffZero
                                    }
                                  >
                                    ({Number(g.variables.age_years.difference) > 0 ? '+' : ''}
                                    {g.variables.age_years.difference})
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td>
                          <strong>Asistencia a partidos Clase C (%)</strong>
                          <span className={styles.groupHeaderSub}>Sobre socios con al menos 1 partido Clase C</span>
                        </td>
                        {equity.profile.groups.map((g) => (
                          <td key={g.group}>
                            {g.too_small || g.variables.class_c_attendance.too_small ? (
                              <span className={styles.groupTooSmall}>
                                {g.variables?.class_c_attendance?.message || g.message}
                                {g.variables?.class_c_attendance?.count !== undefined && (
                                  ` (${g.variables.class_c_attendance.count} socios)`
                                )}
                              </span>
                            ) : (
                              <>
                                <span className={styles.valuePrimary}>
                                  {g.variables.class_c_attendance.value} %
                                </span>
                                {g.group !== 'all' && (
                                  <span
                                    className={
                                      Number(g.variables.class_c_attendance.difference) > 0
                                        ? styles.valueDiffPositive
                                        : Number(g.variables.class_c_attendance.difference) < 0
                                        ? styles.valueDiffNegative
                                        : styles.valueDiffZero
                                    }
                                  >
                                    ({Number(g.variables.class_c_attendance.difference) > 0 ? '+' : ''}
                                    {g.variables.class_c_attendance.difference} %)
                                  </span>
                                )}
                                <span className={styles.groupHeaderSub}>
                                  {g.variables.class_c_attendance.count} socios evaluados
                                </span>
                              </>
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td><strong>Puntos institucionales crudos (mediana)</strong></td>
                        {equity.profile.groups.map((g) => (
                          <td key={g.group}>
                            {g.too_small ? (
                              <span className={styles.groupTooSmall}>{g.message}</span>
                            ) : (
                              <>
                                <span className={styles.valuePrimary}>{g.variables.institutional_points.value} pts</span>
                                {g.group !== 'all' && (
                                  <span
                                    className={
                                      Number(g.variables.institutional_points.difference) > 0
                                        ? styles.valueDiffPositive
                                        : Number(g.variables.institutional_points.difference) < 0
                                        ? styles.valueDiffNegative
                                        : styles.valueDiffZero
                                    }
                                  >
                                    ({Number(g.variables.institutional_points.difference) > 0 ? '+' : ''}
                                    {g.variables.institutional_points.difference})
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        ))}
                      </tr>

                      <tr>
                        <td><strong>Socios con participación institucional (%)</strong></td>
                        {equity.profile.groups.map((g) => (
                          <td key={g.group}>
                            {g.too_small ? (
                              <span className={styles.groupTooSmall}>{g.message}</span>
                            ) : (
                              <>
                                <span className={styles.valuePrimary}>{g.variables.with_institutional.value} %</span>
                                {g.group !== 'all' && (
                                  <span
                                    className={
                                      Number(g.variables.with_institutional.difference) > 0
                                        ? styles.valueDiffPositive
                                        : Number(g.variables.with_institutional.difference) < 0
                                        ? styles.valueDiffNegative
                                        : styles.valueDiffZero
                                    }
                                  >
                                    ({Number(g.variables.with_institutional.difference) > 0 ? '+' : ''}
                                    {g.variables.with_institutional.difference} %)
                                  </span>
                                )}
                              </>
                            )}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </section>
              )}

              {/* Equidad por segmentos */}
              {equity.segmentations && (
                <section className={styles.tableCard}>
                  <h2 className={styles.sectionTitle}>Equidad por segmentos</h2>
                  <p className={styles.cardSubtitle}>
                    Bandas fijas de la población fusionadas automáticamente para grupos de menos de 10 socios.
                  </p>

                  <div className={styles.tabsBar}>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${activeTab === 'seniority' ? styles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('seniority')}
                    >
                      Antigüedad
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${activeTab === 'distance' ? styles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('distance')}
                    >
                      Distancia
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${activeTab === 'age' ? styles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('age')}
                    >
                      Edad
                    </button>
                  </div>

                  {selectedSegmentation?.status === 'not_available' && (
                    <p className={authStyles.error} role="alert">
                      {selectedSegmentation.message}
                    </p>
                  )}

                  {selectedSegmentation?.status === 'available' && (
                    <>
                      {selectedSegmentation.verdict && (
                        <div style={{ marginBottom: '1rem' }}>
                          {selectedSegmentation.verdict.code === 'EQUITY_OK' && (
                            <span className={styles.verdictBadgeOk}>Sin diferencias marcadas</span>
                          )}
                          {selectedSegmentation.verdict.code === 'EQUITY_ATTENTION' && (
                            <span className={styles.verdictBadgeAttention}>Diferencias para revisar</span>
                          )}
                          {selectedSegmentation.verdict.code === 'EQUITY_BIAS' && (
                            <span className={styles.verdictBadgeBias}>Diferencia marcada</span>
                          )}
                          <p style={{ margin: '0.5rem 0', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
                            {selectedSegmentation.verdict.text}
                          </p>
                        </div>
                      )}

                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Banda</th>
                            <th>Socios</th>
                            <th>Puntaje actual</th>
                            <th>Puntaje simulado</th>
                            <th>Dif. puntaje</th>
                            <th>Posición actual</th>
                            <th>Posición simulada</th>
                            <th>Cambio posición</th>
                            <th>Desvío (% ranking)</th>
                            <th>Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedSegmentation.segments.map((seg, idx) => (
                            <tr key={idx}>
                              <td>
                                <strong>{seg.band.label}</strong>
                                {seg.largest_deviation && (
                                  <span className={styles.tagLargest}>Mayor desvío</span>
                                )}
                              </td>
                              <td>{seg.count}</td>
                              <td>{seg.avg_score_before}</td>
                              <td>{seg.avg_score_after}</td>
                              <td
                                className={
                                  Number(seg.avg_score_difference) > 0
                                    ? styles.valueDiffPositive
                                    : Number(seg.avg_score_difference) < 0
                                    ? styles.valueDiffNegative
                                    : ''
                                }
                              >
                                {Number(seg.avg_score_difference) > 0 ? '+' : ''}
                                {seg.avg_score_difference}
                              </td>
                              <td>#{seg.avg_position_before}</td>
                              <td>#{seg.avg_position_after}</td>
                              <td
                                className={
                                  Number(seg.avg_position_change) > 0
                                    ? styles.valueDiffPositive
                                    : Number(seg.avg_position_change) < 0
                                    ? styles.valueDiffNegative
                                    : ''
                                }
                              >
                                {Number(seg.avg_position_change) > 0 ? '+' : ''}
                                {seg.avg_position_change}
                              </td>
                              <td>
                                <strong>{seg.deviation} %</strong>
                              </td>
                              <td>
                                {seg.mark === 'strong' && (
                                  <span className={styles.tagStrong}>
                                    Fuerte ({seg.direction === 'favored' ? 'Favorecido ↑' : 'Perjudicado ↓'})
                                  </span>
                                )}
                                {seg.mark === 'marked' && (
                                  <span className={styles.tagMarked}>
                                    Marcado ({seg.direction === 'favored' ? 'Favorecido ↑' : 'Perjudicado ↓'})
                                  </span>
                                )}
                                {seg.mark === 'none' && (
                                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                    Neutro
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </section>
              )}

              {/* Botón de Exportar CSV */}
              <div className={styles.exportBar}>
                <button
                  type="button"
                  className={styles.btnExport}
                  onClick={handleExportCsv}
                  disabled={exporting}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16">
                    <path
                      d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                  {exporting ? 'Descargando…' : 'Descargar reporte completo (CSV)'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  )
}

export default AdminEquityAnalysis
