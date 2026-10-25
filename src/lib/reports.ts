import jsPDF from 'jspdf'
import * as XLSX from 'xlsx-js-style'
import type { AppSettings, Expense, ExpenseCategory, Invoice } from '../types'

export type ReportType = 'overview' | 'invoices' | 'expenses' | 'full'

export interface ReportRange {
  from: string
  to: string
}

export interface ReportData {
  invoices: Invoice[]
  expenses: Expense[]
  invoiceTotal: number
  collected: number
  outstanding: number
  expenseTotal: number
  profit: number
}

export function filterReportData(invoices: Invoice[], expenses: Expense[], range: ReportRange): ReportData {
  const inRange = (date: string) => (!range.from || date >= range.from) && (!range.to || date <= range.to)
  const filteredInvoices = invoices.filter(i => i.status !== 'cancelled' && inRange(i.invoiceDate))
  const filteredExpenses = expenses.filter(e => inRange(e.date))
  const invoiceTotal = filteredInvoices.reduce((s, i) => s + i.total, 0)
  const collected = filteredInvoices.reduce((s, i) => s + Math.max(0, i.total - i.balanceDue), 0)
  const outstanding = filteredInvoices.reduce((s, i) => s + Math.max(0, i.balanceDue), 0)
  const expenseTotal = filteredExpenses.reduce((s, e) => s + e.amount, 0)
  return { invoices: filteredInvoices, expenses: filteredExpenses, invoiceTotal, collected, outstanding, expenseTotal, profit: collected - expenseTotal }
}

function fmtDate(date: string) {
  if (!date) return '—'
  const d = new Date(`${date}T00:00:00`)
  return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function safeFileName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function rangeLabel(range: ReportRange) {
  if (range.from && range.to) return `${fmtDate(range.from)} to ${fmtDate(range.to)}`
  if (range.from) return `From ${fmtDate(range.from)}`
  if (range.to) return `Up to ${fmtDate(range.to)}`
  return 'All dates'
}

function invoiceRows(data: ReportData) {
  return data.invoices.map(i => ({
    'Invoice #': i.number,
    Date: i.invoiceDate,
    Client: i.clientName,
    'Stay / Property': i.stayOption || '',
    Status: i.status,
    Subtotal: i.subTotal,
    Tax: i.taxAmount,
    Total: i.total,
    Collected: i.total - i.balanceDue,
    Balance: i.balanceDue,
    'Check-in': i.checkIn || '',
    'Check-out': i.checkOut || '',
  }))
}

function expenseRows(data: ReportData, categories: ExpenseCategory[]) {
  return data.expenses.map(e => ({
    Date: e.date,
    Description: e.description,
    Category: categories.find(c => c.id === e.categoryId)?.name || e.categoryId,
    Subcategory: e.subcategory || '',
    'Payment Method': e.paymentMethod,
    Amount: e.amount,
    Reference: e.reference || '',
    Notes: e.notes || '',
  }))
}

const EXCEL_GREEN = '2D6A4F'
const EXCEL_LIGHT = 'EAF3EE'
const EXCEL_LIGHTER = 'F6FAF7'
const EXCEL_TEXT = '23302B'
const EXCEL_MUTED = '64748B'
const EXCEL_BORDER = 'D9E3DD'

function styleExcelSheet(ws: XLSX.WorkSheet, _title: string, _subtitle: string, headerRow: number, widths: number[]) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')
  const lastCol = range.e.c
  const lastRow = range.e.r
  ws['!cols'] = widths.map(w => ({ wch: w }))
  ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow, c: 0 }, e: { r: lastRow, c: lastCol } }) }
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
  ]
  const titleCell = ws['A1']
  const subtitleCell = ws['A2']
  if (titleCell) titleCell.s = { font: { name: 'Aptos Display', sz: 18, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: EXCEL_GREEN } }, alignment: { vertical: 'center' } }
  if (subtitleCell) subtitleCell.s = { font: { name: 'Aptos', sz: 10, color: { rgb: EXCEL_MUTED } }, fill: { fgColor: { rgb: EXCEL_LIGHT } }, alignment: { vertical: 'center' } }
  if (ws['!rows']) { ws['!rows'][0] = { hpt: 28 }; ws['!rows'][1] = { hpt: 20 } }
  for (let c = 0; c <= lastCol; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })]
    if (cell) cell.s = { font: { name: 'Aptos', sz: 10, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: EXCEL_GREEN } }, alignment: { vertical: 'center', wrapText: true }, border: { bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } } } }
  }
  for (let r = headerRow + 1; r <= lastRow; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (!cell) continue
      cell.s = { font: { name: 'Aptos', sz: 10, color: { rgb: EXCEL_TEXT } }, fill: { fgColor: { rgb: r % 2 ? 'FFFFFF' : EXCEL_LIGHTER } }, alignment: { vertical: 'center', wrapText: true }, border: { bottom: { style: 'hair', color: { rgb: EXCEL_BORDER } } } }
    }
  }
}

