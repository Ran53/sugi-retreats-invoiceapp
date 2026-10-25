import { useState, useRef } from 'react'
import type { AppSettings, Theme, InvoiceSectionToggles, TemplateId } from '../types'
import {
  saveSettings, exportAllData, importAllData,
  DEFAULT_THEME, DEFAULT_SECTION_ORDER, DEFAULT_SECTIONS, DEFAULT_STAY_OPTIONS,
} from '../lib/storage'

interface Props {
  settings: AppSettings
  onChange: () => void
}

const FONT_OPTIONS = [
  { value: 'Inter, system-ui, sans-serif', label: 'Inter (Modern)' },
  { value: 'Georgia, serif', label: 'Georgia (Classic)' },
  { value: '"Segoe UI", system-ui, sans-serif', label: 'Segoe UI' },
  { value: 'system-ui, -apple-system, sans-serif', label: 'System Default' },
]

const PRESET_THEMES: Theme[] = [
  { ...DEFAULT_THEME, id: 'classic-green', name: 'Classic Green', primaryColor: '#2d6a4f', tableHeaderBg: '#2d6a4f', accentColor: '#ffd60a' },
  { ...DEFAULT_THEME, id: 'ocean-blue', name: 'Ocean Blue', primaryColor: '#1d4ed8', tableHeaderBg: '#1d4ed8', secondaryColor: '#3b82f6', accentColor: '#93c5fd' },
  { ...DEFAULT_THEME, id: 'warm-earth', name: 'Warm Earth', primaryColor: '#9a3412', tableHeaderBg: '#9a3412', secondaryColor: '#c2410c', accentColor: '#fdba74' },
  { ...DEFAULT_THEME, id: 'minimal-dark', name: 'Minimal Dark', primaryColor: '#18181b', tableHeaderBg: '#27272a', secondaryColor: '#3f3f46', accentColor: '#a1a1aa' },
  { ...DEFAULT_THEME, id: 'royal-purple', name: 'Royal Purple', primaryColor: '#6d28d9', tableHeaderBg: '#6d28d9', secondaryColor: '#8b5cf6', accentColor: '#c4b5fd' },
]

const TEMPLATES: { id: TemplateId; name: string; desc: string }[] = [
  { id: 'classic', name: 'Classic', desc: 'Clean Zoho-style layout' },
  { id: 'modern', name: 'Modern', desc: 'Colored header band' },
  { id: 'minimal', name: 'Minimal', desc: 'Light + top accent bar' },
  { id: 'bold', name: 'Bold', desc: 'Strong title & logo frame' },
  { id: 'compact', name: 'Compact', desc: 'Tighter spacing' },
]

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description?: string
}) {
  return (
    <div className="toggle-row" onClick={() => onChange(!checked)}>
      <div className="toggle-track" style={{ background: checked ? 'var(--primary)' : '#cbd5e1' }}>
        <div className="toggle-thumb" style={{ left: checked ? 21 : 3 }} />
      </div>
      <div>
        <div style={{ fontWeight: 560, fontSize: '0.92rem' }}>{label}</div>
        {description && <div className="text-sm text-muted" style={{ marginTop: 2 }}>{description}</div>}
      </div>
    </div>
  )
}

