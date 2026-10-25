import { useState } from 'react'
import type { Item } from '../types'
import { upsertItem, generateId, getItems, saveItems } from '../lib/storage'
import { formatCurrency } from '../lib/storage'

interface Props {
  items: Item[]
  onChange: () => void
}

export default function ItemsPage({ items, onChange }: Props) {
  const [name, setName] = useState('')
  const [rate, setRate] = useState(0)
  const [category, setCategory] = useState('Stay')

  const add = () => {
    if (!name.trim()) return
    upsertItem({
      id: generateId('item'),
      name: name.trim(),
      rate,
      category,
      isActive: true,
      unit: 'unit',
    })
    setName(''); setRate(0)
    onChange()
  }

  const remove = (id: string) => {
    if (!confirm('Remove item from catalog?')) return
    saveItems(getItems().filter(i => i.id !== id))
    onChange()
  }

  return (
    <div>
      <div className="card-header">
        <h1>Items Catalog</h1>
        <p className="text-sm text-muted">Reusable items for quick billing (seeded from project files)</p>
      </div>

      <div className="card mb-4">
        <h2 className="mb-2">Add Item</h2>
        <div className="form-grid cols-3">
          <div className="field">
            <label>Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Stay / Breakfast" />
          </div>
          <div className="field">
            <label>Rate (₹)</label>
            <input type="number" value={rate} onChange={e => setRate(Number(e.target.value))} />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              <option>Stay</option>
              <option>Food</option>
              <option>Activity</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <button className="btn btn-primary mt-4" onClick={add}>Add to Catalog</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Category</th><th>Rate</th><th>SAC</th><th></th></tr>
            </thead>
            <tbody>
              {items.map(it => (
                <tr key={it.id}>
                  <td><strong>{it.name}</strong></td>
                  <td>{it.category}</td>
                  <td>{formatCurrency(it.rate)}</td>
                  <td>{it.sacCode || '—'}</td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => remove(it.id)}>Del</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
