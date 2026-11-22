// HU-42: textos explicativos del documento del reporte ejecutivo. Funciones puras: reciben los datos
// del reporte y devuelven párrafos en lenguaje llano, con las cifras del club redondeadas. Las palabras
// clave van entre **dobles asteriscos** y el documento las muestra en negrita.

function num(value) {
  return Number(value)
}

// Un decimal y coma: suficiente para un texto, sin abrumar con cifras.
function short(value) {
  return num(value).toFixed(1).replace('.', ',')
}

function pct(part, total) {
  return total > 0 ? Math.round((part / total) * 100) : 0
}

const PILLARS = {
  asistencia: { withArticle: 'la asistencia', weight: 'w_a' },
  institucional: { withArticle: 'la participación institucional', weight: 'w_p' },
  antiguedad: { withArticle: 'la antigüedad y edad', weight: 'w_t' },
}

// 1. Resumen
export function summaryExplanation(summary) {
  const mean = num(summary.mean_score)
  const median = num(summary.median_score)
  const gap = mean - median

  let shape
  if (gap > 1) {
    shape = `La mitad de los socios tiene más de **${short(median)} puntos** y la otra mitad menos: ese valor es la **mediana**. El **promedio** da algo más alto (${short(mean)}) porque hay **un grupo de socios muy activos** que levanta la cuenta. Por eso, para hablar del socio típico, conviene mirar la mediana.`
  } else if (gap < -1) {
    shape = `La mitad de los socios tiene más de **${short(median)} puntos** y la otra mitad menos: ese valor es la **mediana**. El **promedio** da algo más bajo (${short(mean)}) porque hay **un grupo de socios con muy poca actividad** que baja la cuenta. Por eso, para hablar del socio típico, conviene mirar la mediana.`
  } else {
    shape = `El **promedio** (${short(mean)} puntos) y la **mediana** (${short(median)}) prácticamente coinciden: los puntajes están **bien repartidos** alrededor del centro, sin un grupo que tire la cuenta para un lado.`
  }

  const cv = mean > 0 ? num(summary.std_dev) / mean : 0
  let spread
  if (cv < 0.25) {
    spread =
      'Los socios tienen **puntajes bastante parecidos** entre sí: no hay grandes distancias entre los más y los menos comprometidos.'
  } else if (cv < 0.5) {
    spread =
      'Entre los socios más y menos comprometidos hay **diferencias claras pero razonables**, sin extremos que llamen la atención.'
  } else {
    spread =
      'Las **diferencias entre socios son muy grandes**: conviven socios que participan muchísimo con otros que casi no suman puntos.'
  }

  const cap =
    summary.socios_at_cap > 0
      ? `${summary.socios_at_cap === 1 ? 'Un socio llegó' : `${summary.socios_at_cap} socios llegaron`} al **puntaje máximo** de 100. Entre ellos, el orden lo definen los **desempates**: primero la antigüedad y después la edad.`
      : 'Nadie llegó al **puntaje máximo** de 100, así que el tope no está igualando a los de arriba.'

  const tiedShare = pct(summary.ties.tied_socios_count, summary.total_socios)
  let ties
  if (summary.ties.tied_socios_count === 0) {
    ties = 'Tampoco hay **empates**: cada socio tiene un puntaje distinto.'
  } else if (tiedShare >= 20) {
    ties = `Cerca de **${tiedShare} de cada 100 socios** comparte el puntaje exacto con otro. Los **desempates** igual ordenan a cada uno en un lugar propio, pero es una proporción alta: indica que las reglas **distinguen poco** entre socios con actividad parecida.`
  } else {
    ties = `Hay algunos **empates** (${tiedShare === 0 ? 'menos de 1' : `cerca de ${tiedShare}`} de cada 100 socios), algo normal: los **desempates** ordenan a cada uno en un lugar propio.`
  }

  return [shape, spread, `${cap} ${ties}`]
}

// 2. Distribución
export function distributionExplanation(summary, histogram) {
  const peak = histogram.reduce((best, bin) => (bin.count > best.count ? bin : best), histogram[0])
  const oneIn = peak && peak.count > 0 ? Math.max(1, Math.round(summary.total_socios / peak.count)) : null
  const iqr = num(summary.percentiles.p75) - num(summary.percentiles.p25)

  const chart =
    peak && oneIn
      ? `Cada barra muestra **cuántos socios** quedaron en cada franja de puntaje. La franja más concurrida es la de **${peak.lower} a ${peak.upper} puntos**: ahí está más o menos **1 de cada ${oneIn} socios**.`
      : 'Cada barra muestra **cuántos socios** quedaron en cada franja de puntaje.'

  const extremes = `Para tener una idea de los extremos: el **10 % de abajo** no llega a ${short(summary.percentiles.p10)} puntos y el **10 % de arriba** pasa los ${short(summary.percentiles.p90)}. La **mitad del medio** del padrón está entre ${short(summary.percentiles.p25)} y ${short(summary.percentiles.p75)} puntos.`

  const waves =
    iqr < 15
      ? 'Como esa mitad del medio está **bastante apretada**, unos pocos partidos de más o de menos pueden hacer que un socio **suba o baje muchos lugares** en el orden de acceso a las oleadas.'
      : 'Esa mitad del medio está **bien escalonada**: para **escalar posiciones** en el orden de acceso a las oleadas no alcanza con un partido aislado, hace falta sostener la participación en el tiempo.'

  return [chart, extremes, waves]
}

