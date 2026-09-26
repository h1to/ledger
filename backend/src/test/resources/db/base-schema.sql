-- Test/local base schema: the 11 planner tables that already exist in production Supabase, in an
-- auth-free, portable form (no auth.users FK, no RLS — which the backend replaces). Testcontainers
-- applies this before the app starts; Flyway (baselined at 0) then adds users + advisor_reports.
-- The only inter-table FK from the production schema that matters to write/delete ordering —
-- contributions -> goals — is preserved here so the ordering logic is actually exercised.

create table if not exists public.settings (
  user_id       uuid primary key,
  year          integer not null default extract(year from now()),
  base_cur      text not null default 'KZT',
  rates_updated bigint,
  tour_done     boolean not null default false,
  last_modified bigint,
  updated_at    timestamptz not null default now()
);

create table if not exists public.currency_rates (
  user_id  uuid not null,
  currency text not null,
  rate     numeric not null,
  primary key (user_id, currency)
);

create table if not exists public.months (
  user_id   uuid not null,
  month_key text not null,
  closed    boolean not null default false,
  leftover  numeric,
  primary key (user_id, month_key)
);

create table if not exists public.incomes (
  id        text primary key,
  user_id   uuid not null,
  month_key text not null,
  name      text not null default '',
  amount    numeric not null default 0,
  cur       text not null default 'KZT'
);
create index if not exists incomes_user_month on public.incomes (user_id, month_key);

create table if not exists public.expenses (
  id        text primary key,
  user_id   uuid not null,
  month_key text not null,
  name      text not null default '',
  category  text not null default 'Other',
  planned   numeric not null default 0,
  actual    numeric not null default 0,
  cur       text not null default 'KZT'
);
create index if not exists expenses_user_month on public.expenses (user_id, month_key);

create table if not exists public.rec_actuals (
  user_id      uuid not null,
  month_key    text not null,
  recurring_id text not null,
  amount       numeric not null,
  primary key (user_id, month_key, recurring_id)
);

create table if not exists public.recurring (
  id        text primary key,
  user_id   uuid not null,
  name      text not null default '',
  type      text not null check (type in ('expense', 'income')),
  category  text not null default 'Other',
  amount    numeric not null default 0,
  cur       text not null default 'KZT',
  start_key text not null,
  end_key   text
);
create index if not exists recurring_user on public.recurring (user_id);

create table if not exists public.loans (
  id          text primary key,
  user_id     uuid not null,
  name        text not null default '',
  payment     numeric not null default 0,
  cur         text not null default 'KZT',
  start_key   text not null,
  end_key     text not null,
  rate        numeric,
  overpayment numeric,
  bank        text,
  debt        numeric,
  contract    text,
  kind        text,
  source      text not null default 'manual'
);
create index if not exists loans_user on public.loans (user_id);

create table if not exists public.goals (
  id           text primary key,
  user_id      uuid not null,
  name         text not null default '',
  target       numeric not null default 0,
  deadline_key text
);
create index if not exists goals_user on public.goals (user_id);

create table if not exists public.contributions (
  user_id   uuid not null,
  goal_id   text not null references public.goals (id) on delete cascade,
  month_key text not null,
  amount    numeric not null,
  primary key (user_id, goal_id, month_key)
);
create index if not exists contributions_user on public.contributions (user_id);

create table if not exists public.assets (
  id      text primary key,
  user_id uuid not null,
  name    text not null default '',
  kind    text not null check (kind in ('asset', 'liability')),
  value   numeric not null default 0,
  cur     text not null default 'KZT',
  liquid  boolean not null default true
);
create index if not exists assets_user on public.assets (user_id);
