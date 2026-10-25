import type {
  AppSettings, BusinessProfile, Client, Invoice, Item, Theme, InvoiceSectionToggles,
  Expense, ExpenseCategory
} from '../types'

const KEYS = {
  settings: 'farmstay_settings',
  clients: 'farmstay_clients',
  items: 'farmstay_items',
  invoices: 'farmstay_invoices',
  expenses: 'farmstay_expenses',
  expenseCategories: 'farmstay_expense_categories',
}

export const DEFAULT_THEME: Theme = {
  id: 'classic-green',
  name: 'Classic Green',
  primaryColor: '#2d6a4f',
  secondaryColor: '#40916c',
  accentColor: '#ffd60a',
  textColor: '#1a1a1a',
  mutedColor: '#5c6b66',
  backgroundColor: '#ffffff',
  tableHeaderBg: '#2d6a4f',
  fontFamily: 'Inter, system-ui, sans-serif',
  borderRadius: 10,
  logoStyle: 'rounded',
  logoSize: 140,
}

export const DEFAULT_SECTIONS: InvoiceSectionToggles = {
  showLogo: true,
  showBusinessAddress: true,
  showBusinessPhone: true,
  showBusinessEmail: true,
  showGstin: true,
  showClientPhone: true,
  showClientEmail: true,
  showClientAddress: true,
  showClientGstin: true,
  showInvoiceDate: true,
  showDueDate: true,
  showCheckIn: true,
  showCheckOut: true,
  showTerms: true,
  showCustomFields: true,
  showStayOption: true,
  showAmountInWords: true,
  showBankDetails: false,
  showUpi: false,
  showNotes: true,
  showPaymentHistory: false,
  showThankYou: true,
  showBalanceDue: true,
}

export const DEFAULT_SECTION_ORDER = [
  'stayOption',
  'customFields',
  'items',
  'totals',
  'amountInWords',
  'bankDetails',
  'upi',
  'paymentHistory',
  'notes',
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
  'Villa',
  'Pool Cottage 1',
  'Pool Cottage 2',
  'Garden Cottage 1',
  'Garden Cottage 2',
  'Dormitory 1',
  'Dormitory 2',
]

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function save<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function buildDefaultSettings(business?: BusinessProfile): AppSettings {
  return {
    business: {
      invoiceTitle: 'TAX INVOICE',
      ...(business || {
        name: 'SUGI Retreats Farm Stay',
        address: 'Karnataka',
        city: 'Mysore',
        state: 'Karnataka',
        country: 'India',
        phone: '+919945513959',
        email: 'ranjansg3@gmail.com',
      }),
      invoiceTitle: (business as any)?.invoiceTitle || 'TAX INVOICE',
    },
    invoicePrefix: 'INV-',
    nextInvoiceNumber: 1,
    defaultTaxRate: 0,
    defaultTaxMode: 'none',
    currency: 'INR',
    theme: DEFAULT_THEME,
    sections: DEFAULT_SECTIONS,
    customFieldDefs: [
      { key: 'room', label: 'Room / Cottage', enabled: false },
      { key: 'guests', label: 'No. of Guests', enabled: true },
      { key: 'vehicle', label: 'Vehicle No.', enabled: false },
    ],
    stayOptions: [...DEFAULT_STAY_OPTIONS],
    sectionOrder: DEFAULT_SECTION_ORDER,
    templateId: 'classic',
  }
}

export async function seedIfNeeded() {
  const existingCats = load<ExpenseCategory[]>(KEYS.expenseCategories, [])
  if (existingCats.length === 0) {
    save(KEYS.expenseCategories, DEFAULT_EXPENSE_CATEGORIES)
  }

  const existingItems = load<Item[]>(KEYS.items, [])
  if (existingItems.length === 0) {
    try {
      const res = await fetch('/data/items.json')
      if (res.ok) save(KEYS.items, await res.json())
    } catch (e) {
      console.warn('Could not seed items', e)
    }
  }

  const existing = load<AppSettings | null>(KEYS.settings, null)
  if (!existing) {
    try {
      const res = await fetch('/data/business.json')
      const business = res.ok ? (await res.json()) as BusinessProfile : undefined
      save(KEYS.settings, buildDefaultSettings(business))
    } catch {
      save(KEYS.settings, buildDefaultSettings())
    }
  } else {
    const s = existing as any
    if (!s.theme) s.theme = DEFAULT_THEME
    if (s.theme && (s.theme.logoSize == null || s.theme.logoSize < 120)) s.theme.logoSize = 140
    if (!s.sections) s.sections = DEFAULT_SECTIONS
    else {
      s.sections = { ...DEFAULT_SECTIONS, ...s.sections }
      if ((s.sections as any).showCheckInOut != null && s.sections.showCheckIn == null) {
        s.sections.showCheckIn = (s.sections as any).showCheckInOut
        s.sections.showCheckOut = (s.sections as any).showCheckInOut
      }
      if (s.sections.showStayOption == null) s.sections.showStayOption = true
    }
    if (!s.customFieldDefs) {
      s.customFieldDefs = [
        { key: 'room', label: 'Room / Cottage', enabled: false },
        { key: 'guests', label: 'No. of Guests', enabled: true },
        { key: 'vehicle', label: 'Vehicle No.', enabled: false },
      ]
    }
    if (!s.stayOptions) s.stayOptions = [...DEFAULT_STAY_OPTIONS]
    if (!s.sectionOrder) s.sectionOrder = DEFAULT_SECTION_ORDER
    else if (!s.sectionOrder.includes('stayOption')) {
      s.sectionOrder = ['stayOption', ...s.sectionOrder]
    }
    if (!s.templateId) s.templateId = 'classic'
    if (s.defaultTaxMode === undefined) s.defaultTaxMode = 'none'
    if (!s.business.invoiceTitle) s.business.invoiceTitle = 'TAX INVOICE'
    save(KEYS.settings, s)
  }
}

