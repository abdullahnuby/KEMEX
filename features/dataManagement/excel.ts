const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

export type SheetData = {
  name: string
  rows: Record<string, unknown>[]
  headers: string[]
}

type ZipEntry = { name: string; compression: number; compressed: Uint8Array; uncompressedSize: number }
type SheetDataWithPath = SheetData & { __sheetPath: string }

function u16(view: DataView, offset: number) { return view.getUint16(offset, true) }
function u32(view: DataView, offset: number) { return view.getUint32(offset, true) }
function put16(out: Uint8Array, offset: number, value: number) { new DataView(out.buffer).setUint16(offset, value, true) }
function put32(out: Uint8Array, offset: number, value: number) { new DataView(out.buffer).setUint32(offset, value >>> 0, true) }

function concatBytes(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const part of parts) { out.set(part, offset); offset += part.byteLength }
  return out
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipStore(entries: Array<{ name: string; data: Uint8Array }>) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  for (const entry of entries) {
    const name = textEncoder.encode(entry.name)
    const data = entry.data
    const checksum = crc32(data)

    const local = new Uint8Array(30 + name.length + data.length)
    put32(local, 0, 0x04034b50)
    put16(local, 4, 20)
    put16(local, 6, 0x0800)
    put16(local, 8, 0)
    put16(local, 10, 0)
    put16(local, 12, 0)
    put32(local, 14, checksum)
    put32(local, 18, data.length)
    put32(local, 22, data.length)
    put16(local, 26, name.length)
    put16(local, 28, 0)
    local.set(name, 30)
    local.set(data, 30 + name.length)
    localParts.push(local)

    const central = new Uint8Array(46 + name.length)
    put32(central, 0, 0x02014b50)
    put16(central, 4, 20)
    put16(central, 6, 20)
    put16(central, 8, 0x0800)
    put16(central, 10, 0)
    put16(central, 12, 0)
    put16(central, 14, 0)
    put32(central, 16, checksum)
    put32(central, 20, data.length)
    put32(central, 24, data.length)
    put16(central, 28, name.length)
    put16(central, 30, 0)
    put16(central, 32, 0)
    put16(central, 34, 0)
    put16(central, 36, 0)
    put32(central, 38, 0)
    put32(central, 42, offset)
    central.set(name, 46)
    centralParts.push(central)

    offset += local.length
  }

  const local = concatBytes(localParts)
  const central = concatBytes(centralParts)
  const end = new Uint8Array(22)
  put32(end, 0, 0x06054b50)
  put16(end, 4, 0)
  put16(end, 6, 0)
  put16(end, 8, entries.length)
  put16(end, 10, entries.length)
  put32(end, 12, central.length)
  put32(end, 16, local.length)
  put16(end, 20, 0)

  return concatBytes([local, central, end])
}

