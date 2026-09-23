-- Keep unresolved link targets so a wikilink can become an edge when its
-- target note is created later. The original schema only retained links that
-- resolved at save time, permanently losing forward references.
create table public.note_links (
  note_id uuid not null references public.notes(id) on delete cascade,
  linked_title_key text not null,
  primary key (note_id, linked_title_key),
  constraint note_links_title_not_blank check (btrim(linked_title_key) <> '')
);

create index note_links_title_key_idx on public.note_links(linked_title_key);

alter table public.note_links enable row level security;

create policy "single user can read note links" on public.note_links
  for select to authenticated using ((select auth.uid()) is not null);
create policy "single user can insert note links" on public.note_links
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "single user can delete note links" on public.note_links
  for delete to authenticated using ((select auth.uid()) is not null);

revoke all on public.note_links from anon;
grant select, insert, delete on public.note_links to authenticated;

-- Recover unresolved targets from notes saved before note_links existed.
insert into public.note_links (note_id, linked_title_key)
select distinct
  source.id,
  lower(btrim(split_part(split_part(extracted.captures[1], '|', 1), '#', 1)))
from public.notes source
cross join lateral regexp_matches(
  source.content_md,
  '\[\[([^][]+)\]\]',
  'g'
) as extracted(captures)
where nullif(btrim(split_part(split_part(extracted.captures[1], '|', 1), '#', 1)), '') is not null
on conflict do nothing;

create or replace function public.rebuild_note_edges()
returns void
language sql
security invoker
set search_path = ''
as $$
  delete from public.edges;

  insert into public.edges (note_id, linked_note_id)
  select stored_link.note_id, target.id
  from public.note_links stored_link
  join public.notes target
    on lower(btrim(target.title)) = stored_link.linked_title_key
  where stored_link.note_id <> target.id
  on conflict do nothing;
$$;

revoke all on function public.rebuild_note_edges() from public, anon;
grant execute on function public.rebuild_note_edges() to authenticated;

create or replace function public.save_processed_note(
  note_title text,
  note_content_md text,
  note_content_hash text,
  note_chunks jsonb,
  linked_titles text[] default '{}'::text[],
  existing_note_id uuid default null,
  allow_replacement boolean default false,
  expected_previous_hash text default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_note_id uuid;
  previous_hash text;
  chunk jsonb;
begin
  if nullif(btrim(note_title), '') is null then
    raise exception 'A note title is required';
  end if;

  if note_content_hash is null or note_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid SHA-256 content hash is required';
  end if;

  if jsonb_typeof(note_chunks) <> 'array' or jsonb_array_length(note_chunks) = 0 then
    raise exception 'At least one embedded chunk is required';
  end if;

  if existing_note_id is null then
    insert into public.notes (title, content_md, content_hash)
    values (btrim(note_title), note_content_md, note_content_hash)
    returning id into saved_note_id;
  else
    select content_hash into previous_hash
    from public.notes
    where id = existing_note_id
    for update;

    if not found then
      raise exception 'Note % was not found', existing_note_id;
    end if;

    if previous_hash = note_content_hash then
      return existing_note_id;
    end if;

    if not allow_replacement then
      raise exception 'Replacement confirmation is required';
    end if;

    if expected_previous_hash is not null and previous_hash <> expected_previous_hash then
      raise exception 'The note changed after upload confirmation; review it again';
    end if;

    update public.notes
    set
      title = btrim(note_title),
      content_md = note_content_md,
      content_hash = note_content_hash
    where id = existing_note_id
    returning id into saved_note_id;

    delete from public.chunks where note_id = saved_note_id;
    delete from public.note_links where note_id = saved_note_id;
  end if;

  for chunk in select value from jsonb_array_elements(note_chunks)
  loop
    if jsonb_array_length(chunk->'embedding') <> 1536 then
      raise exception 'Every embedding must contain exactly 1536 values';
    end if;

    insert into public.chunks (note_id, content, embedding)
    values (
      saved_note_id,
      chunk->>'content',
      (chunk->'embedding')::text::extensions.vector
    );
  end loop;

  insert into public.note_links (note_id, linked_title_key)
  select saved_note_id, lower(btrim(link_title))
  from unnest(linked_titles) as links(link_title)
  where nullif(btrim(link_title), '') is not null
  on conflict do nothing;

  perform public.rebuild_note_edges();
  return saved_note_id;
end;
$$;

revoke all on function public.save_processed_note(text, text, text, jsonb, text[], uuid, boolean, text) from public, anon;
grant execute on function public.save_processed_note(text, text, text, jsonb, text[], uuid, boolean, text) to authenticated;

-- Bring existing deployments into the corrected state immediately.
select public.rebuild_note_edges();

notify pgrst, 'reload schema';