function styleSummarySheet(ws: XLSX.WorkSheet, _title: string, _subtitle: string) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')
  const lastCol = range.e.c
  ws['!cols'] = [{ wch: 28 }, { wch: 22 }]
  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }]
  ws['!rows'] = [{ hpt: 30 }, { hpt: 20 }]
  ws['A1'].s = { font: { name: 'Aptos Display', sz: 18, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: EXCEL_GREEN } }, alignment: { vertical: 'center' } }
  ws['A2'].s = { font: { name: 'Aptos', sz: 10, color: { rgb: EXCEL_MUTED } }, fill: { fgColor: { rgb: EXCEL_LIGHT } }, alignment: { vertical: 'center' } }
  for (let r = 4; r <= range.e.r; r++) {
    for (let c = 0; c <= lastCol; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })]
      if (!cell) continue
      cell.s = { font: { name: 'Aptos', sz: 10, color: { rgb: EXCEL_TEXT }, bold: r === 4 }, fill: { fgColor: { rgb: r === 4 ? EXCEL_GREEN : (r % 2 ? 'FFFFFF' : EXCEL_LIGHTER) } }, alignment: { vertical: 'center' }, border: { bottom: { style: 'thin', color: { rgb: EXCEL_BORDER } } } }
      if (r === 4) cell.s.font.color = { rgb: 'FFFFFF' }
      if (c === 1 && r >= 5 && r <= 9) cell.z = '#,##0.00'
    }
  }
}

function applyMoneyFormat(ws: XLSX.WorkSheet, columns: number[], startRow: number) {
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1')
  for (let r = startRow; r <= range.e.r; r++) for (const c of columns) {
    const cell = ws[XLSX.utils.encode_cell({ r, c })]
    if (cell && typeof cell.v === 'number') cell.z = '#,##0.00'
  }
}

function dataSheet<T extends Record<string, unknown>>(rows: T[], fallbackColumns: string[]) {
  const columns = rows.length ? Object.keys(rows[0]) : fallbackColumns
  const values = rows.map(row => columns.map(column => row[column]))
  return XLSX.utils.aoa_to_sheet([[], [], columns, ...values])
}

function addExcelHeader(ws: XLSX.WorkSheet, title: string, subtitle: string, columns: string[]) {
  XLSX.utils.sheet_add_aoa(ws, [[title], [subtitle], columns], { origin: 'A1' })
}

export function exportReportExcel(
  settings: AppSettings,
  data: ReportData,
  categories: ExpenseCategory[],
  range: ReportRange,
  type: ReportType,
) {
  const wb = XLSX.utils.book_new()
  const title = settings.business.name || 'FarmStay'
  const period = rangeLabel(range)

  const summaryRows = [
    ['FarmStay Financial Report'],
    [title],
    ['Period', period],
    [],
    ['Metric', 'Amount'],
    ['Invoice value', data.invoiceTotal],
    ['Income collected', data.collected],
    ['Outstanding', data.outstanding],
    ['Expenses', data.expenseTotal],
    ['Profit / Cash surplus', data.profit],
    [],
    ['Invoice count', data.invoices.length],
    ['Expense count', data.expenses.length],
  ]
  const summary = XLSX.utils.aoa_to_sheet(summaryRows)
  styleSummarySheet(summary, 'FarmStay Financial Report', `${title} · ${period}`)
  summary['A3'].v = 'Period'; summary['B3'].v = period
  XLSX.utils.book_append_sheet(wb, summary, 'Summary')

  if (type === 'overview' || type === 'invoices' || type === 'full') {
    const rows = invoiceRows(data)
    const ws = dataSheet(rows, ['Invoice #'])
    addExcelHeader(ws, 'Invoices & Income', `${title} · ${period}`, Object.keys(rows[0] || { 'Invoice #': '' }))
    styleExcelSheet(ws, 'Invoices & Income', period, 2, [15, 13, 24, 22, 13, 13, 14, 14, 14, 14, 14, 14])
    applyMoneyFormat(ws, [5, 6, 7, 8, 9], 3)
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices')
  }

  if (type === 'overview' || type === 'expenses' || type === 'full') {
    const rows = expenseRows(data, categories)
    const ws = dataSheet(rows, ['Date'])
    addExcelHeader(ws, 'Expenses', `${title} · ${period}`, Object.keys(rows[0] || { Date: '' }))
    styleExcelSheet(ws, 'Expenses', period, 2, [14, 30, 20, 20, 16, 15, 18, 35])
    applyMoneyFormat(ws, [5], 3)
    XLSX.utils.book_append_sheet(wb, ws, 'Expenses')
  }

  if (type === 'full') {
    const combined = [
      ...data.invoices.map(i => ({ Date: i.invoiceDate, Type: 'Income', Reference: i.number, Description: i.clientName, Amount: i.total - i.balanceDue })),
      ...data.expenses.map(e => ({ Date: e.date, Type: 'Expense', Reference: e.reference || '', Description: e.description, Amount: -e.amount })),
    ].sort((a, b) => a.Date.localeCompare(b.Date))
    const ws = dataSheet(combined, ['Date', 'Type', 'Reference', 'Description', 'Amount'])
    addExcelHeader(ws, 'Combined Income + Expense Ledger', `${title} · ${period}`, ['Date', 'Type', 'Reference', 'Description', 'Amount'])
    styleExcelSheet(ws, 'Combined Ledger', period, 2, [14, 14, 18, 36, 16])
    applyMoneyFormat(ws, [4], 3)
    XLSX.utils.book_append_sheet(wb, ws, 'Combined Ledger')
  }

  const stamp = range.from && range.to ? `${range.from}_to_${range.to}` : 'all-dates'
  XLSX.writeFile(wb, `${safeFileName(title)}-report-${stamp}.xlsx`)
}

