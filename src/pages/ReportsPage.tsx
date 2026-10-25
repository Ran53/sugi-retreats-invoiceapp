import { useMemo, useState } from 'react'
import type { AppSettings, Invoice } from '../types'
import { formatCurrency, getExpenseCategories, getExpenses } from '../lib/storage'
import { exportAllInvoicesExcel, exportAllInvoicesPdf, exportReportExcel, exportReportPdf, filterReportData, type ReportType } from '../lib/reports'

interface Props {
  settings: AppSettings
  invoices: Invoice[]
  onNavigate: (page: any, id?: string) => void
}

type Preset = 'custom' | 'this-month' | 'last-month' | 'this-year' | 'all'

function iso(d: Date) { return d.toISOString().slice(0, 10) }
function monthBounds(offset = 0) {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset)
  const from = iso(d); d.setMonth(d.getMonth() + 1); d.setDate(0)
  return { from, to: iso(d) }
}
function yearBounds() {
  const y = new Date().getFullYear()
  return { from: `${y}-01-01`, to: `${y}-12-31` }
}

export default function ReportsPage({ settings, invoices, onNavigate }: Props) {
  const [tab, setTab] = useState<ReportType>('overview')
  const [preset, setPreset] = useState<Preset>('this-month')
  const [from, setFrom] = useState(monthBounds().from)
  const [to, setTo] = useState(monthBounds().to)
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null)
  const [expandedExpense, setExpandedExpense] = useState<string | null>(null)
  const expenses = useMemo(() => getExpenses(), [])
  const categories = useMemo(() => getExpenseCategories(), [])
  const data = useMemo(() => filterReportData(invoices, expenses, { from, to }), [invoices, expenses, from, to])

  const applyPreset = (value: Preset) => {
    setPreset(value)
    if (value === 'this-month') { const r = monthBounds(); setFrom(r.from); setTo(r.to) }
    else if (value === 'last-month') { const r = monthBounds(-1); setFrom(r.from); setTo(r.to) }
    else if (value === 'this-year') { const r = yearBounds(); setFrom(r.from); setTo(r.to) }
    else if (value === 'all') { setFrom(''); setTo('') }
  }
  const reset = () => { setPreset('this-month'); const r = monthBounds(); setFrom(r.from); setTo(r.to) }
  const catName = (id: string) => categories.find(c => c.id === id)?.name || 'Other'

  const tabs: { id: ReportType; label: string }[] = [
    { id: 'overview', label: 'Overview' }, { id: 'invoices', label: 'Invoices & Income' }, { id: 'expenses', label: 'Expenses' }, { id: 'full', label: 'Full Report' },
  ]

  return (
    <div className="reports-page">
      <div className="card-header">
        <div><h1>Reports & Analytics</h1><p className="text-sm text-muted">Income, expenses and profit with full date drill-down.</p></div>
        <div className="report-export-actions">
          <button className="btn btn-outline" onClick={() => exportAllInvoicesPdf(settings, invoices)}>↓ All invoices PDF</button>
          <button className="btn btn-outline" onClick={() => exportAllInvoicesExcel(settings, invoices)}>↓ All invoices Excel</button>
        </div>
      </div>

      <div className="card mb-4 report-filters">
        <div className="report-filter-row">
          <div className="field"><label>Period</label><select value={preset} onChange={e => applyPreset(e.target.value as Preset)}>
            <option value="this-month">This month</option><option value="last-month">Last month</option><option value="this-year">This year</option><option value="all">All dates</option><option value="custom">Custom range</option>
          </select></div>
          <div className="field"><label>From</label><input type="date" value={from} onChange={e => { setPreset('custom'); setFrom(e.target.value) }} /></div>
          <div className="field"><label>To</label><input type="date" value={to} onChange={e => { setPreset('custom'); setTo(e.target.value) }} /></div>
          <button className="btn btn-outline report-reset" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="report-tabs">
        {tabs.map(t => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      <div className="report-kpis">
        <div className="card"><span>Invoice value</span><strong>{formatCurrency(data.invoiceTotal, settings.currency)}</strong><small>{data.invoices.length} invoices</small></div>
        <div className="card"><span>Income collected</span><strong>{formatCurrency(data.collected, settings.currency)}</strong><small>{formatCurrency(data.outstanding, settings.currency)} outstanding</small></div>
        <div className="card"><span>Expenses</span><strong>{formatCurrency(data.expenseTotal, settings.currency)}</strong><small>{data.expenses.length} entries</small></div>
        <div className={`card ${data.profit >= 0 ? 'profit-positive' : 'profit-negative'}`}><span>Profit / surplus</span><strong>{formatCurrency(data.profit, settings.currency)}</strong><small>Collected income − expenses</small></div>
      </div>

      <div className="report-toolbar card">
        <div><strong>{from || 'Beginning'} → {to || 'Today'}</strong><span className="text-sm text-muted"> · {tab === 'full' ? 'Income + expenses' : tab === 'invoices' ? 'Invoices & income' : tab === 'expenses' ? 'Expenses' : 'Overview'}</span></div>
        <div className="report-export-actions">
          <button className="btn btn-primary btn-sm" onClick={() => exportReportPdf(settings, data, categories, { from, to }, tab)}>PDF</button>
          <button className="btn btn-outline btn-sm" onClick={() => exportReportExcel(settings, data, categories, { from, to }, tab)}>Excel</button>
        </div>
      </div>

      {(tab === 'overview' || tab === 'invoices' || tab === 'full') && (
        <section className="card report-section">
          <div className="card-header"><div><h2>Invoices & Income</h2><p className="text-sm text-muted">Tap an invoice for line items and payment details.</p></div><strong>{formatCurrency(data.collected, settings.currency)} collected</strong></div>
          {data.invoices.length === 0 ? <p className="text-muted">No invoices in this period.</p> : <div className="table-wrap report-table"><table><thead><tr><th>Invoice</th><th>Date</th><th>Client</th><th>Status</th><th>Total</th><th>Collected</th><th>Balance</th></tr></thead><tbody>
            {data.invoices.map(i => <>
              <tr key={i.id} className="drill-row" onClick={() => setExpandedInvoice(expandedInvoice === i.id ? null : i.id)}>
                <td><strong>{i.number}</strong><span className="drill-chevron">{expandedInvoice === i.id ? '▴' : '▾'}</span></td><td>{i.invoiceDate}</td><td>{i.clientName}</td><td><span className={`badge badge-${i.status}`}>{i.status}</span></td><td>{formatCurrency(i.total, settings.currency)}</td><td>{formatCurrency(i.total - i.balanceDue, settings.currency)}</td><td>{formatCurrency(i.balanceDue, settings.currency)}</td>
              </tr>
              {expandedInvoice === i.id && <tr className="drill-detail" key={`${i.id}-detail`}><td colSpan={7}><div className="drill-grid"><div><b>Stay</b><span>{i.stayOption || '—'}</span></div><div><b>Check-in</b><span>{i.checkIn || '—'}</span></div><div><b>Check-out</b><span>{i.checkOut || '—'}</span></div><div><b>Tax</b><span>{formatCurrency(i.taxAmount, settings.currency)}</span></div></div><div className="drill-items">{i.items.map(item => <div key={item.id}><span>{item.description} × {item.qty}</span><b>{formatCurrency(item.amount, settings.currency)}</b></div>)}</div>{i.payments.length > 0 && <div className="drill-items"><strong>Payments</strong>{i.payments.map(p => <div key={p.id}><span>{p.date} · {p.method.toUpperCase()} {p.reference ? `· ${p.reference}` : ''}</span><b>{formatCurrency(p.amount, settings.currency)}</b></div>)}</div>}<button className="btn btn-sm btn-outline" onClick={() => onNavigate('edit', i.id)}>Open invoice</button></td></tr>}
            </>)}
          </tbody></table></div>}
        </section>
      )}

      {(tab === 'overview' || tab === 'expenses' || tab === 'full') && (
        <section className="card report-section">
          <div className="card-header"><div><h2>Expenses</h2><p className="text-sm text-muted">Tap an expense for reference and notes.</p></div><strong>{formatCurrency(data.expenseTotal, settings.currency)} total</strong></div>
          {data.expenses.length === 0 ? <p className="text-muted">No expenses in this period.</p> : <div className="table-wrap report-table"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Method</th><th>Amount</th></tr></thead><tbody>
            {data.expenses.map(e => <><tr key={e.id} className="drill-row" onClick={() => setExpandedExpense(expandedExpense === e.id ? null : e.id)}><td>{e.date}</td><td><strong>{e.description}</strong><span className="drill-chevron">{expandedExpense === e.id ? '▴' : '▾'}</span></td><td>{catName(e.categoryId)}</td><td>{e.paymentMethod.toUpperCase()}</td><td>{formatCurrency(e.amount, settings.currency)}</td></tr>{expandedExpense === e.id && <tr className="drill-detail" key={`${e.id}-detail`}><td colSpan={5}><div className="drill-grid"><div><b>Subcategory</b><span>{e.subcategory || '—'}</span></div><div><b>Reference</b><span>{e.reference || '—'}</span></div><div><b>Created</b><span>{new Date(e.createdAt).toLocaleString('en-IN')}</span></div></div>{e.notes && <p className="text-sm"><b>Notes:</b> {e.notes}</p>}</td></tr>}</>)}
          </tbody></table></div>}
        </section>
      )}

      {tab === 'full' && <section className="card report-section full-profit"><h2>Profit calculation</h2><div className="profit-line"><span>Income collected</span><b>{formatCurrency(data.collected, settings.currency)}</b></div><div className="profit-line"><span>Less: expenses</span><b>{formatCurrency(data.expenseTotal, settings.currency)}</b></div><div className="profit-total"><span>Profit / cash surplus</span><b>{formatCurrency(data.profit, settings.currency)}</b></div></section>}
    </div>
  )
}
