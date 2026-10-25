import { useState, useMemo } from 'react'
import type { AppSettings, Client, Item, Invoice, InvoiceItem, Payment, TaxMode } from '../types'
import {
  getInvoices, upsertInvoice, generateId, formatCurrency, numberToWords,
  saveSettings, upsertClient
} from '../lib/storage'

interface Props {
  invoiceId: string | null
  settings: AppSettings
  clients: Client[]
  items: Item[]
  onSave: () => void
  onCancel: () => void
  onSettingsChange: () => void
}

export default function InvoiceEditor({ invoiceId, settings, clients, items, onSave, onCancel, onSettingsChange }: Props) {
  const isEdit = !!invoiceId
  const existing = isEdit ? getInvoices().find(i => i.id === invoiceId) : null
  const theme = settings.theme
  const sections = settings.sections

  const [clientName, setClientName] = useState(existing?.clientName || '')
  const [clientPhone, setClientPhone] = useState(existing?.clientPhone || '')
  const [clientEmail, setClientEmail] = useState(existing?.clientEmail || '')
  const [clientAddress, setClientAddress] = useState(existing?.clientAddress || '')
  const [clientGstin, setClientGstin] = useState(existing?.clientGstin || '')
  const [invoiceDate, setInvoiceDate] = useState(existing?.invoiceDate || new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState(existing?.dueDate || new Date().toISOString().slice(0, 10))
  const [checkIn, setCheckIn] = useState(existing?.checkIn || '')
  const [checkOut, setCheckOut] = useState(existing?.checkOut || '')
  const [terms, setTerms] = useState(existing?.terms || settings.business.defaultTerms || 'Due on Receipt')
  const [notes, setNotes] = useState(existing?.notes || settings.business.defaultNotes || '')
  const [lineItems, setLineItems] = useState<InvoiceItem[]>(existing?.items || [
    { id: generateId('li'), description: 'Stay', qty: 1, rate: 15000, amount: 15000 }
  ])
  const [payments, setPayments] = useState<Payment[]>(existing?.payments || [])
  const [taxMode, setTaxMode] = useState<TaxMode>(existing?.taxMode || settings.defaultTaxMode || 'none')
  const [taxRate, setTaxRate] = useState(existing?.taxRate ?? settings.defaultTaxRate ?? 0)
  const [customFields, setCustomFields] = useState<Record<string, string>>(existing?.customFields || {})
  const [stayOption, setStayOption] = useState(existing?.stayOption || '')
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<Payment['method']>('upi')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [payRef, setPayRef] = useState('')
  const [showPayForm, setShowPayForm] = useState(false)
  const [showPreview, setShowPreview] = useState(true)

  const subTotal = useMemo(() => lineItems.reduce((s, i) => s + i.amount, 0), [lineItems])

  const { cgst, sgst, igst, taxAmount, total } = useMemo(() => {
    if (taxMode === 'none' || taxRate <= 0) {
      return { cgst: 0, sgst: 0, igst: 0, taxAmount: 0, total: subTotal }
    }
    const tax = (subTotal * taxRate) / 100
    if (taxMode === 'cgst_sgst') {
      const half = tax / 2
      return { cgst: half, sgst: half, igst: 0, taxAmount: tax, total: subTotal + tax }
    }
    return { cgst: 0, sgst: 0, igst: tax, taxAmount: tax, total: subTotal + tax }
  }, [subTotal, taxMode, taxRate])

  const paid = payments.reduce((s, p) => s + p.amount, 0)
  const balanceDue = Math.max(0, total - paid)
  const amountInWords = numberToWords(total)
  const invoiceNumber = existing?.number || `${settings.invoicePrefix}${String(settings.nextInvoiceNumber).padStart(6, '0')}`
  const biz = settings.business

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setLineItems(prev => prev.map(it => {
      if (it.id !== id) return it
      const next = { ...it, [field]: value }
      if (field === 'qty' || field === 'rate') {
        next.amount = Number(next.qty) * Number(next.rate)
      }
      return next
    }))
  }

  const addItem = (fromCatalog?: Item) => {
    if (fromCatalog) {
      setLineItems(prev => [...prev, {
        id: generateId('li'),
        itemId: fromCatalog.id,
        description: fromCatalog.name,
        qty: 1,
        rate: fromCatalog.rate,
        amount: fromCatalog.rate,
        sacCode: fromCatalog.sacCode,
        taxRate: fromCatalog.taxRate,
      }])
    } else {
      setLineItems(prev => [...prev, {
        id: generateId('li'),
        description: '',
        qty: 1,
        rate: 0,
        amount: 0,
      }])
    }
  }

  const removeItem = (id: string) => setLineItems(prev => prev.filter(i => i.id !== id))

  const addPayment = () => {
    const amt = Number(payAmount)
    if (!amt || amt <= 0) {
      alert('Enter a valid payment amount')
      return
    }
    setPayments(prev => [...prev, {
      id: generateId('pay'),
      amount: amt,
      method: payMethod,
      date: payDate,
      reference: payRef || undefined,
    }])
    setPayAmount('')
    setPayRef('')
    setShowPayForm(false)
  }

  const removePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id))
  }

  const handleSave = () => {
    if (!clientName.trim()) {
      alert('Client name is required')
      return
    }

    let number = existing?.number
    if (!isEdit) {
      number = `${settings.invoicePrefix}${String(settings.nextInvoiceNumber).padStart(6, '0')}`
      saveSettings({ ...settings, nextInvoiceNumber: settings.nextInvoiceNumber + 1 })
      onSettingsChange()
    }

    let finalStatus: Invoice['status'] = 'draft'
    if (balanceDue <= 0 && total > 0) finalStatus = 'paid'
    else if (paid > 0 && balanceDue > 0) finalStatus = 'partial'
    else if (existing?.status) finalStatus = existing.status

    const invoice: Invoice = {
      id: existing?.id || generateId('inv'),
      number: number!,
      status: finalStatus,
      clientName,
      clientPhone,
      clientEmail,
      clientAddress,
      clientGstin: clientGstin || undefined,
      invoiceDate,
      dueDate,
      checkIn: checkIn || undefined,
      checkOut: checkOut || undefined,
      terms,
      notes,
      items: lineItems,
      subTotal,
      taxMode,
      taxRate,
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      taxAmount,
      total,
      amountInWords,
      payments,
      balanceDue,
      customFields,
      stayOption: stayOption || undefined,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    upsertInvoice(invoice)

    if (clientName && !clients.find(c => c.name === clientName)) {
      upsertClient({
        id: generateId('cli'),
        name: clientName,
        phone: clientPhone,
        email: clientEmail,
        address: clientAddress,
        gstin: clientGstin,
        createdAt: new Date().toISOString(),
      })
    }

    onSave()
  }

  const handlePrint = () => {
    const prevTitle = document.title
    // Blank title so browser header doesn't show "FarmStay Invoice Maker"
    document.title = ' '
    // Small delay so title applies before dialog
    setTimeout(() => {
      window.print()
      setTimeout(() => { document.title = prevTitle }, 500)
    }, 50)
  }

  const logoRadius =
    theme.logoStyle === 'circle' ? '50%' :
    theme.logoStyle === 'square' ? '0' :
    `${theme.borderRadius}px`
  const logoSize = theme.logoSize || 140
  const templateId = settings.templateId || 'classic'
  const tplClass =
    templateId === 'modern' ? 'tpl-modern' :
    templateId === 'minimal' ? 'tpl-minimal' :
    templateId === 'bold' ? 'tpl-bold' :
    templateId === 'compact' ? 'tpl-compact' : ''


  const InvoiceDocument = ({ forPrint = false }: { forPrint?: boolean }) => (
    <div
      className={`${forPrint ? 'invoice-print-doc' : 'invoice-preview'} ${tplClass}`}
      style={{
        fontFamily: theme.fontFamily,
        color: theme.textColor,
        borderRadius: forPrint ? 0 : theme.borderRadius,
        ['--tpl-primary' as any]: theme.primaryColor,
        ['--tpl-secondary' as any]: theme.secondaryColor,
      }}
    >
      {/* Header */}
      <div className="inv-header">
        <div className="inv-brand">
          {sections.showLogo && (
            biz.logoUrl ? (
              <img
                src={biz.logoUrl}
                alt="Logo"
                className="logo-img"
                style={{ borderRadius: logoRadius, width: logoSize, height: logoSize }}
              />
            ) : (
              <div
                className="logo-circle"
                style={{
                  background: theme.accentColor,
                  borderRadius: logoRadius,
                  width: logoSize,
                  height: logoSize,
                  fontSize: logoSize * 0.22,
                }}
              >
                SUGI
              </div>
            )
          )}
          <div>
            <div className="biz-name">{biz.name}</div>
            {sections.showBusinessAddress && (
              <div className="biz-meta" style={{ color: theme.mutedColor }}>
                {biz.address}{biz.city ? `, ${biz.city}` : ''}
              </div>
            )}
            {sections.showBusinessPhone && biz.phone && (
              <div className="biz-meta" style={{ color: theme.mutedColor }}>{biz.phone}</div>
            )}
            {sections.showBusinessEmail && biz.email && (
              <div className="biz-meta" style={{ color: theme.mutedColor }}>{biz.email}</div>
            )}
            {sections.showGstin && biz.gstin && (
              <div className="biz-meta" style={{ color: theme.mutedColor }}>GSTIN: {biz.gstin}</div>
            )}
          </div>
        </div>
        <div className="inv-meta">
          <div className="inv-title" style={{ color: theme.primaryColor }}>{biz.invoiceTitle || 'TAX INVOICE'}</div>
          <div className="inv-number"># {invoiceNumber}</div>
          {sections.showBalanceDue !== false && (
            <>
              <div className="inv-balance-label" style={{ color: theme.mutedColor }}>Balance Due</div>
              <div className={`inv-balance-value ${balanceDue > 0 ? 'due' : 'paid'}`}>
                {formatCurrency(balanceDue)}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Parties */}
      <div className="inv-parties">
        <div>
          <div className="label" style={{ color: theme.mutedColor }}>Bill To</div>
          <div className="client-name">{clientName || 'Client Name'}</div>
          {sections.showClientPhone && clientPhone && (
            <div className="client-line" style={{ color: theme.mutedColor }}>{clientPhone}</div>
          )}
          {sections.showClientEmail && clientEmail && (
            <div className="client-line" style={{ color: theme.mutedColor }}>{clientEmail}</div>
          )}
          {sections.showClientAddress && clientAddress && (
            <div className="client-line" style={{ color: theme.mutedColor }}>{clientAddress}</div>
          )}
          {sections.showClientGstin && clientGstin && (
            <div className="client-line" style={{ color: theme.mutedColor }}>GSTIN: {clientGstin}</div>
          )}
        </div>
        <div className="inv-dates">
          {sections.showInvoiceDate && (
            <div><span style={{ color: theme.mutedColor }}>Invoice Date:</span> {invoiceDate}</div>
          )}
          {sections.showDueDate && (
            <div><span style={{ color: theme.mutedColor }}>Due Date:</span> {dueDate}</div>
          )}
          {sections.showCheckIn && checkIn && (
            <div><span style={{ color: theme.mutedColor }}>Check-in:</span> {checkIn}</div>
          )}
          {sections.showCheckOut && checkOut && (
            <div><span style={{ color: theme.mutedColor }}>Check-out:</span> {checkOut}</div>
          )}
          {sections.showTerms && terms && (
            <div><span style={{ color: theme.mutedColor }}>Terms:</span> {terms}</div>
          )}
        </div>
      </div>


      {/* Ordered body sections */}
      {(settings.sectionOrder || [
        'customFields', 'items', 'totals', 'amountInWords',
        'bankDetails', 'upi', 'paymentHistory', 'notes'
      ]).map(sectionKey => {
        if (sectionKey === 'stayOption') {
          if (!sections.showStayOption || !stayOption) return null
          return (
            <div key="stayOption" style={{ marginBottom: '0.85rem', fontSize: '0.9rem' }}>
              <strong>Stay:</strong> {stayOption}
            </div>
          )
        }

        if (sectionKey === 'customFields') {
          if (!sections.showCustomFields || !settings.customFieldDefs?.some(f => f.enabled)) return null
          const filled = settings.customFieldDefs.filter(f => f.enabled && customFields[f.key])
          if (filled.length === 0) return null
          return (
            <div key="customFields" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              {filled.map(f => (
                <div key={f.key}>
                  <span style={{ color: theme.mutedColor }}>{f.label}:</span> {customFields[f.key]}
                </div>
              ))}
            </div>
          )
        }

        if (sectionKey === 'items') {
          return (
            <table key="items" className="inv-table">
              <thead>
                <tr>
                  <th style={{ width: 40, background: theme.tableHeaderBg }}>#</th>
                  <th style={{ background: theme.tableHeaderBg }}>Description</th>
                  <th style={{ width: 70, background: theme.tableHeaderBg }}>Qty</th>
                  <th style={{ width: 110, background: theme.tableHeaderBg }}>Rate</th>
                  <th style={{ width: 120, background: theme.tableHeaderBg }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((it, idx) => (
                  <tr key={it.id}>
                    <td>{idx + 1}</td>
                    <td>{it.description || '—'}</td>
                    <td>{it.qty}</td>
                    <td>{formatCurrency(it.rate)}</td>
                    <td>{formatCurrency(it.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        }

        if (sectionKey === 'totals') {
          return (
            <div key="totals" className="inv-totals-wrap">
              <div className="inv-totals">
                <div className="row"><span>Sub Total</span><span>{formatCurrency(subTotal)}</span></div>
                {taxMode === 'cgst_sgst' && taxAmount > 0 && (
                  <>
                    <div className="row"><span>CGST ({(taxRate / 2).toFixed(1)}%)</span><span>{formatCurrency(cgst)}</span></div>
                    <div className="row"><span>SGST ({(taxRate / 2).toFixed(1)}%)</span><span>{formatCurrency(sgst)}</span></div>
                  </>
                )}
                {taxMode === 'igst' && taxAmount > 0 && (
                  <div className="row"><span>IGST ({taxRate}%)</span><span>{formatCurrency(igst)}</span></div>
                )}
                <div className="row grand"><span>Total</span><span>{formatCurrency(total)}</span></div>
                {paid > 0 && (
                  <div className="row"><span>Payment Made</span><span className="paid-amt">(-) {formatCurrency(paid)}</span></div>
                )}
                <div className="row balance" style={{ background: `${theme.primaryColor}15` }}>
                  <span>Balance Due</span><span>{formatCurrency(balanceDue)}</span>
                </div>
              </div>
            </div>
          )
        }

        if (sectionKey === 'amountInWords') {
          if (!sections.showAmountInWords) return null
          return (
            <div key="amountInWords" className="inv-words">
              <strong>Total In Words:</strong> {amountInWords}
            </div>
          )
        }

        if (sectionKey === 'bankDetails') {
          if (!sections.showBankDetails || !(biz.bankName || biz.accountNumber)) return null
          return (
            <div key="bankDetails" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              <strong>Bank Details</strong>
              {biz.bankName && <div>Bank: {biz.bankName}</div>}
              {biz.accountNumber && <div>A/C: {biz.accountNumber}</div>}
              {biz.ifsc && <div>IFSC: {biz.ifsc}</div>}
            </div>
          )
        }

        if (sectionKey === 'upi') {
          if (!sections.showUpi || !biz.upiId) return null
          return (
            <div key="upi" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
              <strong>UPI:</strong> {biz.upiId}
            </div>
          )
        }

        if (sectionKey === 'paymentHistory') {
          if (!sections.showPaymentHistory || payments.length === 0) return null
          return (
            <div key="paymentHistory" style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
              <strong>Payments</strong>
              {payments.map(p => (
                <div key={p.id}>{p.date} — {formatCurrency(p.amount)} ({p.method})</div>
              ))}
            </div>
          )
        }

        if (sectionKey === 'notes') {
          if (!sections.showNotes || !notes) return null
          return (
            <div key="notes" className="inv-notes" style={{ color: theme.mutedColor }}>{notes}</div>
          )
        }

        return null
      })}

      {sections.showThankYou && (notes || biz.defaultNotes) && (
        <div className="inv-footer" style={{ color: theme.mutedColor, borderColor: `${theme.primaryColor}33` }}>
          {notes || biz.defaultNotes}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="no-print">
        <div className="card-header">
          <h1>{isEdit ? `Edit ${existing?.number}` : 'New Invoice'}</h1>
          <div className="flex gap-2 flex-wrap">
            <button className="btn btn-outline" onClick={onCancel}>Cancel</button>
            <button className="btn btn-outline" onClick={() => setShowPreview(!showPreview)}>
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            <button className="btn btn-outline" onClick={handlePrint} title="In the print dialog, turn OFF Headers and footers">
              Print / PDF
            </button>
            <button className="btn btn-primary" onClick={handleSave} style={{ background: theme.primaryColor }}>
              Save Invoice
            </button>
          </div>
        </div>

        <div
          className="editor-grid"
          style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: showPreview ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1fr',
          }}
        >
          <div className="card">
            <h2 className="mb-4">Details</h2>

            <div className="form-grid cols-2 mb-4">
              <div className="field">
                <label>Client Name *</label>
                <input list="client-list" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Mr. Babu" />
                <datalist id="client-list">
                  {clients.map(c => <option key={c.id} value={c.name} />)}
                </datalist>
              </div>
              <div className="field">
                <label>Phone</label>
                <input value={clientPhone} onChange={e => setClientPhone(e.target.value)} />
              </div>
              <div className="field">
                <label>Email</label>
                <input value={clientEmail} onChange={e => setClientEmail(e.target.value)} />
              </div>
              <div className="field">
                <label>Address</label>
                <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
              </div>
              {sections.showClientGstin && (
                <div className="field">
                  <label>Client GSTIN</label>
                  <input value={clientGstin} onChange={e => setClientGstin(e.target.value)} placeholder="Optional" />
                </div>
              )}
            </div>

            <div className="form-grid cols-2 mb-4">
              <div className="field">
                <label>Invoice Date</label>
                <input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Due Date</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
              </div>
              {sections.showCheckIn && (
                <div className="field">
                  <label>Check-in</label>
                  <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} />
                </div>
              )}
              {sections.showCheckOut && (
                <div className="field">
                  <label>Check-out</label>
                  <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} />
                </div>
              )}
            </div>

            {sections.showStayOption && (settings.stayOptions?.length ?? 0) > 0 && (
              <div className="field mb-4">
                <label>Stay option</label>
                <select value={stayOption} onChange={e => setStayOption(e.target.value)}>
                  <option value="">Select property…</option>
                  {(settings.stayOptions || []).map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Custom fields */}
            {sections.showCustomFields && settings.customFieldDefs?.filter(f => f.enabled).length > 0 && (
              <div className="form-grid cols-2 mb-4">
                {settings.customFieldDefs.filter(f => f.enabled).map(f => (
                  <div className="field" key={f.key}>
                    <label>{f.label}</label>
                    <input
                      value={customFields[f.key] || ''}
                      onChange={e => setCustomFields(prev => ({ ...prev, [f.key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <h2 className="mb-2">Line Items</h2>
            <div className="flex gap-2 flex-wrap mb-2">
              {items.filter(i => i.isActive).map(it => (
                <button key={it.id} className="btn btn-sm btn-outline" onClick={() => addItem(it)}>
                  + {it.name}
                </button>
              ))}
              <button className="btn btn-sm btn-outline" onClick={() => addItem()}>+ Custom</button>
            </div>

            <div className="table-wrap mb-4">
              <table>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th style={{ width: 70 }}>Qty</th>
                    <th style={{ width: 100 }}>Rate</th>
                    <th style={{ width: 100 }}>Amount</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map(it => (
                    <tr key={it.id}>
                      <td>
                        <input
                          value={it.description}
                          onChange={e => updateItem(it.id, 'description', e.target.value)}
                          style={{ width: '100%', border: 'none', background: 'transparent' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number" min="0" step="0.01" value={it.qty}
                          onChange={e => updateItem(it.id, 'qty', Number(e.target.value))}
                          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '0.25rem' }}
                        />
                      </td>
                      <td>
                        <input
                          type="number" min="0" step="0.01" value={it.rate}
                          onChange={e => updateItem(it.id, 'rate', Number(e.target.value))}
                          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 4, padding: '0.25rem' }}
                        />
                      </td>
                      <td className="text-right">{formatCurrency(it.amount)}</td>
                      <td>
                        <button className="btn btn-sm btn-danger" onClick={() => removeItem(it.id)}>×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax controls */}
            <div className="form-grid cols-2 mb-4">
              <div className="field">
                <label>Tax Mode</label>
                <select value={taxMode} onChange={e => setTaxMode(e.target.value as TaxMode)}>
                  <option value="none">No Tax</option>
                  <option value="cgst_sgst">CGST + SGST</option>
                  <option value="igst">IGST</option>
                </select>
              </div>
              <div className="field">
                <label>Tax Rate (%)</label>
                <input
                  type="number"
                  min={0}
                  max={28}
                  step={0.5}
                  value={taxRate}
                  onChange={e => setTaxRate(Number(e.target.value))}
                  disabled={taxMode === 'none'}
                />
              </div>
              {sections.showTerms && (
                <div className="field">
                  <label>Terms</label>
                  <input value={terms} onChange={e => setTerms(e.target.value)} />
                </div>
              )}
              {sections.showNotes && (
                <div className="field">
                  <label>Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-center mb-2">
              <h2>Payments</h2>
              <button className="btn btn-sm btn-outline" onClick={() => setShowPayForm(!showPayForm)}>
                {showPayForm ? 'Cancel' : '+ Record Payment'}
              </button>
            </div>
            {showPayForm && (
              <div className="card mb-3" style={{ background: '#f8fafc', padding: '1rem' }}>
                <div className="form-grid cols-2">
                  <div className="field">
                    <label>Amount</label>
                    <input type="number" min="0" step="0.01" value={payAmount}
                      onChange={e => setPayAmount(e.target.value)} placeholder={String(balanceDue)} />
                  </div>
                  <div className="field">
                    <label>Method</label>
                    <select value={payMethod} onChange={e => setPayMethod(e.target.value as Payment['method'])}>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="bank">Bank Transfer</option>
                      <option value="card">Card</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Date</label>
                    <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Reference (optional)</label>
                    <input value={payRef} onChange={e => setPayRef(e.target.value)} placeholder="Txn ID / UTR" />
                  </div>
                </div>
                <button className="btn btn-primary btn-sm mt-3" onClick={addPayment}>Add Payment</button>
              </div>
            )}
            {payments.length === 0 ? (
              <p className="text-sm text-muted">No payments recorded yet.</p>
            ) : (
              <div>
                {payments.map(p => (
                  <div key={p.id} className="payment-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{formatCurrency(p.amount)} · {p.method.toUpperCase()}</div>
                      <div className="text-sm text-muted">{p.date}{p.reference ? ` · ${p.reference}` : ''}</div>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => removePayment(p.id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showPreview && (
            <div>
              <InvoiceDocument />
            </div>
          )}
        </div>
      </div>

      <div className="print-only-wrapper">
        <InvoiceDocument forPrint />
      </div>
    </div>
  )
}
