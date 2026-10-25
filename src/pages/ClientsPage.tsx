import { useState } from 'react'
import type { Client } from '../types'
import { upsertClient, generateId, getClients, saveClients } from '../lib/storage'

interface Props {
  clients: Client[]
  onChange: () => void
}

export default function ClientsPage({ clients, onChange }: Props) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const add = () => {
    if (!name.trim()) return
    upsertClient({
      id: generateId('cli'),
      name: name.trim(),
      phone,
      email,
      createdAt: new Date().toISOString(),
    })
    setName(''); setPhone(''); setEmail('')
    onChange()
  }

  const remove = (id: string) => {
    if (!confirm('Remove client?')) return
    saveClients(getClients().filter(c => c.id !== id))
    onChange()
  }

  return (
    <div>
      <div className="card-header">
        <h1>Clients</h1>
      </div>

      <div className="card mb-4">
        <h2 className="mb-2">Add Client</h2>
        <div className="form-grid cols-3">
          <div className="field">
            <label>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Mr. Babu" />
          </div>
          <div className="field">
            <label>Phone</label>
            <input value={phone} onChange={e => setPhone(e.target.value)} />
          </div>
          <div className="field">
            <label>Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)} />
          </div>
        </div>
        <button className="btn btn-primary mt-4" onClick={add}>Add Client</button>
      </div>

      <div className="card">
        {clients.length === 0 ? (
          <p className="text-muted">No clients yet. They are also auto-saved when you create invoices.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Phone</th><th>Email</th><th></th></tr>
              </thead>
              <tbody>
                {clients.map(c => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.phone || '—'}</td>
                    <td>{c.email || '—'}</td>
                    <td><button className="btn btn-sm btn-danger" onClick={() => remove(c.id)}>Del</button></td>
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
