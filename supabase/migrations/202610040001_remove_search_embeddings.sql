-- Remove semantic and full-text search storage. Notes and wikilink graph data
-- remain intact.
drop function if exists public.hybrid_search(
  text,
  extensions.vector,
  double precision,
  double precision,
  double precision,
  integer
);

drop function if exists public.save_processed_note(
  text,
  text,
  text,
  jsonb,
  text[],
  uuid,
  boolean,
  text
);

drop table if exists public.chunks;
drop function if exists public.set_chunk_fts();

create or replace function public.save_note(
  note_title text,
  note_content_md text,
  note_content_hash text,
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
begin
  if nullif(btrim(note_title), '') is null then
    raise exception 'A note title is required';
  end if;

  if note_content_hash is null or note_content_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'A valid SHA-256 content hash is required';
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

    delete from public.note_links where note_id = saved_note_id;
  end if;

  insert into public.note_links (note_id, linked_title_key)
  select saved_note_id, lower(btrim(link_title))
  from unnest(linked_titles) as links(link_title)
  where nullif(btrim(link_title), '') is not null
  on conflict do nothing;

  perform public.rebuild_note_edges();
  return saved_note_id;
end;
$$;

revoke all on function public.save_note(text, text, text, text[], uuid, boolean, text)
  from public, anon;
grant execute on function public.save_note(text, text, text, text[], uuid, boolean, text)
  to authenticated;

drop extension if exists vector;

notify pgrst, 'reload schema';
