const SUPABASE_URL = 'https://eefhiebpbeksrbiltpww.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fwv9zOjwJ9eilPYuyps2sg__ScYcpEa'

export const SUPABASE_CONFIG = { url: SUPABASE_URL }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('apikey', SUPABASE_PUBLISHABLE_KEY)
  headers.set('Authorization', `Bearer ${SUPABASE_PUBLISHABLE_KEY}`)
  headers.set('Content-Type', 'application/json')
  headers.set('Accept', 'application/json')

  const response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Supabase ${response.status}: ${text}`)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return text ? JSON.parse(text) as T : undefined as T
}

export async function selectRows<T>(table: string, query = 'select=*'): Promise<T[]> {
  return request<T[]>(`${table}?${query}`)
}

export async function upsertRow<T extends Record<string, unknown>>(table: string, row: T): Promise<void> {
  await request(`${table}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(row),
  })
}

export async function deleteRow(table: string, id: string): Promise<void> {
  await request(`${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })
}

export function reportSupabaseError(operation: string, error: unknown) {
  console.error(`[Supabase] ${operation} failed`, error)
}
