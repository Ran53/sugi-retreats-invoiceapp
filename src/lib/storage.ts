import type {
  AppSettings, BusinessProfile, Client, Invoice, Item, Theme, InvoiceSectionToggles,
  Expense, ExpenseCategory
} from '../types'
import { selectRows, upsertRow, deleteRow, reportSupabaseError } from './supabase'

const KEYS = {
  settings: 'farmstay_settings',
  clients: 'farmstay_clients',
  items: 'farmstay_items',
  invoices: 'farmstay_invoices',
  expenses: 'farmstay_expenses',
  expenseCategories: 'farmstay_expense_categories',
}

export const DEFAULT_THEME: Theme = {
  id: 'classic-green', name: 'Classic Green', primaryColor: '#2d6a4f', secondaryColor: '#40916c',
  accentColor: '#ffd60a', textColor: '#1a1a1a', mutedColor: '#5c6b66', backgroundColor: '#ffffff',
  tableHeaderBg: '#2d6a4f', fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 10,
  logoStyle: 'rounded', logoSize: 140,
}

export const DEFAULT_SECTIONS: InvoiceSectionToggles = {
  showLogo: true, showBusinessAddress: true, showBusinessPhone: true, showBusinessEmail: true,
  showGstin: true, showClientPhone: true, showClientEmail: true, showClientAddress: true,
  showClientGstin: true, showInvoiceDate: true, showDueDate: true, showCheckIn: true,
  showCheckOut: true, showTerms: true, showCustomFields: true, showStayOption: true,
  showAmountInWords: true, showBankDetails: false, showUpi: false, showNotes: true,
  showPaymentHistory: false, showThankYou: true, showBalanceDue: true,
}

export const DEFAULT_SECTION_ORDER = [
  'stayOption', 'customFields', 'items', 'totals', 'amountInWords', 'bankDetails',
  'upi', 'paymentHistory', 'notes',
]

export const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-utilities', name: 'Utilities', subcategories: ['Electricity', 'Water', 'Gas', 'Internet', 'Waste'], isActive: true, color: '#0ea5e9' },
  { id: 'cat-groceries', name: 'Groceries & Supplies', subcategories: ['Food', 'Cleaning', 'Toiletries', 'Kitchen'], isActive: true, color: '#22c55e' },
  { id: 'cat-marketing', name: 'Marketing', subcategories: ['Google Ads', 'Meta Ads', 'Instagram', 'Print', 'SEO'], isActive: true, color: '#a855f7' },
  { id: 'cat-ops', name: 'Operations', subcategories: ['Maintenance', 'Laundry', 'Staff', 'Transport'], isActive: true, color: '#f59e0b' },
  { id: 'cat-bizdev', name: 'Business Development', subcategories: ['Travel', 'Meetings', 'Partnerships', 'Legal'], isActive: true, color: '#ef4444' },
  { id: 'cat-software', name: 'Software & Tools', subcategories: ['Subscriptions', 'Hosting', 'Apps'], isActive: true, color: '#6366f1' },
  { id: 'cat-other', name: 'Other', subcategories: ['Miscellaneous'], isActive: true, color: '#94a3b8' },
]

export const DEFAULT_STAY_OPTIONS = [
  'Villa', 'Pool Cottage 1', 'Pool Cottage 2', 'Garden Cottage 1', 'Garden Cottage 2',
  'Dormitory 1', 'Dormitory 2',
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : fallback
  } catch { return fallback }
}

function save<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* cache is optional */ }
}

function buildDefaultSettings(business?: BusinessProfile): AppSettings {
  return {
    business: {
      invoiceTitle: 'TAX INVOICE',
      ...(business || { name: 'SUGI Retreats Farm Stay', address: 'Karnataka', city: 'Mysore', state: 'Karnataka', country: 'India', phone: '+919945513959', email: 'ranjansg3@gmail.com' }),
      invoiceTitle: (business as any)?.invoiceTitle || 'TAX INVOICE',
    },
    invoicePrefix: 'INV-', nextInvoiceNumber: 1, defaultTaxRate: 0, defaultTaxMode: 'none', currency: 'INR',
    theme: DEFAULT_THEME, sections: DEFAULT_SECTIONS,
    customFieldDefs: [
      { key: 'room', label: 'Room / Cottage', enabled: false },
      { key: 'guests', label: 'No. of Guests', enabled: true },
      { key: 'vehicle', label: 'Vehicle No.', enabled: false },
    ],
    stayOptions: [...DEFAULT_STAY_OPTIONS], sectionOrder: DEFAULT_SECTION_ORDER, templateId: 'classic',
  }
}