async function inflateRaw(bytes: Uint8Array) {
  const streamCtor = (globalThis as typeof globalThis & { DecompressionStream?: new (format: string) => TransformStream }).DecompressionStream
  if (!streamCtor) throw new Error('المتصفح الحالي لا يدعم قراءة ملفات Excel المضغوطة.')
  const stream = new Blob([bytes as unknown as BlobPart]).stream().pipeThrough(new streamCtor('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  const view = new DataView(buffer)
  const start = Math.max(0, bytes.length - 65557)
  let eocd = -1
  for (let i = bytes.length - 22; i >= start; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('ملف Excel غير صالح أو غير مدعوم.')

  const count = u16(view, eocd + 10)
  const directoryOffset = u32(view, eocd + 16)
  let cursor = directoryOffset
  const entries: ZipEntry[] = []

  for (let index = 0; index < count; index++) {
    if (u32(view, cursor) !== 0x02014b50) throw new Error('تعذر قراءة فهرس ملف Excel.')
    const compression = u16(view, cursor + 10)
    const compressedSize = u32(view, cursor + 20)
    const uncompressedSize = u32(view, cursor + 24)
    const nameLength = u16(view, cursor + 28)
    const extraLength = u16(view, cursor + 30)
    const commentLength = u16(view, cursor + 32)
    const localHeaderOffset = u32(view, cursor + 42)
    const name = textDecoder.decode(bytes.slice(cursor + 46, cursor + 46 + nameLength))
    const localNameLength = u16(view, localHeaderOffset + 26)
    const localExtraLength = u16(view, localHeaderOffset + 28)
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize)
    entries.push({ name, compression, compressed, uncompressedSize })
    cursor += 46 + nameLength + extraLength + commentLength
  }
  return entries
}

async function unzipEntry(entries: ZipEntry[], name: string) {
  const entry = entries.find(item => item.name === name)
  if (!entry) return null
  if (entry.compression === 0) return entry.compressed
  if (entry.compression === 8) return inflateRaw(entry.compressed)
  throw new Error(`ضغط Excel غير مدعوم: ${entry.compression}`)
}

function xmlEscape(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function columnLetters(index: number) {
  let n = index + 1
  let out = ''
  while (n > 0) {
    const remainder = (n - 1) % 26
    out = String.fromCharCode(65 + remainder) + out
    n = Math.floor((n - 1) / 26)
  }
  return out
}

function valueForExcel(value: unknown) {
  if (value === null || value === undefined || value === '') return { type: 'inlineStr', content: '<is><t></t></is>' }
  if (typeof value === 'number' && Number.isFinite(value)) return { type: undefined, content: `<v>${value}</v>` }
  if (typeof value === 'boolean') return { type: 'b', content: `<v>${value ? 1 : 0}</v>` }
  const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value)
  return { type: 'inlineStr', content: `<is><t xml:space="preserve">${xmlEscape(stringValue)}</t></is>` }
}

function sheetXml(sheet: SheetData) {
  const headers = sheet.headers
  const rows: string[] = []
  const headerCells = headers.map((header, index) => {
    const value = valueForExcel(header)
    return `<c r="${columnLetters(index)}1" t="${value.type}">${value.content}</c>`
  }).join('')
  rows.push(`<row r="1">${headerCells}</row>`)

  sheet.rows.forEach((row, rowIndex) => {
    const cells = headers.map((header, colIndex) => {
      const value = valueForExcel(row[header])
      const type = value.type ? ` t="${value.type}"` : ''
      return `<c r="${columnLetters(colIndex)}${rowIndex + 2}"${type}>${value.content}</c>`
    }).join('')
    rows.push(`<row r="${rowIndex + 2}">${cells}</row>`)
  })

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.join('')}</sheetData></worksheet>`
}

function workbookXml(sheets: SheetData[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((sheet, index) => `<sheet name="${xmlEscape(sheet.name.slice(0, 31))}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets></workbook>`
}

function workbookRelsXml(sheets: SheetData[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, index) => `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`).join('')}</Relationships>`
}

function rootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
}

function contentTypesXml(sheets: SheetData[]) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, index) => `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
}

function csvToRows(text: string): SheetData {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]
    if (quoted) {
      if (char === '"' && next === '"') { field += '"'; i++; continue }
      if (char === '"') { quoted = false; continue }
      field += char
      continue
    }
    if (char === '"') { quoted = true; continue }
    if (char === ',') { row.push(field); field = ''; continue }
    if (char === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue }
    if (char !== '\r') field += char
  }
  row.push(field)
  if (row.some(value => value !== '') || rows.length === 0) rows.push(row)
  const headers = (rows.shift() ?? []).map((header, index) => header.trim() || `Column_${index + 1}`)
  return { name: 'Sheet1', headers, rows: rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))) }
}

