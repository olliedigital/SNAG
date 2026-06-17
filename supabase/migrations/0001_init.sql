-- SNAG initial schema — storage for the watch -> find -> show pipeline.

create extension if not exists "pgcrypto";

-- Trusted sites SNAG can watch. One row per integration adapter (sources.key
-- matches the adapter's `key` in code, e.g. 'ebay', 'mock').
create table if not exists public.sources (
  id          uuid primary key default gen_random_uuid(),
  key         text not null unique,
  name        text not null,
  enabled     boolean not null default true,
  config      jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- What the user wants SNAG to hunt for.
create table if not exists public.watchlist_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid,                               -- nullable for single-user v1; RLS-ready
  category       text not null check (category in ('sneakers','games')),
  title          text not null,                      -- plain-terms label the user typed
  query          text not null,                      -- normalized search string for source APIs
  attributes     jsonb not null default '{}'::jsonb, -- structured filters (size, platform, edition, ...)
  max_price      numeric(12,2),                      -- optional ceiling: only a "deal" at/below this
  condition_pref text not null default 'any' check (condition_pref in ('any','new','used')),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists watchlist_items_active_idx on public.watchlist_items (active) where active;

-- Listings SNAG has found, normalized to a common shape and tied to the item
-- that surfaced them.
create table if not exists public.listings (
  id                uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references public.watchlist_items(id) on delete cascade,
  source_id         uuid not null references public.sources(id) on delete cascade,
  source_listing_id text not null,                   -- the site's native id
  title             text not null,
  url               text not null,
  price             numeric(12,2) not null,
  currency          text not null default 'USD',
  condition         text,
  image_url         text,
  seller            text,
  location          text,
  raw               jsonb not null default '{}'::jsonb,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  unique (watchlist_item_id, source_id, source_listing_id)
);

create index if not exists listings_item_idx on public.listings (watchlist_item_id);
create index if not exists listings_item_price_idx on public.listings (watchlist_item_id, price);

-- Observed market prices over time -> powers the single-site "lowest in N days"
-- interim rule and price trends.
create table if not exists public.price_points (
  id                uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references public.watchlist_items(id) on delete cascade,
  source_id         uuid not null references public.sources(id) on delete cascade,
  listing_id        uuid references public.listings(id) on delete set null,
  price             numeric(12,2) not null,
  currency          text not null default 'USD',
  captured_at       timestamptz not null default now()
);

create index if not exists price_points_item_time_idx on public.price_points (watchlist_item_id, captured_at desc);

-- A surfaced deal/match worth showing the user. Deduped by (item, listing, kind)
-- so the same listing never alerts twice for the same reason.
create table if not exists public.alerts (
  id                uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references public.watchlist_items(id) on delete cascade,
  listing_id        uuid not null references public.listings(id) on delete cascade,
  kind              text not null check (kind in ('new_match','good_deal','price_drop')),
  deal_score        numeric(6,3),                    -- fraction below reference, e.g. 0.230 = 23% under
  reference_price   numeric(12,2),
  basis             text check (basis in ('cross_site','history','max_price')),
  reason            text not null,                   -- human-readable explanation for the card
  status            text not null default 'pending' check (status in ('pending','sent','dismissed','acted')),
  notified_at       timestamptz,
  created_at        timestamptz not null default now(),
  unique (watchlist_item_id, listing_id, kind)
);

create index if not exists alerts_pending_idx on public.alerts (status) where status = 'pending';

-- Keep watchlist_items.updated_at fresh.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists watchlist_items_set_updated_at on public.watchlist_items;
create trigger watchlist_items_set_updated_at
  before update on public.watchlist_items
  for each row execute function public.set_updated_at();

-- Security: enable RLS everywhere. v1 is server-only and uses the service role
-- (which bypasses RLS), so we ship with NO policies = no anon/authenticated
-- access. Per-user policies are added in Phase 1.5 alongside Supabase Auth.
alter table public.sources          enable row level security;
alter table public.watchlist_items  enable row level security;
alter table public.listings         enable row level security;
alter table public.price_points     enable row level security;
alter table public.alerts           enable row level security;

-- Seed the source adapters available in v1.
insert into public.sources (key, name, enabled) values
  ('mock', 'Mock Source (dev)', true),
  ('ebay', 'eBay', false)            -- enabled once EBAY_* credentials are set
on conflict (key) do nothing;