/** Tiny live invoice sketch for Fields / Templates */
function MiniInvoicePreview({
  theme, sections, templateId, biz, stayOptions, customFields, invoiceTitle,
}: {
  theme: Theme
  sections: InvoiceSectionToggles
  templateId: TemplateId
  biz: AppSettings['business']
  stayOptions: string[]
  customFields: { key: string; label: string; enabled: boolean }[]
  invoiceTitle: string
}) {
  const logoRadius = theme.logoStyle === 'circle' ? '50%' : theme.logoStyle === 'square' ? '0' : '8px'
  const tplClass =
    templateId === 'modern' ? 'tpl-modern' :
    templateId === 'minimal' ? 'tpl-minimal' :
    templateId === 'bold' ? 'tpl-bold' :
    templateId === 'compact' ? 'tpl-compact' : ''

  return (
    <div
      className={`settings-mini-preview ${tplClass}`}
      style={{
        fontFamily: theme.fontFamily,
        ['--tpl-primary' as any]: theme.primaryColor,
        ['--tpl-secondary' as any]: theme.secondaryColor,
      }}
    >
      <div className="inv-header" style={{ marginBottom: 12, paddingBottom: 8 }}>
        <div className="inv-brand" style={{ gap: 8 }}>
          {sections.showLogo && (
            biz.logoUrl ? (
              <img src={biz.logoUrl} alt="" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: logoRadius }} />
            ) : (
              <div style={{
                width: 56, height: 56, background: theme.accentColor, borderRadius: logoRadius,
                display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 11, color: '#1b4332',
              }}>SUGI</div>
            )
          )}
          <div>
            <div className="biz-name" style={{ fontWeight: 700 }}>{biz.name || 'Business'}</div>
            {sections.showBusinessAddress && <div style={{ color: theme.mutedColor }}>{biz.city || 'City'}</div>}
            {sections.showBusinessPhone && biz.phone && <div style={{ color: theme.mutedColor }}>{biz.phone}</div>}
          </div>
        </div>
        <div className="inv-meta" style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 800, color: theme.primaryColor, fontSize: '1rem' }}>{invoiceTitle || 'TAX INVOICE'}</div>
          <div># INV-000001</div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, color: theme.mutedColor, textTransform: 'uppercase' }}>Bill To</div>
          <div style={{ fontWeight: 600 }}>Sample Guest</div>
          {sections.showClientPhone && <div style={{ color: theme.mutedColor }}>+91 98XXXX</div>}
        </div>
        <div style={{ textAlign: 'right', color: theme.mutedColor }}>
          {sections.showInvoiceDate && <div>Invoice: 2026-10-25</div>}
          {sections.showDueDate && <div>Due: 2026-10-25</div>}
          {sections.showCheckIn && <div>Check-in: 2026-10-20</div>}
          {sections.showCheckOut && <div>Check-out: 2026-10-22</div>}
          {sections.showTerms && <div>Terms: Due on Receipt</div>}
        </div>
      </div>
      {sections.showStayOption && stayOptions[0] && (
        <div style={{ marginBottom: 8 }}><strong>Stay:</strong> {stayOptions[0]}</div>
      )}
      {sections.showCustomFields && customFields.filter(f => f.enabled).map(f => (
        <div key={f.key} style={{ marginBottom: 4 }}><span style={{ color: theme.mutedColor }}>{f.label}:</span> Sample</div>
      ))}
      <table style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0' }}>
        <thead>
          <tr>
            <th style={{ background: theme.tableHeaderBg, color: '#fff', padding: '6px 8px', textAlign: 'left' }}>#</th>
            <th style={{ background: theme.tableHeaderBg, color: '#fff', padding: '6px 8px', textAlign: 'left' }}>Description</th>
            <th style={{ background: theme.tableHeaderBg, color: '#fff', padding: '6px 8px', textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0' }}>1</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0' }}>Stay</td>
            <td style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>₹15,000</td>
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'right', fontWeight: 700 }}>Total ₹15,000</div>
      {sections.showAmountInWords && (
        <div style={{ marginTop: 8, color: theme.mutedColor }}>Indian Rupee Fifteen Thousand Only</div>
      )}
      {(sections.showNotes || sections.showThankYou) && <div style={{ marginTop: 6, color: theme.mutedColor }}>{biz.defaultNotes || ''}</div>}
    </div>
  )
}

