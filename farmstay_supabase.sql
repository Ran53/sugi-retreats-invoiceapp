-- SUGI FarmStay Invoice - Supabase schema
-- IMPORTANT: This app intentionally has NO login/authentication.
-- The policies below make the app data publicly readable/writable to anyone
-- who has the Supabase project URL/key. Do not use this setup for sensitive data.

create table if not exists public.app_settings (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.items (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  data jsonb not null,
  invoice_number text,
  updated_at timestamptz not null default now()
);

create index if not exists invoices_invoice_number_idx on public.invoices(invoice_number);

create table if not exists public.expense_categories (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id text primary key,
  data jsonb not null,
  expense_date date,
  updated_at timestamptz not null default now()
);

-- Public access because this installation intentionally has no authentication.
alter table public.app_settings enable row level security;
alter table public.clients enable row level security;
alter table public.items enable row level security;
alter table public.invoices enable row level security;
alter table public.expense_categories enable row level security;
alter table public.expenses enable row level security;

drop policy if exists "public read app_settings" on public.app_settings;
drop policy if exists "public write app_settings" on public.app_settings;
drop policy if exists "public read clients" on public.clients;
drop policy if exists "public write clients" on public.clients;
drop policy if exists "public read items" on public.items;
drop policy if exists "public write items" on public.items;
drop policy if exists "public read invoices" on public.invoices;
drop policy if exists "public write invoices" on public.invoices;
drop policy if exists "public read expense_categories" on public.expense_categories;
drop policy if exists "public write expense_categories" on public.expense_categories;
drop policy if exists "public read expenses" on public.expenses;
drop policy if exists "public write expenses" on public.expenses;

create policy "public read app_settings" on public.app_settings for select using (true);
create policy "public write app_settings" on public.app_settings for all using (true) with check (true);
create policy "public read clients" on public.clients for select using (true);
create policy "public write clients" on public.clients for all using (true) with check (true);
create policy "public read items" on public.items for select using (true);
create policy "public write items" on public.items for all using (true) with check (true);
create policy "public read invoices" on public.invoices for select using (true);
create policy "public write invoices" on public.invoices for all using (true) with check (true);
create policy "public read expense_categories" on public.expense_categories for select using (true);
create policy "public write expense_categories" on public.expense_categories for all using (true) with check (true);
create policy "public read expenses" on public.expenses for select using (true);
create policy "public write expenses" on public.expenses for all using (true) with check (true);

-- Helpful grants for the browser client.
grant usage on schema public to anon;
grant select, insert, update, delete on public.app_settings to anon;
grant select, insert, update, delete on public.clients to anon;
grant select, insert, update, delete on public.items to anon;
grant select, insert, update, delete on public.invoices to anon;
grant select, insert, update, delete on public.expense_categories to anon;
grant select, insert, update, delete on public.expenses to anon;
