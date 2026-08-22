create table if not exists listings (
  id serial primary key,
  url text not null unique,
  handle text not null,
  tagline text not null default '',
  bid integer not null check (bid >= 5 and bid <= 999999),
  clicks integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_rank_idx on listings (bid desc, created_at asc);

create table if not exists bid_events (
  id serial primary key,
  listing_id integer not null references listings(id),
  handle text not null,
  url text not null,
  bid integer not null,
  rank integer not null,
  created_at timestamptz not null default now()
);

create index if not exists bid_events_recent_idx on bid_events (created_at desc);

create table if not exists heartbeats (
  session_key text primary key,
  last_seen timestamptz not null default now()
);

create table if not exists site_meta (
  k text primary key,
  v integer not null
);

insert into site_meta (k, v) values ('visitors', 18420)
  on conflict (k) do nothing;