async function readWorkbookXml(entries: ZipEntry[]) {
  const workbook = await unzipEntry(entries, 'xl/workbook.xml')
  if (!workbook) throw new Error('ملف Excel لا يحتوي على ورقة عمل قابلة للقراءة.')
  const rels = await unzipEntry(entries, 'xl/_rels/workbook.xml.rels')
  if (!rels) throw new Error('ملف Excel لا يحتوي على علاقات الأوراق المطلوبة.')
  const shared = await unzipEntry(entries, 'xl/sharedStrings.xml')

  const workbookDoc = new DOMParser().parseFromString(textDecoder.decode(workbook), 'application/xml')
  const relsDoc = new DOMParser().parseFromString(textDecoder.decode(rels), 'application/xml')
  const sharedDoc = shared ? new DOMParser().parseFromString(textDecoder.decode(shared), 'application/xml') : null
  const relTargets = new Map<string, string>()
  relsDoc.querySelectorAll('Relationship').forEach(node => {
    relTargets.set(node.getAttribute('Id') ?? '', node.getAttribute('Target') ?? '')
  })
  const sharedStrings = sharedDoc
    ? Array.from(sharedDoc.querySelectorAll('si')).map(si => Array.from(si.querySelectorAll('t')).map(t => t.textContent ?? '').join(''))
    : []

  const sheets: SheetDataWithPath[] = []
  workbookDoc.querySelectorAll('sheet').forEach(sheetNode => {
    const name = sheetNode.getAttribute('name') ?? 'Sheet'
    const relationship = sheetNode.getAttribute('r:id') ?? sheetNode.getAttribute('id') ?? ''
    const target = relTargets.get(relationship) ?? ''
    const sheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target}`.replace('xl/xl/', 'xl/')
    sheets.push({ name, headers: [], rows: [], __sheetPath: sheetPath })
  })

  for (const sheet of sheets) {
    const worksheet = await unzipEntry(entries, sheet.__sheetPath)
    if (!worksheet) continue
    const doc = new DOMParser().parseFromString(textDecoder.decode(worksheet), 'application/xml')
    const parsedRows: Array<{ index: number; values: Record<number, unknown> }> = []
    let maxCol = -1

    doc.querySelectorAll('sheetData > row').forEach((rowNode, rowIndex) => {
      const values: Record<number, unknown> = {}
      rowNode.querySelectorAll(':scope > c').forEach((cellNode, fallbackIndex) => {
        const ref = cellNode.getAttribute('r') ?? ''
        const letters = ref.match(/^[A-Z]+/i)?.[0] ?? ''
        const colIndex = letters
          ? letters.toUpperCase().split('').reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0) - 1
          : fallbackIndex
        const type = cellNode.getAttribute('t') ?? ''
        const valueNode = cellNode.querySelector('v')
        let value: unknown = valueNode?.textContent ?? ''
        if (type === 'inlineStr') value = Array.from(cellNode.querySelectorAll('is t')).map(node => node.textContent ?? '').join('')
        else if (type === 's') value = sharedStrings[Number(value)] ?? ''
        else if (type === 'b') value = value === '1'
        else if (type !== 'str' && value !== '') {
          const numeric = Number(value)
          if (Number.isFinite(numeric)) value = numeric
        }
        values[colIndex] = value
        maxCol = Math.max(maxCol, colIndex)
      })
      parsedRows.push({ index: Number(rowNode.getAttribute('r') ?? rowIndex + 1), values })
    })

    const first = parsedRows[0]?.values ?? {}
    const headers = Array.from({ length: maxCol + 1 }, (_, index) => String(first[index] ?? `Column_${index + 1}`)).map((header, index) => header.trim() || `Column_${index + 1}`)
    const dataStart = parsedRows.length > 0 ? 1 : 0
    sheet.headers = headers
    sheet.rows = parsedRows.slice(dataStart).map(item => Object.fromEntries(headers.map((header, index) => [header, item.values[index] ?? ''])))
  }

  return sheets.map(({ __sheetPath: _sheetPath, ...sheet }) => sheet)
}

export async function readExcelFile(file: File): Promise<SheetData[]> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith('.csv')) return [csvToRows(await file.text())]
  if (!lower.endsWith('.xlsx')) throw new Error('ارفع ملف Excel بصيغة .xlsx أو ملف CSV.')
  return readWorkbookXml(await readZipEntries(await file.arrayBuffer()))
}

export function workbookBlob(sheets: SheetData[]) {
  const safeSheets = sheets.length ? sheets : [{ name: 'Sheet1', headers: ['لا توجد بيانات'], rows: [] }]
  const entries = [
    { name: '[Content_Types].xml', data: textEncoder.encode(contentTypesXml(safeSheets)) },
    { name: '_rels/.rels', data: textEncoder.encode(rootRelsXml()) },
    { name: 'xl/workbook.xml', data: textEncoder.encode(workbookXml(safeSheets)) },
    { name: 'xl/_rels/workbook.xml.rels', data: textEncoder.encode(workbookRelsXml(safeSheets)) },
    ...safeSheets.map((sheet, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: textEncoder.encode(sheetXml(sheet)) })),
  ]
  return new Blob([zipStore(entries) as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url) }, 1500)
}