function pdfTable(doc: jsPDF, headers: string[], rows: string[][], y: number, widths: number[]) {
  const left = 36
  const rowH = 18
  const pageW = doc.internal.pageSize.getWidth()
  const usable = pageW - 72
  const scale = usable / widths.reduce((a, b) => a + b, 0)
  const ws = widths.map(w => w * scale)
  let cy = y
  const drawRow = (cells: string[], fill: boolean) => {
    if (cy + rowH > doc.internal.pageSize.getHeight() - 42) {
      doc.addPage(); cy = 42
    }
    let x = left
    cells.forEach((cell, idx) => {
      const w = ws[idx]
      if (fill) doc.setFillColor(45, 106, 79); else doc.setFillColor(255, 255, 255)
      doc.setDrawColor(225, 231, 235)
      doc.rect(x, cy, w, rowH, fill ? 'FD' : 'S')
      doc.setTextColor(fill ? 255 : 30, fill ? 255 : 30, fill ? 255 : 30)
      doc.setFontSize(7.5)
      const text = doc.splitTextToSize(String(cell), Math.max(20, w - 8))[0] || ''
      doc.text(text, x + 4, cy + 11)
      x += w
    })
    cy += rowH
  }
  drawRow(headers, true)
  rows.forEach(r => drawRow(r, false))
  return cy
}

function addPdfHeader(doc: jsPDF, settings: AppSettings, title: string, range: ReportRange) {
  doc.setTextColor(27, 67, 50)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(settings.business.name || 'FarmStay', 36, 34)
  doc.setTextColor(35, 45, 42)
  doc.setFontSize(13)
  doc.text(title, 36, 53)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100, 116, 139)
  doc.text(rangeLabel(range), 36, 67)
  return 82
}

