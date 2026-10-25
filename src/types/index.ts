export interface BusinessProfile {
  name: string
  tagline?: string
  address: string
  city: string
  state: string
  country: string
  pincode?: string
  phone: string
  email: string
  gstin?: string
  logoUrl?: string
  upiId?: string
  bankName?: string
  accountNumber?: string
  ifsc?: string
  website?: string
  defaultTerms?: string
  defaultNotes?: string
  /** Header title on invoice, e.g. TAX INVOICE */
  invoiceTitle?: string
}

export interface Client {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
  gstin?: string
  notes?: string
  createdAt: string
}

export interface Item {
  id: string
  name: string
  description?: string
  rate: number
  unit?: string
  sacCode?: string
  taxRate?: number
  category?: string
  isActive: boolean
}

export interface InvoiceItem {
  id: string
  itemId?: string
  description: string
  qty: number
  rate: number
  amount: number
  sacCode?: string
  taxRate?: number
  taxable?: boolean
}

export interface Payment {
  id: string
  amount: number
  method: 'cash' | 'upi' | 'bank' | 'card' | 'other'
  date: string
  reference?: string
  notes?: string
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'cancelled'
export type TaxMode = 'none' | 'cgst_sgst' | 'igst'
export type TemplateId = 'classic' | 'modern' | 'minimal' | 'bold' | 'compact'

export interface Invoice {
  id: string
  number: string
  status: InvoiceStatus
  clientId?: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  clientGstin?: string
  invoiceDate: string
  dueDate: string
  checkIn?: string
  checkOut?: string
  terms?: string
  notes?: string
  items: InvoiceItem[]
  subTotal: number
  discount?: number
  discountType?: 'percent' | 'fixed'
  taxMode?: TaxMode
  taxRate?: number
  cgstAmount?: number
  sgstAmount?: number
  igstAmount?: number
  taxAmount: number
  total: number
  amountInWords: string
  payments: Payment[]
  balanceDue: number
  createdAt: string
  updatedAt: string
  customFields?: Record<string, string>
  /** Selected stay / property */
  stayOption?: string
  templateId?: TemplateId
}

export interface InvoiceSectionToggles {
  showLogo: boolean
  showBusinessAddress: boolean
  showBusinessPhone: boolean
  showBusinessEmail: boolean
  showGstin: boolean
  showClientPhone: boolean
  showClientEmail: boolean
  showClientAddress: boolean
  showClientGstin: boolean
  showInvoiceDate: boolean
  showDueDate: boolean
  showCheckIn: boolean
  showCheckOut: boolean
  showTerms: boolean
  showCustomFields: boolean
  showStayOption: boolean
  showAmountInWords: boolean
  showBankDetails: boolean
  showUpi: boolean
  showNotes: boolean
  showPaymentHistory: boolean
  showThankYou: boolean
  showBalanceDue: boolean
}

export interface Theme {
  id: string
  name: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  textColor: string
  mutedColor: string
  backgroundColor: string
  tableHeaderBg: string
  fontFamily: string
  borderRadius: number
  logoStyle: 'circle' | 'rounded' | 'square'
  logoSize: number
}

export interface AppSettings {
  business: BusinessProfile
  invoicePrefix: string
  nextInvoiceNumber: number
  defaultTaxRate: number
  defaultTaxMode: TaxMode
  currency: string
  theme: Theme
  sections: InvoiceSectionToggles
  customFieldDefs: { key: string; label: string; enabled: boolean }[]
  /** List of stay/property options for the dropdown */
  stayOptions: string[]
  sectionOrder: string[]
  templateId: TemplateId
}


/* ─── Expenses module (separate from invoicing) ─── */

export interface ExpenseCategory {
  id: string
  name: string
  subcategories: string[]
  color?: string
  isActive: boolean
}

export interface Expense {
  id: string
  date: string
  amount: number
  categoryId: string
  subcategory?: string
  description: string
  paymentMethod: 'cash' | 'upi' | 'bank' | 'card' | 'other'
  reference?: string
  notes?: string
  createdAt: string
  updatedAt: string
}