export default function SettingsPage({ settings, onChange }: Props) {
  const [biz, setBiz] = useState({
    ...settings.business,
    invoiceTitle: settings.business.invoiceTitle || 'TAX INVOICE',
  })
  const [prefix, setPrefix] = useState(settings.invoicePrefix)
  const [nextNum, setNextNum] = useState(settings.nextInvoiceNumber)
  const [theme, setTheme] = useState<Theme>({ ...DEFAULT_THEME, ...settings.theme, logoSize: settings.theme?.logoSize ?? 140 })
  const [sections, setSections] = useState<InvoiceSectionToggles>({ ...DEFAULT_SECTIONS, ...settings.sections })
  const [taxMode, setTaxMode] = useState(settings.defaultTaxMode || 'none')
  const [taxRate, setTaxRate] = useState(settings.defaultTaxRate || 0)
  const [customFields, setCustomFields] = useState(settings.customFieldDefs || [])
  const [stayOptions, setStayOptions] = useState<string[]>(settings.stayOptions || [...DEFAULT_STAY_OPTIONS])
  const [newStay, setNewStay] = useState('')
  const [sectionOrder, setSectionOrder] = useState<string[]>(settings.sectionOrder || DEFAULT_SECTION_ORDER)
  const [templateId, setTemplateId] = useState<TemplateId>(settings.templateId || 'classic')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'brand' | 'theme' | 'templates' | 'sections' | 'tax' | 'data'>('brand')
  const fileRef = useRef<HTMLInputElement>(null)

  const save = () => {
    saveSettings({
      ...settings,
      business: biz,
      invoicePrefix: prefix,
      nextInvoiceNumber: nextNum,
      theme,
      sections,
      defaultTaxMode: taxMode,
      defaultTaxRate: taxRate,
      customFieldDefs: customFields,
      stayOptions,
      sectionOrder,
      templateId,
    })
    onChange()
    alert('Settings saved')
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1.5 * 1024 * 1024) {
      alert('Logo too large (max 1.5 MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setBiz(prev => ({ ...prev, logoUrl: reader.result as string }))
    reader.readAsDataURL(file)
  }

  const updateSection = (key: keyof InvoiceSectionToggles, value: boolean) => {
    setSections(prev => ({ ...prev, [key]: value }))
  }

  const handleExport = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `farmstay-invoice-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        importAllData(JSON.parse(reader.result as string))
        onChange()
        alert('Imported successfully')
      } catch {
        alert('Invalid backup file')
      }
    }
    reader.readAsText(file)
  }

  const tabs = [
    { id: 'brand' as const, label: 'Brand' },
    { id: 'theme' as const, label: 'Theme' },
    { id: 'templates' as const, label: 'Templates' },
    { id: 'sections' as const, label: 'Fields' },
    { id: 'tax' as const, label: 'Tax' },
    { id: 'data' as const, label: 'Data' },
  ]

  const logoRadius = theme.logoStyle === 'circle' ? '50%' : theme.logoStyle === 'square' ? '0' : `${theme.borderRadius}px`
  const logoSize = theme.logoSize || 140

  return (
    <div>
      <div className="card-header">
        <div>
          <h1>Settings</h1>
          <p className="text-sm text-muted">Full control over brand, layout & fields</p>
        </div>
        <button className="btn btn-primary" onClick={save}>Save All</button>
      </div>

      <div className="settings-tabs no-print">
        {tabs.map(t => (
          <button key={t.id} className={activeTab === t.id ? 'active' : ''} onClick={() => setActiveTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* BRAND */}
      {activeTab === 'brand' && (
        <>
          <div className="card mb-4">
            <h2 className="mb-4">Logo</h2>
            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{
                width: Math.min(logoSize, 140), height: Math.min(logoSize, 140), borderRadius: logoRadius,
                border: '1px solid var(--border)', background: '#f8fafc',
                display: 'grid', placeItems: 'center', overflow: 'hidden', flexShrink: 0,
              }}>
                {biz.logoUrl ? (
                  <img src={biz.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <div style={{
                    width: '80%', height: '80%', background: theme.accentColor, borderRadius: logoRadius,
                    display: 'grid', placeItems: 'center', fontWeight: 800, color: '#1b4332', fontSize: 18,
                  }}>SUGI</div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p className="text-sm text-muted mb-3">PNG / JPG / SVG · under 1.5 MB. Size in Theme tab.</p>
                <div className="flex gap-2 flex-wrap">
                  <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    {biz.logoUrl ? 'Change Logo' : 'Upload Logo'}
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                  </label>
                  {biz.logoUrl && (
                    <button className="btn btn-outline" onClick={() => { setBiz(p => ({ ...p, logoUrl: undefined })); if (fileRef.current) fileRef.current.value = '' }}>
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <h2 className="mb-4">Invoice Title</h2>
            <div className="form-grid cols-2">
              <div className="field">
                <label>Title on invoice</label>
                <input
                  value={biz.invoiceTitle || 'TAX INVOICE'}
                  onChange={e => setBiz({ ...biz, invoiceTitle: e.target.value })}
                  placeholder="TAX INVOICE"
                />
              </div>
              <div className="field">
                <label>Quick picks</label>
                <div className="flex gap-2 flex-wrap" style={{ paddingTop: 4 }}>
                  {['TAX INVOICE', 'INVOICE', 'BILL', 'RECEIPT', 'PROFORMA INVOICE'].map(t => (
                    <button key={t} type="button" className="btn btn-sm btn-outline" onClick={() => setBiz({ ...biz, invoiceTitle: t })}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <h2 className="mb-4">Business Profile</h2>
            <div className="form-grid cols-2">
              {[
                ['name', 'Business Name'],
                ['phone', 'Phone'],
                ['email', 'Email'],
                ['city', 'City'],
                ['address', 'Address / State'],
                ['gstin', 'GSTIN'],
                ['upiId', 'UPI ID'],
                ['bankName', 'Bank Name'],
                ['accountNumber', 'Account Number'],
                ['ifsc', 'IFSC'],
                ['defaultTerms', 'Default Terms'],
                ['defaultNotes', 'Default Notes'],
              ].map(([key, label]) => (
                <div className="field" key={key}>
                  <label>{label}</label>
                  <input value={(biz as any)[key] || ''} onChange={e => setBiz({ ...biz, [key]: e.target.value })} />
                </div>
              ))}
            </div>
          </div>

          <div className="card mb-4">
            <h2 className="mb-4">Invoice Numbering</h2>
            <div className="form-grid cols-2">
              <div className="field">
                <label>Prefix</label>
                <input value={prefix} onChange={e => setPrefix(e.target.value)} />
              </div>
              <div className="field">
                <label>Next Number</label>
                <input type="number" value={nextNum} onChange={e => setNextNum(Number(e.target.value))} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* THEME */}
      {activeTab === 'theme' && (
        <>
          <div className="card mb-4">
            <h2 className="mb-3">Presets</h2>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              {PRESET_THEMES.map(p => (
                <button
                  key={p.id}
                  className="btn btn-outline btn-sm"
                  onClick={() => setTheme({ ...p, logoSize: theme.logoSize })}
                  style={{ boxShadow: theme.id === p.id ? `0 0 0 2px ${p.primaryColor}` : undefined }}
                >
                  <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: p.primaryColor, marginRight: 6 }} />
                  {p.name}
                </button>
              ))}
            </div>
          </div>
          <div className="card mb-4">
            <h2 className="mb-4">Colors</h2>
            <div className="form-grid cols-2">
              {([
                ['primaryColor', 'Primary', true],
                ['accentColor', 'Accent', false],
                ['tableHeaderBg', 'Table Header', false],
                ['mutedColor', 'Muted Text', false],
              ] as Array<[keyof Theme, string, boolean]>).map(([key, label, sync]) => (
                <div className="field" key={key as string}>
                  <label>{label as string}</label>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="color"
                      value={theme[key] as string}
                      onChange={e => {
                        const v = e.target.value
                        if (sync) setTheme({ ...theme, primaryColor: v, tableHeaderBg: v })
                        else setTheme({ ...theme, [key as string]: v })
                      }}
                      style={{ width: 48, height: 38, border: 'none', cursor: 'pointer', borderRadius: 8 }}
                    />
                    <input value={theme[key] as string} onChange={e => setTheme({ ...theme, [key as string]: e.target.value })} style={{ flex: 1 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card mb-4">
            <h2 className="mb-4">Logo & Shape</h2>
            <div className="form-grid cols-2">
              <div className="field">
                <label>Logo Size ({logoSize}px)</label>
                <input type="range" min={80} max={180} value={logoSize}
                  onChange={e => setTheme({ ...theme, logoSize: Number(e.target.value) })} />
              </div>
              <div className="field">
                <label>Logo Style</label>
                <select value={theme.logoStyle} onChange={e => setTheme({ ...theme, logoStyle: e.target.value as Theme['logoStyle'] })}>
                  <option value="rounded">Rounded</option>
                  <option value="circle">Circle</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <div className="field">
                <label>Font</label>
                <select value={theme.fontFamily} onChange={e => setTheme({ ...theme, fontFamily: e.target.value })}>
                  {FONT_OPTIONS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Corner Radius ({theme.borderRadius}px)</label>
                <input type="range" min={0} max={20} value={theme.borderRadius}
                  onChange={e => setTheme({ ...theme, borderRadius: Number(e.target.value) })} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* TEMPLATES + preview */}
      {activeTab === 'templates' && (
        <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)' }} className="editor-grid">
          <div className="card">
            <h2 className="mb-2">Templates</h2>
            <p className="text-sm text-muted mb-4">Pick a layout. Colors come from Theme.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className="btn btn-outline"
                  style={{
                    justifyContent: 'flex-start', textAlign: 'left', height: 'auto', padding: '0.9rem 1rem',
                    boxShadow: templateId === t.id ? `0 0 0 2px ${theme.primaryColor}` : undefined,
                    borderColor: templateId === t.id ? theme.primaryColor : undefined,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{t.name}</div>
                    <div className="text-sm text-muted">{t.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-2" style={{ fontSize: '0.95rem' }}>Live preview</h2>
            <MiniInvoicePreview
              theme={theme}
              sections={sections}
              templateId={templateId}
              biz={biz}
              stayOptions={stayOptions}
              customFields={customFields}
              invoiceTitle={biz.invoiceTitle || 'TAX INVOICE'}
            />
          </div>
        </div>
      )}

      {/* FIELDS + preview */}
      {activeTab === 'sections' && (
        <div style={{ display: 'grid', gap: '1.25rem', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)' }} className="editor-grid">
          <div>
            <div className="card mb-4">
              <h2 className="mb-2">Header & parties</h2>
              <Toggle label="Logo" checked={sections.showLogo} onChange={v => updateSection('showLogo', v)} />
              <Toggle label="Business address" checked={sections.showBusinessAddress} onChange={v => updateSection('showBusinessAddress', v)} />
              <Toggle label="Business phone" checked={sections.showBusinessPhone} onChange={v => updateSection('showBusinessPhone', v)} />
              <Toggle label="Business email" checked={sections.showBusinessEmail} onChange={v => updateSection('showBusinessEmail', v)} />
              <Toggle label="Your GSTIN" checked={sections.showGstin} onChange={v => updateSection('showGstin', v)} />
              <Toggle label="Client phone" checked={sections.showClientPhone} onChange={v => updateSection('showClientPhone', v)} />
              <Toggle label="Client email" checked={sections.showClientEmail} onChange={v => updateSection('showClientEmail', v)} />
              <Toggle label="Client address" checked={sections.showClientAddress} onChange={v => updateSection('showClientAddress', v)} />
              <Toggle label="Client GSTIN" checked={sections.showClientGstin} onChange={v => updateSection('showClientGstin', v)} />
              <Toggle label="Invoice date" checked={sections.showInvoiceDate} onChange={v => updateSection('showInvoiceDate', v)} />
              <Toggle label="Due date" checked={sections.showDueDate} onChange={v => updateSection('showDueDate', v)} />
              <Toggle label="Check-in" checked={sections.showCheckIn} onChange={v => updateSection('showCheckIn', v)} />
              <Toggle label="Check-out" checked={sections.showCheckOut} onChange={v => updateSection('showCheckOut', v)} />
              <Toggle label="Terms" checked={sections.showTerms} onChange={v => updateSection('showTerms', v)} />
              <Toggle label="Thank you line" checked={sections.showThankYou} onChange={v => updateSection('showThankYou', v)} />
              <Toggle label="Balance Due in header" description="Big amount under TAX INVOICE" checked={sections.showBalanceDue !== false} onChange={v => updateSection('showBalanceDue', v)} />
            </div>

            <div className="card mb-4">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h2>Stay option</h2>
                  <p className="text-sm text-muted">Property dropdown on invoices</p>
                </div>
                <div
                  className="toggle-track"
                  style={{ background: sections.showStayOption ? 'var(--primary)' : '#cbd5e1', cursor: 'pointer' }}
                  onClick={() => updateSection('showStayOption', !sections.showStayOption)}
                >
                  <div className="toggle-thumb" style={{ left: sections.showStayOption ? 21 : 3 }} />
                </div>
              </div>
              {sections.showStayOption && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                    {stayOptions.map((opt, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input
                          value={opt}
                          onChange={e => {
                            const next = [...stayOptions]
                            next[idx] = e.target.value
                            setStayOptions(next)
                          }}
                          style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
                        />
                        <button className="btn btn-sm btn-danger" onClick={() => setStayOptions(prev => prev.filter((_, i) => i !== idx))}>
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newStay}
                      onChange={e => setNewStay(e.target.value)}
                      placeholder="New property name"
                      style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid var(--border)' }}
                    />
                    <button
                      className="btn btn-sm btn-primary"
                      onClick={() => {
                        if (!newStay.trim()) return
                        setStayOptions(prev => [...prev, newStay.trim()])
                        setNewStay('')
                      }}
                    >
                      + Add
                    </button>
                  </div>
                  <button className="btn btn-outline btn-sm mt-2" onClick={() => setStayOptions([...DEFAULT_STAY_OPTIONS])}>
                    Reset to defaults
                  </button>
                </>
              )}
            </div>

            <div className="card mb-4">
              <h2 className="mb-2">Body order</h2>
              <p className="text-sm text-muted mb-3">Drag ⠿ to reorder</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sectionOrder.map((key, index) => {
                  const meta: Record<string, { label: string; toggle?: keyof InvoiceSectionToggles }> = {
                    stayOption: { label: 'Stay Option', toggle: 'showStayOption' },
                    customFields: { label: 'Custom Fields', toggle: 'showCustomFields' },
                    items: { label: 'Line Items Table' },
                    totals: { label: 'Totals' },
                    amountInWords: { label: 'Amount in Words', toggle: 'showAmountInWords' },
                    bankDetails: { label: 'Bank Details', toggle: 'showBankDetails' },
                    upi: { label: 'UPI ID', toggle: 'showUpi' },
                    paymentHistory: { label: 'Payment History', toggle: 'showPaymentHistory' },
                    notes: { label: 'Notes', toggle: 'showNotes' },
                  }
                  const m = meta[key] || { label: key }
                  const enabled = m.toggle ? sections[m.toggle] : true
                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={() => setDragIndex(index)}
                      onDragOver={e => e.preventDefault()}
                      onDrop={() => {
                        if (dragIndex === null || dragIndex === index) return
                        const next = [...sectionOrder]
                        const [moved] = next.splice(dragIndex, 1)
                        next.splice(index, 0, moved)
                        setSectionOrder(next)
                        setDragIndex(null)
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '0.7rem 0.85rem',
                        background: dragIndex === index ? '#e8f5e9' : '#f8fafc',
                        border: '1px solid var(--border)', borderRadius: 10, cursor: 'grab',
                        opacity: enabled ? 1 : 0.5,
                      }}
                    >
                      <span style={{ fontSize: 18, color: '#94a3b8', userSelect: 'none' }}>⠿</span>
                      <div style={{ flex: 1, fontWeight: 560, fontSize: '0.9rem' }}>{m.label}</div>
                      {m.toggle ? (
                        <button
                          type="button" className="btn btn-sm"
                          style={{ background: enabled ? 'var(--primary)' : '#e2e8f0', color: enabled ? 'white' : '#64748b', minWidth: 52 }}
                          onClick={e => { e.stopPropagation(); updateSection(m.toggle!, !enabled) }}
                        >
                          {enabled ? 'On' : 'Off'}
                        </button>
                      ) : (
                        <span className="text-sm text-muted">Always</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <button className="btn btn-outline btn-sm mt-3" onClick={() => setSectionOrder([...DEFAULT_SECTION_ORDER])}>
                Reset order
              </button>
            </div>

            <div className="card">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h2>Custom Fields</h2>
                  <p className="text-sm text-muted">Extra free-text fields</p>
                </div>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => setCustomFields(prev => [...prev, {
                    key: `field_${Date.now().toString(36)}`,
                    label: 'New Field',
                    enabled: true,
                  }])}
                >
                  + Add field
                </button>
              </div>
              {customFields.map((f, idx) => (
                <div key={f.key} className="cf-card">
                  <div className="cf-top">
                    <div style={{ flex: 1 }}>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <label>Label</label>
                        <input
                          value={f.label}
                          onChange={e => {
                            const next = [...customFields]
                            next[idx] = { ...f, label: e.target.value }
                            setCustomFields(next)
                          }}
                        />
                      </div>
                    </div>
                    <div style={{ paddingTop: 18 }}>
                      <div
                        className="toggle-track"
                        style={{ background: f.enabled ? 'var(--primary)' : '#cbd5e1', cursor: 'pointer' }}
                        onClick={() => {
                          const next = [...customFields]
                          next[idx] = { ...f, enabled: !f.enabled }
                          setCustomFields(next)
                        }}
                      >
                        <div className="toggle-thumb" style={{ left: f.enabled ? 21 : 3 }} />
                      </div>
                    </div>
                    <button className="btn btn-sm btn-danger" style={{ marginTop: 18 }}
                      onClick={() => setCustomFields(prev => prev.filter((_, i) => i !== idx))}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2" style={{ fontSize: '0.95rem', position: 'sticky', top: 8 }}>Live preview</h2>
            <div style={{ position: 'sticky', top: 36 }}>
              <MiniInvoicePreview
                theme={theme}
                sections={sections}
                templateId={templateId}
                biz={biz}
                stayOptions={stayOptions}
                customFields={customFields}
                invoiceTitle={biz.invoiceTitle || 'TAX INVOICE'}
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'tax' && (
        <div className="card">
          <h2 className="mb-2">Default Tax / GST</h2>
          <div className="form-grid cols-2 mb-4">
            <div className="field">
              <label>Tax Mode</label>
              <select value={taxMode} onChange={e => setTaxMode(e.target.value as any)}>
                <option value="none">No Tax</option>
                <option value="cgst_sgst">CGST + SGST</option>
                <option value="igst">IGST</option>
              </select>
            </div>
            <div className="field">
              <label>Default Rate (%)</label>
              <input type="number" min={0} max={28} step={0.5} value={taxRate}
                onChange={e => setTaxRate(Number(e.target.value))} disabled={taxMode === 'none'} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'data' && (
        <div className="card">
          <h2 className="mb-2">Backup & Restore</h2>
          <p className="text-sm text-muted mb-4">Logo, theme, stay options and invoices travel with the JSON backup.</p>
          <div className="flex gap-3 flex-wrap">
            <button className="btn btn-outline" onClick={handleExport}>Download Backup</button>
            <label className="btn btn-outline" style={{ cursor: 'pointer' }}>
              Import Backup
              <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </label>
          </div>
        </div>
      )}

      <div className="mt-4 no-print">
        <button className="btn btn-primary" onClick={save}>Save All Changes</button>
      </div>
    </div>
  )
}