export function exportReportPdf(
  settings: AppSettings,
  data: ReportData,
  categories: ExpenseCategory[],
  range: ReportRange,
  type: ReportType,
) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  let y = addPdfHeader(doc, settings, type === 'full' ? 'Full Income + Expense Report' : type === 'expenses' ? 'Expense Report' : type === 'invoices' ? 'Invoice & Income Report' : 'Financial Overview', range)

  doc.setFontSize(9)
  doc.setTextColor(35, 45, 42)
  const cards = [
    ['Invoice value', data.invoiceTotal],
    ['Collected', data.collected],
    ['Expenses', data.expenseTotal],
    ['Profit / surplus', data.profit],
  ]
  cards.forEach((c, idx) => {
    const x = 36 + idx * 130
    doc.setFillColor(247, 250, 248); doc.setDrawColor(225, 231, 235); doc.roundedRect(x, y, 120, 46, 7, 7, 'FD')
    doc.setFontSize(7.5); doc.setTextColor(100, 116, 139); doc.text(c[0] as string, x + 8, y + 15)
    doc.setFontSize(10); doc.setTextColor(27, 67, 50); doc.setFont('helvetica', 'bold'); doc.text(`${settings.currency || 'INR'} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(c[1] as number)}`, x + 8, y + 34)
    doc.setFont('helvetica', 'normal')
  })
  y += 68

  if (type === 'overview' || type === 'invoices' || type === 'full') {
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 67, 50); doc.text('Invoices & Income', 36, y); y += 10
    const money = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
    y = pdfTable(doc, ['Invoice', 'Date', 'Client', 'Total', 'Collected', 'Balance'], data.invoices.map(i => [i.number, fmtDate(i.invoiceDate), i.clientName, money(i.total), money(i.total - i.balanceDue), money(i.balanceDue)]), y, [18, 20, 28, 12, 14, 14]) + 20
  }
  if (type === 'overview' || type === 'expenses' || type === 'full') {
    if (y > doc.internal.pageSize.getHeight() - 150) { doc.addPage(); y = 42 }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 67, 50); doc.text('Expenses', 36, y); y += 10
    const money = (n: number) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)
    y = pdfTable(doc, ['Date', 'Description', 'Category', 'Method', 'Amount'], data.expenses.map(e => [fmtDate(e.date), e.description, categories.find(c => c.id === e.categoryId)?.name || 'Other', e.paymentMethod.toUpperCase(), money(e.amount)]), y, [20, 34, 22, 14, 16]) + 20
  }
  if (type === 'full') {
    if (y > doc.internal.pageSize.getHeight() - 150) { doc.addPage(); y = 42 }
    doc.setFontSize(11); doc.setFont('helvetica', 'bold'); doc.setTextColor(27, 67, 50); doc.text('Profit', 36, y); y += 18
    doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(35, 45, 42)
    doc.text(`Income collected: ${data.collected.toFixed(2)}`, 36, y); y += 16
    doc.text(`Expenses: ${data.expenseTotal.toFixed(2)}`, 36, y); y += 16
    doc.setFont('helvetica', 'bold'); doc.text(`Profit / cash surplus: ${data.profit.toFixed(2)}`, 36, y)
  }

  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 130, 135)
    doc.text(`Generated ${new Date().toLocaleString('en-IN')} · Page ${p} of ${pages}`, 36, doc.internal.pageSize.getHeight() - 20)
  }
  const stamp = range.from && range.to ? `${range.from}_to_${range.to}` : 'all-dates'
  doc.save(`${safeFileName(settings.business.name || 'FarmStay')}-report-${stamp}.pdf`)
}

export function exportAllInvoicesPdf(settings: AppSettings, invoices: Invoice[]) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const money = (n: number) => `${settings.currency || 'INR'} ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n)}`
  let y = addPdfHeader(doc, settings, 'All Invoices', { from: '', to: '' })
  y = pdfTable(doc, ['Invoice', 'Date', 'Client', 'Status', 'Total', 'Balance'], invoices.map(i => [i.number, fmtDate(i.invoiceDate), i.clientName, i.status, money(i.total), money(i.balanceDue)]), y, [18, 20, 30, 14, 12, 14])
  const pages = doc.getNumberOfPages()
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(7); doc.setTextColor(120, 130, 135); doc.text(`All invoices · Page ${p} of ${pages}`, 36, doc.internal.pageSize.getHeight() - 20) }
  doc.save(`${safeFileName(settings.business.name || 'FarmStay')}-all-invoices.pdf`)
}

export function exportAllInvoicesExcel(settings: AppSettings, invoices: Invoice[]) {
  const wb = XLSX.utils.book_new()
  const title = settings.business.name || 'FarmStay'
  const rows = invoices.map(i => ({
    'Invoice #': i.number, Date: i.invoiceDate, Client: i.clientName, Status: i.status,
    Subtotal: i.subTotal, Tax: i.taxAmount, Total: i.total, Collected: i.total - i.balanceDue,
    Balance: i.balanceDue, 'Check-in': i.checkIn || '', 'Check-out': i.checkOut || '',
  }))
  const ws = dataSheet(rows, ['Invoice #'])
  addExcelHeader(ws, 'All Invoices', `${title} · ${invoices.length} invoices`, Object.keys(rows[0] || { 'Invoice #': '' }))
  styleExcelSheet(ws, 'All Invoices', `${invoices.length} invoices`, 2, [15, 13, 24, 14, 15, 13, 15, 15, 15, 14, 14])
  applyMoneyFormat(ws, [4, 5, 6, 7, 8], 3)
  XLSX.utils.book_append_sheet(wb, ws, 'All Invoices')
  XLSX.writeFile(wb, `${safeFileName(title)}-all-invoices.xlsx`)
}
