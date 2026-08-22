delete from bid_events;
delete from listings;

create table if not exists payments (
  id serial primary key,
  stripe_session_id text not null unique,
  url text not null,
  handle text not null,
  tagline text not null default '',
  bid integer not null,
  amount_cents integer not null,
  status text not null default 'paid',
  listing_id integer,
  created_at timestamptz not null default now()
);

create index if not exists payments_created_idx on payments (created_at desc);

create table if not exists operator_settings (
  k text primary key,
  v text not null
);

update site_meta set v = 0 where k = 'visitors';
