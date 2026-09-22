create extension if not exists pgcrypto with schema extensions;

alter table public.notes add column content_hash text;

-- Existing rows receive a one-time raw-content hash. The next application save
-- replaces it with the normalized hash used by the shared TypeScript module.
update public.notes
set content_hash = encode(
  extensions.digest(convert_to(content_md, 'UTF8'), 'sha256'),
  'hex'
);

alter table public.notes
  alter column content_hash set not null,
  add constraint notes_content_hash_sha256
    check (content_hash ~ '^[0-9a-f]{64}$');

alter table public.notes drop constraint notes_title_unique;
create unique index notes_title_unique_ci on public.notes (lower(btrim(title)));

create or replace function public.check_note_upload(
  candidate_note_id uuid,
  candidate_title text,
  candidate_content_hash text
)
returns table (
  upload_status text,
  matched_note_id uuid,
  current_content_hash text
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  matched public.notes%rowtype;
begin
  if candidate_note_id is not null then
    select * into matched from public.notes where id = candidate_note_id;

    if not found then
      return query select 'id_not_found'::text, null::uuid, null::text;
    elsif matched.content_hash = candidate_content_hash then
      return query select 'unchanged'::text, matched.id, matched.content_hash;
    else
      return query select 'replacement_required'::text, matched.id, matched.content_hash;
    end if;
    return;
  end if;

  select * into matched
  from public.notes
  where lower(btrim(title)) = lower(btrim(candidate_title));

  if found then
    return query select
      case
        when matched.content_hash = candidate_content_hash then 'title_match_unchanged'
        else 'title_match_changed'
      end::text,
      matched.id,
      matched.content_hash;
  else
    return query select 'new'::text, null::uuid, null::text;
  end if;
end;
$$;

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
    delete from public.edges where note_id = saved_note_id;
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

  insert into public.edges (note_id, linked_note_id)
  select saved_note_id, n.id
  from public.notes n
  where lower(btrim(n.title)) = any (
    select lower(btrim(link_title))
    from unnest(linked_titles) as links(link_title)
  )
    and n.id <> saved_note_id
  on conflict do nothing;

  return saved_note_id;
end;
$$;

drop function public.save_processed_note(text, text, jsonb, text[], uuid);

revoke all on function public.check_note_upload(uuid, text, text) from public, anon;
grant execute on function public.check_note_upload(uuid, text, text) to authenticated;

revoke all on function public.save_processed_note(text, text, text, jsonb, text[], uuid, boolean, text) from public, anon;
grant execute on function public.save_processed_note(text, text, text, jsonb, text[], uuid, boolean, text) to authenticated;

-- Ensure the REST API sees the RPCs immediately after this migration is applied.
notify pgrst, 'reload schema';
