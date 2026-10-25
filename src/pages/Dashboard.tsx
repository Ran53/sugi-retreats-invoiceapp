import type { AppSettings, Invoice, Client } from '../types'
import { formatCurrency } from '../lib/storage'

interface Props {
  settings: AppSettings
  invoices: Invoice[]
  clients: Client[]
  onNavigate: (page: any, id?: string) => void
}

export default function Dashboard({ settings, invoices, clients, onNavigate }: Props) {
  const totalRevenue = invoices
    .filter(i => i.status === 'paid' || i.status === 'partial')
    .reduce((sum, i) => sum + (i.total - i.balanceDue), 0)

  const outstanding = invoices
    .filter(i => i.balanceDue > 0 && i.status !== 'cancelled')
    .reduce((sum, i) => sum + i.balanceDue, 0)

  const thisMonth = invoices.filter(i => {
    const d = new Date(i.invoiceDate)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const recent = invoices.slice(0, 5)

  return (
    <div>
      <div className="card-header">
        <div>
          <h1>Dashboard</h1>
          <p className="text-muted text-sm">{settings.business.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate('create')}>
          + New Invoice
        </button>
      </div>

      <div className="form-grid cols-3" style={{ marginBottom: '1.5rem' }}>
        <div className="card">
          <div className="text-sm text-muted">Total Collected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
            {formatCurrency(totalRevenue)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Outstanding</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: outstanding > 0 ? 'var(--danger)' : 'var(--primary)' }}>
            {formatCurrency(outstanding)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-muted">Invoices this month</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{thisMonth}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Recent Invoices</h2>
          <button className="btn btn-outline btn-sm" onClick={() => onNavigate('invoices')}>View all</button>
        </div>
        {recent.length === 0 ? (
          <p className="text-muted">No invoices yet. Create your first one!</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => onNavigate('edit', inv.id)}>
                    <td>{inv.number}</td>
                    <td>{inv.clientName}</td>
                    <td>{inv.invoiceDate}</td>
                    <td>{formatCurrency(inv.total)}</td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="form-grid cols-2 mt-4">
        <div className="card">
          <h2 className="mb-2">Quick Stats</h2>
          <p className="text-sm text-muted">Clients: <strong>{clients.length}</strong></p>
          <p className="text-sm text-muted">Total invoices: <strong>{invoices.length}</strong></p>
        </div>
        <div className="card">
          <h2 className="mb-2">Tips</h2>
          <p className="text-sm text-muted">• Add frequent items in the Items page for one-click reuse.</p>
          <p className="text-sm text-muted">• Use Settings → Export to backup data across devices.</p>
        </div>
      </div>
    </div>
  )
}
