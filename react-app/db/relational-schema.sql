-- Money Planner — normalized relational schema (replaces the single planner_data jsonb blob).
-- Every table is scoped by user_id and protected by Row-Level Security tied to auth.uid().
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS / OR REPLACE).

-- ---------- settings (one row per user; the singletons) ----------
create table if not exists public.settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  year          integer not null default extract(year from now()),
  rates_updated bigint,                          -- ms epoch, matches the in-memory number
  tour_done     boolean not null default false,
  last_modified bigint,                          -- client clock, for last-write-wins reconciliation
  updated_at    timestamptz not null default now()
);

-- ---------- currency rates (1 unit of currency = N KZT) ----------
create table if not exists public.currency_rates (
  user_id  uuid not null references auth.users (id) on delete cascade,
  currency text not null,
  rate     numeric not null,
  primary key (user_id, currency)
);

-- ---------- months (keyed by "YYYY-MM"); child rows hang off month_key ----------
create table if not exists public.months (
  user_id   uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  closed    boolean not null default false,
  leftover  numeric,
  primary key (user_id, month_key)
);

create table if not exists public.incomes (
  id        uuid primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  name      text not null default '',
  amount    numeric not null default 0,
  cur       text not null default 'KZT'
);
create index if not exists incomes_user_month on public.incomes (user_id, month_key);

create table if not exists public.expenses (
  id        uuid primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  month_key text not null,
  name      text not null default '',
  category  text not null default 'Other',
  planned   numeric not null default 0,
  actual    numeric not null default 0,
  cur       text not null default 'KZT'
);
create index if not exists expenses_user_month on public.expenses (user_id, month_key);

-- per-month override of a recurring payment's actual
create table if not exists public.rec_actuals (
  user_id      uuid not null references auth.users (id) on delete cascade,
  month_key    text not null,
  recurring_id uuid not null,
  amount       numeric not null,
  primary key (user_id, month_key, recurring_id)
);

-- ---------- recurring payments/income ----------
create table if not exists public.recurring (
  id        uuid primary key,
  user_id   uuid not null references auth.users (id) on delete cascade,
  name      text not null default '',
  type      text not null check (type in ('expense', 'income')),
  category  text not null default 'Other',
  amount    numeric not null default 0,
  cur       text not null default 'KZT',
  start_key text not null,
  end_key   text
);
create index if not exists recurring_user on public.recurring (user_id);

-- ---------- goals + contributions ----------
create table if not exists public.goals (
  id           uuid primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null default '',
  target       numeric not null default 0,
  deadline_key text
);
create index if not exists goals_user on public.goals (user_id);

create table if not exists public.contributions (
  user_id   uuid not null references auth.users (id) on delete cascade,
  goal_id   uuid not null references public.goals (id) on delete cascade,
  month_key text not null,
  amount    numeric not null,
  primary key (user_id, goal_id, month_key)
);
create index if not exists contributions_user on public.contributions (user_id);

-- ---------- assets & liabilities ----------
create table if not exists public.assets (
  id      uuid primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name    text not null default '',
  kind    text not null check (kind in ('asset', 'liability')),
  value   numeric not null default 0,
  cur     text not null default 'KZT',
  liquid  boolean not null default true
);
create index if not exists assets_user on public.assets (user_id);

-- ---------- Row-Level Security: a user sees and writes only their own rows ----------
do $$
declare t text;
begin
  foreach t in array array[
    'settings','currency_rates','months','incomes','expenses',
    'rec_actuals','recurring','goals','contributions','assets'
  ] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists own_rows on public.%I;', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated
         using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;