function normaliseSettings(input: AppSettings): AppSettings {
  const s: any = { ...input }
  s.theme = { ...DEFAULT_THEME, ...(s.theme || {}) }
  s.theme.logoSize = s.theme.logoSize == null || s.theme.logoSize < 120 ? 140 : s.theme.logoSize
  s.sections = { ...DEFAULT_SECTIONS, ...(s.sections || {}) }
  if ((s.sections as any).showCheckInOut != null) {
    s.sections.showCheckIn ??= (s.sections as any).showCheckInOut
    s.sections.showCheckOut ??= (s.sections as any).showCheckInOut
  }
  s.customFieldDefs ||= [
    { key: 'room', label: 'Room / Cottage', enabled: false },
    { key: 'guests', label: 'No. of Guests', enabled: true },
    { key: 'vehicle', label: 'Vehicle No.', enabled: false },
  ]
  s.stayOptions ||= [...DEFAULT_STAY_OPTIONS]
  s.sectionOrder ||= DEFAULT_SECTION_ORDER
  if (!s.sectionOrder.includes('stayOption')) s.sectionOrder = ['stayOption', ...s.sectionOrder]
  s.templateId ||= 'classic'
  s.defaultTaxMode ??= 'none'
  s.business ||= buildDefaultSettings().business
  s.business.invoiceTitle ||= 'TAX INVOICE'
  return s as AppSettings
}

async function syncSettings(settings: AppSettings) {
  try { await upsertRow('app_settings', { id: 1, data: settings, updated_at: new Date().toISOString() }) }
  catch (e) { reportSupabaseError('save settings', e) }
}

async function syncCollection<T extends { id: string }>(table: string, list: T[], previous: T[] = []) {
  try {
    const nextIds = new Set(list.map(x => x.id))
    await Promise.all(list.map(x => upsertRow(table, { id: x.id, data: x, updated_at: new Date().toISOString() })))
    await Promise.all(previous.filter(x => !nextIds.has(x.id)).map(x => deleteRow(table, x.id)))
  } catch (e) { reportSupabaseError(`save ${table}`, e) }
}

export async function seedIfNeeded() {
  // Supabase is the source of truth. localStorage is retained only as a temporary cache/offline fallback.
  try {
    const [settingsRows, clients, items, invoices, expenses, categories] = await Promise.all([
      selectRows<{ id: number; data: AppSettings }>('app_settings', 'select=id,data&limit=1'),
      selectRows<{ id: string; data: Client }>('clients'),
      selectRows<{ id: string; data: Item }>('items'),
      selectRows<{ id: string; data: Invoice }>('invoices'),
      selectRows<{ id: string; data: Expense }>('expenses'),
      selectRows<{ id: string; data: ExpenseCategory }>('expense_categories'),
    ])

    const localSettings = load<AppSettings | null>(KEYS.settings, null)
    const localClients = load<Client[]>(KEYS.clients, [])
    const localItems = load<Item[]>(KEYS.items, [])
    const localInvoices = load<Invoice[]>(KEYS.invoices, [])
    const localExpenses = load<Expense[]>(KEYS.expenses, [])
    const localCats = load<ExpenseCategory[]>(KEYS.expenseCategories, [])

    if (settingsRows.length) save(KEYS.settings, normaliseSettings(settingsRows[0].data))
    else {
      let settings = localSettings
      if (!settings) {
        try {
          const res = await fetch('/data/business.json')
          settings = buildDefaultSettings(res.ok ? await res.json() as BusinessProfile : undefined)
        } catch { settings = buildDefaultSettings() }
      }
      settings = normaliseSettings(settings)
      save(KEYS.settings, settings)
      await syncSettings(settings)
    }

    const remoteOrLocal = <T extends { id: string }>(rows: { id: string; data: T }[], local: T[]) => rows.length ? rows.map(r => r.data) : local
    const finalClients = remoteOrLocal(clients, localClients)
    let finalItems = remoteOrLocal(items, localItems)
    const finalInvoices = remoteOrLocal(invoices, localInvoices)
    const finalExpenses = remoteOrLocal(expenses, localExpenses)
    const finalCats = remoteOrLocal(categories, localCats.length ? localCats : DEFAULT_EXPENSE_CATEGORIES)

    if (!items.length && !localItems.length) {
      try {
        const res = await fetch('/data/items.json')
        if (res.ok) finalItems = await res.json() as Item[]
      } catch (e) { console.warn('Could not seed items', e) }
    }

    save(KEYS.clients, finalClients); save(KEYS.items, finalItems); save(KEYS.invoices, finalInvoices)
    save(KEYS.expenses, finalExpenses); save(KEYS.expenseCategories, finalCats)

    // First-run migration: upload existing local data when the corresponding cloud table was empty.
    if (!clients.length && localClients.length) await syncCollection('clients', localClients)
    if (!items.length && finalItems.length) await syncCollection('items', finalItems)
    if (!invoices.length && localInvoices.length) await syncCollection('invoices', localInvoices)
    if (!expenses.length && localExpenses.length) await syncCollection('expenses', localExpenses)
    if (!categories.length && finalCats.length) await syncCollection('expense_categories', finalCats)
  } catch (e) {
    console.warn('Supabase unavailable; using local cache.', e)
    if (!load<AppSettings | null>(KEYS.settings, null)) {
      save(KEYS.settings, buildDefaultSettings())
    }
    if (!load<ExpenseCategory[]>(KEYS.expenseCategories, []).length) save(KEYS.expenseCategories, DEFAULT_EXPENSE_CATEGORIES)
  }
}