export function getSettings(): AppSettings {
  return load<AppSettings>(KEYS.settings, buildDefaultSettings())
}

export function saveSettings(settings: AppSettings) {
  save(KEYS.settings, settings)
}

export function getClients(): Client[] {
  return load<Client[]>(KEYS.clients, [])
}
export function saveClients(clients: Client[]) {
  save(KEYS.clients, clients)
}
export function upsertClient(client: Client) {
  const clients = getClients()
  const idx = clients.findIndex(c => c.id === client.id)
  if (idx >= 0) clients[idx] = client
  else clients.push(client)
  saveClients(clients)
  return client
}

export function getItems(): Item[] {
  return load<Item[]>(KEYS.items, [])
}
export function saveItems(items: Item[]) {
  save(KEYS.items, items)
}
export function upsertItem(item: Item) {
  const items = getItems()
  const idx = items.findIndex(i => i.id === item.id)
  if (idx >= 0) items[idx] = item
  else items.push(item)
  saveItems(items)
  return item
}

export function getInvoices(): Invoice[] {
  return load<Invoice[]>(KEYS.invoices, [])
}
export function saveInvoices(invoices: Invoice[]) {
  save(KEYS.invoices, invoices)
}
export function upsertInvoice(invoice: Invoice) {
  const invoices = getInvoices()
  const idx = invoices.findIndex(i => i.id === invoice.id)
  if (idx >= 0) invoices[idx] = invoice
  else invoices.unshift(invoice)
  saveInvoices(invoices)
  return invoice
}
export function deleteInvoice(id: string) {
  saveInvoices(getInvoices().filter(i => i.id !== id))
}


export function getExpenseCategories(): ExpenseCategory[] {
  return load<ExpenseCategory[]>(KEYS.expenseCategories, DEFAULT_EXPENSE_CATEGORIES)
}
export function saveExpenseCategories(cats: ExpenseCategory[]) {
  save(KEYS.expenseCategories, cats)
}
export function upsertExpenseCategory(cat: ExpenseCategory) {
  const cats = getExpenseCategories()
  const idx = cats.findIndex(c => c.id === cat.id)
  if (idx >= 0) cats[idx] = cat
  else cats.push(cat)
  saveExpenseCategories(cats)
  return cat
}
export function deleteExpenseCategory(id: string) {
  saveExpenseCategories(getExpenseCategories().filter(c => c.id !== id))
}

export function getExpenses(): Expense[] {
  return load<Expense[]>(KEYS.expenses, [])
}
export function saveExpenses(expenses: Expense[]) {
  save(KEYS.expenses, expenses)
}
export function upsertExpense(expense: Expense) {
  const list = getExpenses()
  const idx = list.findIndex(e => e.id === expense.id)
  if (idx >= 0) list[idx] = expense
  else list.unshift(expense)
  saveExpenses(list)
  return expense
}
export function deleteExpense(id: string) {
  saveExpenses(getExpenses().filter(e => e.id !== id))
}

export function exportAllData() {
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    settings: getSettings(),
    clients: getClients(),
    items: getItems(),
    invoices: getInvoices(),
    expenses: getExpenses(),
    expenseCategories: getExpenseCategories(),
  }
}
export function importAllData(data: any) {
  if (data.settings) saveSettings(data.settings)
  if (data.clients) saveClients(data.clients)
  if (data.items) saveItems(data.items)
  if (data.invoices) saveInvoices(data.invoices)
  if (data.expenses) saveExpenses(data.expenses)
  if (data.expenseCategories) saveExpenseCategories(data.expenseCategories)
}

export function generateId(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function numberToWords(num: number): string {
  if (num === 0) return 'Zero Rupees Only'
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
  function convert(n: number): string {
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' and ' + convert(n % 100) : '')
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + convert(n % 1000) : '')
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + convert(n % 100000) : '')
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + convert(n % 10000000) : '')
  }
  const rupees = Math.floor(num)
  const paise = Math.round((num - rupees) * 100)
  let words = 'Indian Rupee ' + convert(rupees)
  if (paise > 0) words += ' and ' + convert(paise) + ' Paise'
  return words + ' Only'
}
