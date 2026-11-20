// HU-42: arma el PDF del reporte ejecutivo en el navegador y lo descarga.
//
// Se captura la hoja (html2canvas) y se reparte en páginas A4 (jsPDF). Los cortes de página se hacen
// al principio de un bloque (título, párrafo, tabla, fila...) para no partir un renglón por la mitad.
// Las librerías se cargan recién al descargar, así no pesan en el resto de la app.

const PAGE = { width: 210, height: 297 } // A4 en mm
const MARGIN = { x: 16, top: 14, bottom: 16 }
const CONTENT_WIDTH = PAGE.width - 2 * MARGIN.x // 178 mm: el ancho de la copia que se captura
const CONTENT_HEIGHT = PAGE.height - MARGIN.top - MARGIN.bottom

// Elementos antes de los cuales se puede cortar la página. Dentro de un bloque marcado con
// `data-keep` (un recuadro, la fila de indicadores...) no se corta, salvo que no entre en una hoja.
const BREAKABLE = 'header, section, h2, h3, p, figure, table, tr, footer, [data-keep]'

// Posiciones (en px CSS, desde el borde superior de `root`) donde se puede cortar. Si un elemento
// viene justo después de un título, el corte se hace antes del título: así no queda solo al pie.
function breakpoints(root) {
  const origin = root.getBoundingClientRect().top
  const points = new Set()
  for (const el of root.querySelectorAll(BREAKABLE)) {
    let target = el
    const previous = el.previousElementSibling
    if (previous && /^H[23]$/.test(previous.tagName)) target = previous
    if (el.tagName === 'TR' && !el.previousElementSibling) continue // no separar el encabezado de la tabla
    const keep = el.parentElement?.closest('[data-keep]')
    if (keep && root.contains(keep)) continue
    // Unos px antes del borde, para que el corte caiga en el espacio en blanco y no sobre el bloque.
    points.add(Math.round(target.getBoundingClientRect().top - origin) - 4)
  }
  return [...points].filter((y) => y > 0).sort((a, b) => a - b)
}

// Reparte una altura total en páginas de `pageHeight`, cortando en el último punto permitido.
function slices(total, pageHeight, points) {
  const result = []
  let start = 0
  while (start < total) {
    const limit = start + pageHeight
    if (limit >= total) {
      result.push([start, total])
      break
    }
    const candidates = points.filter((y) => y > start && y <= limit)
    // Si un bloque es más alto que una página, no queda otra que cortarlo.
    const end = candidates.length && candidates.at(-1) > start + pageHeight * 0.3 ? candidates.at(-1) : limit
    result.push([start, end])
    start = end
  }
  return result
}

export async function downloadReportPdf(root, filename) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
  await document.fonts?.ready

  const scale = 2
  const canvas = await html2canvas(root, { scale, backgroundColor: '#ffffff', logging: false })
  const pxPerMm = canvas.width / CONTENT_WIDTH
  const pageHeightPx = CONTENT_HEIGHT * pxPerMm
  const points = breakpoints(root).map((y) => y * scale)

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true })
  const parts = slices(canvas.height, pageHeightPx, points)

  parts.forEach(([start, end], index) => {
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = Math.ceil(end - start)
    const ctx = slice.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, start, canvas.width, end - start, 0, 0, canvas.width, end - start)

    if (index > 0) pdf.addPage()
    pdf.addImage(
      slice.toDataURL('image/jpeg', 0.92),
      'JPEG',
      MARGIN.x,
      MARGIN.top,
      CONTENT_WIDTH,
      slice.height / pxPerMm,
    )
    pdf.setFontSize(8)
    pdf.setTextColor(120)
    pdf.text(`Página ${index + 1} de ${parts.length}`, PAGE.width / 2, PAGE.height - 8, { align: 'center' })
  })

  pdf.save(filename)
  return pdf
}