export function getSettings(): AppSettings { return normaliseSettings(load<AppSettings>(KEYS.settings, buildDefaultSettings())) }
export function saveSettings(settings: AppSettings) { const next = normaliseSettings(settings); save(KEYS.settings, next); void syncSettings(next) }

export function getClients(): Client[] { return load<Client[]>(KEYS.clients, []) }
export function saveClients(clients: Client[]) { const previous = getClients(); save(KEYS.clients, clients); void syncCollection('clients', clients, previous) }
export function upsertClient(client: Client) { const list = getClients(); const idx = list.findIndex(c => c.id === client.id); if (idx >= 0) list[idx] = client; else list.push(client); saveClients(list); return client }

export function getItems(): Item[] { return load<Item[]>(KEYS.items, []) }
export function saveItems(items: Item[]) { const previous = getItems(); save(KEYS.items, items); void syncCollection('items', items, previous) }
export function upsertItem(item: Item) { const list = getItems(); const idx = list.findIndex(i => i.id === item.id); if (idx >= 0) list[idx] = item; else list.push(item); saveItems(list); return item }

export function getInvoices(): Invoice[] { return load<Invoice[]>(KEYS.invoices, []) }
export function saveInvoices(invoices: Invoice[]) { const previous = getInvoices(); save(KEYS.invoices, invoices); void syncCollection('invoices', invoices, previous) }
export function upsertInvoice(invoice: Invoice) { const list = getInvoices(); const idx = list.findIndex(i => i.id === invoice.id); if (idx >= 0) list[idx] = invoice; else list.unshift(invoice); saveInvoices(list); return invoice }
export function deleteInvoice(id: string) { const list = getInvoices(); const next = list.filter(i => i.id !== id); saveInvoices(next) }

export function getExpenseCategories(): ExpenseCategory[] { return load<ExpenseCategory[]>(KEYS.expenseCategories, DEFAULT_EXPENSE_CATEGORIES) }
export function saveExpenseCategories(cats: ExpenseCategory[]) { const previous = getExpenseCategories(); save(KEYS.expenseCategories, cats); void syncCollection('expense_categories', cats, previous) }
export function upsertExpenseCategory(cat: ExpenseCategory) { const list = getExpenseCategories(); const idx = list.findIndex(c => c.id === cat.id); if (idx >= 0) list[idx] = cat; else list.push(cat); saveExpenseCategories(list); return cat }
export function deleteExpenseCategory(id: string) { saveExpenseCategories(getExpenseCategories().filter(c => c.id !== id)) }

export function getExpenses(): Expense[] { return load<Expense[]>(KEYS.expenses, []) }
export function saveExpenses(expenses: Expense[]) { const previous = getExpenses(); save(KEYS.expenses, expenses); void syncCollection('expenses', expenses, previous) }
export function upsertExpense(expense: Expense) { const list = getExpenses(); const idx = list.findIndex(e => e.id === expense.id); if (idx >= 0) list[idx] = expense; else list.unshift(expense); saveExpenses(list); return expense }
export function deleteExpense(id: string) { saveExpenses(getExpenses().filter(e => e.id !== id)) }

export function exportAllData() {
  return { version: 5, exportedAt: new Date().toISOString(), settings: getSettings(), clients: getClients(), items: getItems(), invoices: getInvoices(), expenses: getExpenses(), expenseCategories: getExpenseCategories() }
}

export function importAllData(data: any) {
  if (data.settings) saveSettings(data.settings)
  if (data.clients) saveClients(data.clients)
  if (data.items) saveItems(data.items)
  if (data.invoices) saveInvoices(data.invoices)
  if (data.expenses) saveExpenses(data.expenses)
  if (data.expenseCategories) saveExpenseCategories(data.expenseCategories)
}

export function generateId(prefix = 'id') { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const rupees = Math.floor(num); const paise = Math.round((num - rupees) * 100)
  let words = 'Indian Rupee ' + convert(rupees)
  if (paise > 0) words += ' and ' + convert(paise) + ' Paise'
  return words + ' Only'
}
