import { useEffect, useState } from 'react'
import { seedIfNeeded, getSettings, getInvoices, getClients, getItems, saveSettings } from './lib/storage'
import type { Invoice, Client, Item, AppSettings } from './types'
import Dashboard from './pages/Dashboard'
import InvoiceList from './pages/InvoiceList'
import InvoiceEditor from './pages/InvoiceEditor'
import ClientsPage from './pages/ClientsPage'
import ItemsPage from './pages/ItemsPage'
import SettingsPage from './pages/SettingsPage'
import ExpensesPage from './pages/ExpensesPage'

type Page = 'dashboard' | 'invoices' | 'create' | 'edit' | 'clients' | 'items' | 'expenses' | 'settings'

const INVOICE_GROUP: Page[] = ['invoices', 'create', 'edit', 'clients', 'items']

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [ready, setReady] = useState(false)
  const [invoiceOpen, setInvoiceOpen] = useState(true)

  const refresh = () => {
    const s = getSettings()
    // One-time cleanup of old hardcoded default notes
    if (s.business?.defaultNotes === 'Thanks for your business.') {
      s.business.defaultNotes = 'Thank you and visit again.'
      saveSettings(s)
    }
    setSettings(s)
    setInvoices(getInvoices())
    setClients(getClients())
    setItems(getItems())
  }

  useEffect(() => {
    seedIfNeeded().then(() => {
      refresh()
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (INVOICE_GROUP.includes(page)) setInvoiceOpen(true)
  }, [page])

  const navigate = (p: Page, id?: string) => {
    setPage(p)
    setEditingId(id || null)
  }

  if (!ready || !settings) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#5c6b66' }}>
        Loading FarmStay Invoice…
      </div>
    )
  }

  const isInvoiceSection = INVOICE_GROUP.includes(page)

  const NavBtn = ({
    id, label, icon, nested,
  }: { id: Page; label: string; icon: string; nested?: boolean }) => (
    <button
      className={`nav-item ${page === id || (page === 'edit' && id === 'invoices') ? 'active' : ''} ${nested ? 'nav-nested' : ''}`}
      onClick={() => navigate(id)}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )

  const sidebarNav = (
    <nav>
      <NavBtn id="dashboard" label="Dashboard" icon="📊" />

      <button
        className={`nav-item nav-group-toggle ${isInvoiceSection ? 'active-group' : ''}`}
        onClick={() => setInvoiceOpen(o => !o)}
        aria-expanded={invoiceOpen}
      >
        <span>🧾</span>
        <span style={{ flex: 1, textAlign: 'left' }}>Invoices</span>
        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{invoiceOpen ? '▾' : '▸'}</span>
      </button>

      {invoiceOpen && (
        <div className="nav-group">
          <NavBtn id="invoices" label="All Invoices" icon="📋" nested />
          <NavBtn id="create" label="New Invoice" icon="➕" nested />
          <NavBtn id="clients" label="Clients" icon="👥" nested />
          <NavBtn id="items" label="Items" icon="🧺" nested />
        </div>
      )}

      <NavBtn id="expenses" label="Expenses" icon="💸" />
      <NavBtn id="settings" label="Settings" icon="⚙️" />
    </nav>
  )

  const mobileItems: { id: Page; label: string }[] = [
    { id: 'dashboard', label: 'Home' },
    { id: 'invoices', label: 'Invoices' },
    { id: 'create', label: 'New' },
    { id: 'clients', label: 'Clients' },
    { id: 'items', label: 'Items' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'settings', label: 'Settings' },
  ]

  return (
    <div className="app-shell">
      <header className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className="sidebar-logo" style={{ width: 32, height: 32, fontSize: '0.75rem' }}>SUGI</div>
          <strong>FarmStay Invoice</strong>
        </div>
        <button
          className="btn btn-sm"
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
          onClick={() => navigate('create')}
        >
          + New
        </button>
      </header>

      <nav className="mobile-nav">
        {mobileItems.map(n => (
          <button
            key={n.id}
            className={page === n.id || (page === 'edit' && n.id === 'invoices') ? 'active' : ''}
            onClick={() => navigate(n.id)}
          >
            {n.label}
          </button>
        ))}
      </nav>

      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="sidebar-logo">SUGI</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>FarmStay</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>Invoice Maker</div>
          </div>
        </div>
        {sidebarNav}
      </aside>

      <main className="main-content">
        {page === 'dashboard' && (
          <Dashboard settings={settings} invoices={invoices} clients={clients} onNavigate={navigate} />
        )}
        {page === 'invoices' && (
          <InvoiceList
            invoices={invoices}
            onEdit={(id) => navigate('edit', id)}
            onCreate={() => navigate('create')}
            onRefresh={refresh}
          />
        )}
        {(page === 'create' || page === 'edit') && (
          <InvoiceEditor
            invoiceId={editingId}
            settings={settings}
            clients={clients}
            items={items}
            onSave={() => { refresh(); navigate('invoices') }}
            onCancel={() => navigate('invoices')}
            onSettingsChange={refresh}
          />
        )}
        {page === 'clients' && <ClientsPage clients={clients} onChange={refresh} />}
        {page === 'items' && <ItemsPage items={items} onChange={refresh} />}
        {page === 'expenses' && <ExpensesPage onChange={refresh} />}
        {page === 'settings' && <SettingsPage settings={settings} onChange={refresh} />}
      </main>
    </div>
  )
}
