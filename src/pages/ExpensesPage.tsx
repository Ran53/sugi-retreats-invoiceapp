import { useMemo, useState } from 'react'
import type { Expense, ExpenseCategory } from '../types'
import {
  getExpenses, upsertExpense, deleteExpense,
  getExpenseCategories, upsertExpenseCategory, deleteExpenseCategory,
  generateId, formatCurrency,
} from '../lib/storage'

interface Props {
  onChange: () => void
}

type Tab = 'list' | 'categories'

export default function ExpensesPage({ onChange }: Props) {
  const [tab, setTab] = useState<Tab>('list')
  const [expenses, setExpenses] = useState<Expense[]>(() => getExpenses())
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => getExpenseCategories())
  const [editing, setEditing] = useState<Expense | null>(null)
  const [showForm, setShowForm] = useState(false)

  // form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '')
  const [subcategory, setSubcategory] = useState('')
  const [description, setDescription] = useState('')
  const [method, setMethod] = useState<Expense['paymentMethod']>('upi')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')

  // category form
  const [catName, setCatName] = useState('')
  const [catSubs, setCatSubs] = useState('')
  const [editingCat, setEditingCat] = useState<ExpenseCategory | null>(null)

  // filters
  const [filterCat, setFilterCat] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  const refresh = () => {
    setExpenses(getExpenses())
    setCategories(getExpenseCategories())
    onChange()
  }

  const activeCats = categories.filter(c => c.isActive)
  const selectedCat = categories.find(c => c.id === categoryId)

  const filtered = useMemo(() => {
    return expenses.filter(e => {
      if (filterCat && e.categoryId !== filterCat) return false
      if (filterFrom && e.date < filterFrom) return false
      if (filterTo && e.date > filterTo) return false
      return true
    })
  }, [expenses, filterCat, filterFrom, filterTo])

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0)

  const openNew = () => {
    setEditing(null)
    setDate(new Date().toISOString().slice(0, 10))
    setAmount('')
    setCategoryId(activeCats[0]?.id || '')
    setSubcategory('')
    setDescription('')
    setMethod('upi')
    setReference('')
    setNotes('')
    setShowForm(true)
  }

  const openEdit = (e: Expense) => {
    setEditing(e)
    setDate(e.date)
    setAmount(String(e.amount))
    setCategoryId(e.categoryId)
    setSubcategory(e.subcategory || '')
    setDescription(e.description)
    setMethod(e.paymentMethod)
    setReference(e.reference || '')
    setNotes(e.notes || '')
    setShowForm(true)
  }

  const saveExpense = () => {
    const amt = Number(amount)
    if (!amt || amt <= 0) {
      alert('Enter a valid amount')
      return
    }
    if (!categoryId) {
      alert('Select a category')
      return
    }
    if (!description.trim()) {
      alert('Add a short description')
      return
    }
    const exp: Expense = {
      id: editing?.id || generateId('exp'),
      date,
      amount: amt,
      categoryId,
      subcategory: subcategory || undefined,
      description: description.trim(),
      paymentMethod: method,
      reference: reference || undefined,
      notes: notes || undefined,
      createdAt: editing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    upsertExpense(exp)
    refresh()
    setShowForm(false)
  }

  const removeExpense = (id: string) => {
    if (!confirm('Delete this expense?')) return
    deleteExpense(id)
    refresh()
  }

  const saveCategory = () => {
    if (!catName.trim()) {
      alert('Category name required')
      return
    }
    const subs = catSubs.split(',').map(s => s.trim()).filter(Boolean)
    const cat: ExpenseCategory = {
      id: editingCat?.id || generateId('cat'),
      name: catName.trim(),
      subcategories: subs,
      isActive: editingCat?.isActive ?? true,
      color: editingCat?.color || '#64748b',
    }
    upsertExpenseCategory(cat)
    refresh()
    setEditingCat(null)
    setCatName('')
    setCatSubs('')
  }

  const startEditCat = (c: ExpenseCategory) => {
    setEditingCat(c)
    setCatName(c.name)
    setCatSubs(c.subcategories.join(', '))
  }

  const removeCat = (id: string) => {
    if (!confirm('Delete this category? Existing expenses keep the old category id.')) return
    deleteExpenseCategory(id)
    refresh()
  }

  const catNameOf = (id: string) => categories.find(c => c.id === id)?.name || '—'

  return (
    <div>
      <div className="card-header">
        <div>
          <h1>Expenses</h1>
          <p className="text-sm text-muted">Track farm-stay costs separately from invoices</p>
        </div>
        {tab === 'list' && (
          <button className="btn btn-primary" onClick={openNew}>+ Add Expense</button>
        )}
      </div>

      <div className="settings-tabs no-print mb-4">
        <button className={tab === 'list' ? 'active' : ''} onClick={() => setTab('list')}>Expenses</button>
        <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Categories</button>
      </div>

      {tab === 'list' && (
        <>
          {/* Filters */}
          <div className="card mb-4">
            <div className="form-grid cols-3">
              <div className="field">
                <label>Category</label>
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                  <option value="">All</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label>From</label>
                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
              </div>
              <div className="field">
                <label>To</label>
                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
              </div>
            </div>
            <div className="mt-3" style={{ fontWeight: 650 }}>
              Total: {formatCurrency(totalFiltered)}
              <span className="text-sm text-muted" style={{ fontWeight: 400, marginLeft: 8 }}>
                ({filtered.length} entries)
              </span>
            </div>
          </div>

          {/* Form */}
          {showForm && (
            <div className="card mb-4" style={{ borderColor: 'var(--primary)' }}>
              <h2 className="mb-3">{editing ? 'Edit expense' : 'New expense'}</h2>
              <div className="form-grid cols-2">
                <div className="field">
                  <label>Date</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)} />
                </div>
                <div className="field">
                  <label>Amount (₹)</label>
                  <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className="field">
                  <label>Category</label>
                  <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setSubcategory('') }}>
                    {activeCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Subcategory</label>
                  <select value={subcategory} onChange={e => setSubcategory(e.target.value)}>
                    <option value="">—</option>
                    {(selectedCat?.subcategories || []).map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. BESCOM bill Oct" />
                </div>
                <div className="field">
                  <label>Payment method</label>
                  <select value={method} onChange={e => setMethod(e.target.value as Expense['paymentMethod'])}>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="bank">Bank</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Reference</label>
                  <input value={reference} onChange={e => setReference(e.target.value)} placeholder="Txn ID / bill no." />
                </div>
                <div className="field" style={{ gridColumn: '1 / -1' }}>
                  <label>Notes</label>
                  <input value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-primary" onClick={saveExpense}>Save</button>
                <button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </div>
          )}

          {/* List */}
          <div className="card">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted">No expenses yet. Add your first one.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Method</th>
                      <th className="text-right">Amount</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(e => (
                      <tr key={e.id}>
                        <td>{e.date}</td>
                        <td>
                          <div style={{ fontWeight: 550 }}>{e.description}</div>
                          {e.subcategory && <div className="text-sm text-muted">{e.subcategory}</div>}
                        </td>
                        <td>{catNameOf(e.categoryId)}</td>
                        <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{e.paymentMethod}</td>
                        <td className="text-right" style={{ fontWeight: 650 }}>{formatCurrency(e.amount)}</td>
                        <td>
                          <div className="flex gap-2">
                            <button className="btn btn-sm btn-outline" onClick={() => openEdit(e)}>Edit</button>
                            <button className="btn btn-sm btn-danger" onClick={() => removeExpense(e.id)}>Del</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'categories' && (
        <>
          <div className="card mb-4">
            <h2 className="mb-3">{editingCat ? 'Edit category' : 'Add category'}</h2>
            <div className="form-grid cols-2">
              <div className="field">
                <label>Name</label>
                <input value={catName} onChange={e => setCatName(e.target.value)} placeholder="e.g. Utilities" />
              </div>
              <div className="field">
                <label>Subcategories (comma-separated)</label>
                <input value={catSubs} onChange={e => setCatSubs(e.target.value)} placeholder="Electricity, Water, Gas" />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="btn btn-primary" onClick={saveCategory}>
                {editingCat ? 'Update' : 'Add category'}
              </button>
              {editingCat && (
                <button className="btn btn-outline" onClick={() => { setEditingCat(null); setCatName(''); setCatSubs('') }}>
                  Cancel
                </button>
              )}
            </div>
          </div>

          <div className="card">
            {categories.map(c => (
              <div key={c.id} className="cf-card">
                <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 650, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 99, background: c.color || '#94a3b8', display: 'inline-block' }} />
                      {c.name}
                      {!c.isActive && <span className="badge badge-draft">Inactive</span>}
                    </div>
                    <div className="text-sm text-muted mt-1">
                      {c.subcategories.length ? c.subcategories.join(' · ') : 'No subcategories'}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-outline" onClick={() => startEditCat(c)}>Edit</button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() => {
                        upsertExpenseCategory({ ...c, isActive: !c.isActive })
                        refresh()
                      }}
                    >
                      {c.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeCat(c.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
