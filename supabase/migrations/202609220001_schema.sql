create extension if not exists vector with schema extensions;

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content_md text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notes_title_not_blank check (btrim(title) <> ''),
  constraint notes_title_unique unique (title)
);

create table public.chunks (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.notes(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536) not null,
  fts tsvector not null default ''::tsvector,
  constraint chunks_content_not_blank check (btrim(content) <> '')
);

create table public.edges (
  note_id uuid not null references public.notes(id) on delete cascade,
  linked_note_id uuid not null references public.notes(id) on delete cascade,
  primary key (note_id, linked_note_id),
  constraint edges_no_self_link check (note_id <> linked_note_id)
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notes_set_updated_at
before update on public.notes
for each row execute function public.set_updated_at();

create or replace function public.set_chunk_fts()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.fts = to_tsvector('english', coalesce(new.content, ''));
  return new;
end;
$$;

create trigger chunks_set_fts
before insert or update of content on public.chunks
for each row execute function public.set_chunk_fts();

create index chunks_note_id_idx on public.chunks(note_id);
create index chunks_fts_idx on public.chunks using gin(fts);
create index chunks_embedding_hnsw_idx
  on public.chunks using hnsw (embedding extensions.vector_cosine_ops);
create index edges_linked_note_id_idx on public.edges(linked_note_id);

alter table public.notes enable row level security;
alter table public.chunks enable row level security;
alter table public.edges enable row level security;

-- This project deliberately has one Auth user and disables public signup. These
-- policies therefore expose rows only to that sole authenticated account.
create policy "single user can read notes" on public.notes
  for select to authenticated using ((select auth.uid()) is not null);
create policy "single user can insert notes" on public.notes
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "single user can update notes" on public.notes
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
create policy "single user can delete notes" on public.notes
  for delete to authenticated using ((select auth.uid()) is not null);

create policy "single user can read chunks" on public.chunks
  for select to authenticated using ((select auth.uid()) is not null);
create policy "single user can insert chunks" on public.chunks
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "single user can update chunks" on public.chunks
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
create policy "single user can delete chunks" on public.chunks
  for delete to authenticated using ((select auth.uid()) is not null);

create policy "single user can read edges" on public.edges
  for select to authenticated using ((select auth.uid()) is not null);
create policy "single user can insert edges" on public.edges
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "single user can update edges" on public.edges
  for update to authenticated
  using ((select auth.uid()) is not null)
  with check ((select auth.uid()) is not null);
create policy "single user can delete edges" on public.edges
  for delete to authenticated using ((select auth.uid()) is not null);

revoke all on public.notes, public.chunks, public.edges from anon;
grant select, insert, update, delete on public.notes, public.chunks, public.edges to authenticated;
