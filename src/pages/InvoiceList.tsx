import type { Invoice } from '../types'
import { formatCurrency, deleteInvoice } from '../lib/storage'

interface Props {
  invoices: Invoice[]
  onEdit: (id: string) => void
  onCreate: () => void
  onRefresh: () => void
}

export default function InvoiceList({ invoices, onEdit, onCreate, onRefresh }: Props) {
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Delete this invoice?')) {
      deleteInvoice(id)
      onRefresh()
    }
  }

  return (
    <div>
      <div className="card-header">
        <h1>Invoices</h1>
        <button className="btn btn-primary" onClick={onCreate}>+ New Invoice</button>
      </div>

      <div className="card">
        {invoices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p className="text-muted mb-4">No invoices yet.</p>
            <button className="btn btn-primary" onClick={onCreate}>Create first invoice</button>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Client</th>
                  <th>Check-in</th>
                  <th>Total</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ cursor: 'pointer' }} onClick={() => onEdit(inv.id)}>
                    <td><strong>{inv.number}</strong></td>
                    <td>{inv.clientName}</td>
                    <td>{inv.checkIn || '—'}</td>
                    <td>{formatCurrency(inv.total)}</td>
                    <td>{formatCurrency(inv.balanceDue)}</td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                    <td>
                      <button className="btn btn-sm btn-danger" onClick={(e) => handleDelete(inv.id, e)}>Del</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