// 3. Pilares
export function pillarMax(key, params) {
  const weight = PILLARS[key]?.weight
  if (!weight || params[weight] == null) return null
  const scale = key === 'institucional' ? num(params.p_inst_max ?? 100) : 100
  return num(params[weight]) * scale
}

export function pillarsExplanation(average, params) {
  const keys = Object.keys(PILLARS)
  const total = keys.reduce((acc, key) => acc + num(average[key]), 0) + num(average.bonus_nuevo)
  const main = keys.reduce((best, key) => (num(average[key]) > num(average[best]) ? key : best), keys[0])

  const intro =
    'El puntaje de cada socio se arma con **tres pilares**: la **asistencia** a los partidos (que además reconoce a quienes viajan desde lejos), la **participación institucional** en la vida del club fuera de la cancha, y la **antigüedad y edad**, que valora los años de pertenencia. Las reglas del club fijan **cuánto pesa** cada uno, es decir, cuántos puntos puede aportar como máximo.'

  const mainText = PILLARS[main].withArticle
  const share = `${mainText.charAt(0).toUpperCase()}${mainText.slice(1)} es la que más empuja: explica más o menos **${pct(num(average[main]), total)} de cada 100 puntos** del socio promedio.`

  // Cuánto de lo posible consigue el socio promedio en los pilares que dependen de su participación.
  const usage = ['asistencia', 'institucional']
    .map((key) => ({ key, max: pillarMax(key, params) }))
    .filter(({ max }) => max > 0)
    .map(({ key, max }) => ({ key, share: pct(num(average[key]), max) }))
  const lowest = usage.reduce((a, b) => (b.share < a.share ? b : a), usage[0])
  const room = lowest
    ? `Donde más **margen para crecer** queda es en ${PILLARS[lowest.key].withArticle}: el socio promedio consigue alrededor de **${lowest.share} %** de lo que podría sumar ahí. Es el pilar en el que más se nota cualquier esfuerzo extra y donde las **acciones del club** (convocatorias, actividades, comunicación) pueden rendir más. La antigüedad y edad, en cambio, no depende de lo que haga el socio: refleja su historia con el club.`
    : ''

  const bonus =
    num(average.bonus_nuevo) > 0
      ? 'La **bonificación de bienvenida** suma muy poco en promedio, y está bien que así sea: la reciben solo los **socios nuevos**, se va apagando con el tiempo y su función es que nadie arranque desde cero.'
      : 'En este ranking ningún socio recibe la **bonificación de bienvenida**, que es solo para quienes se asociaron hace poco.'

  return [intro, `${share} ${room}`.trim(), bonus]
}

// 4. Equidad
const EQUITY_CONTEXT = {
  seniority: 'En parte es lógico: las reglas premian a propósito a quienes **llevan más años** en el club.',
  distance:
    'Hay que tener en cuenta que las reglas le dan un plus a quien **viaja desde lejos**, pero vivir lejos también hace más difícil ir seguido, así que los dos efectos se compensan en parte.',
  age: 'En parte es esperable, porque las reglas también tienen en cuenta la **edad**.',
}

export function equityIntro() {
  return 'En esta parte se agrupa a los socios por **antigüedad**, **distancia al estadio** y **edad**, para ver si a algún grupo le va sistemáticamente mejor o peor. La idea es detectar si las reglas **favorecen a algún perfil** más de lo que el club quiere. Un dato para leer las tablas: en la **posición promedio**, cuanto más chico el número, mejor ubicado está el grupo.'
}

export function equityExplanation(key, equity) {
  if (!equity.available) {
    return 'Este cuadro no se muestra porque algún grupo tendría **tan pocos socios** que se los podría reconocer. Es una medida para **cuidar la privacidad**, no una falla.'
  }
  const segments = equity.segments
  if (segments.length < 2) return 'Hay un solo grupo con datos suficientes, así que no hay con qué compararlo.'

  const best = segments.reduce((a, b) => (num(b.average_score) > num(a.average_score) ? b : a))
  const worst = segments.reduce((a, b) => (num(b.average_score) < num(a.average_score) ? b : a))
  const gap = Math.round(num(best.average_score) - num(worst.average_score))

  if (gap < 5) {
    return 'Acá **no hay diferencias que preocupen**: a todos los grupos les va más o menos parecido.'
  }
  const reading =
    gap < 15
      ? `Hay una **diferencia moderada**: a los socios de «${best.band_label}» les va algo mejor que a los de «${worst.band_label}», con unos ${gap} puntos más en promedio.`
      : `La **diferencia es marcada**: los socios de «${best.band_label}» sacan en promedio unos ${gap} puntos más que los de «${worst.band_label}».`
  const advice =
    gap >= 15 ? ' Conviene evaluar si esa brecha es la que el club busca o si vale la pena **ajustar las reglas**.' : ''
  return `${reading} ${EQUITY_CONTEXT[key] ?? ''}${advice}`.trim()
}
