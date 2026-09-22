create or replace function public.save_processed_note(
  note_title text,
  note_content_md text,
  note_chunks jsonb,
  linked_titles text[] default '{}'::text[],
  existing_note_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saved_note_id uuid;
  chunk jsonb;
begin
  if nullif(btrim(note_title), '') is null then
    raise exception 'A note title is required';
  end if;

  if jsonb_typeof(note_chunks) <> 'array' or jsonb_array_length(note_chunks) = 0 then
    raise exception 'At least one embedded chunk is required';
  end if;

  if existing_note_id is null then
    insert into public.notes (title, content_md)
    values (btrim(note_title), note_content_md)
    returning id into saved_note_id;
  else
    update public.notes
    set title = btrim(note_title), content_md = note_content_md
    where id = existing_note_id
    returning id into saved_note_id;

    if saved_note_id is null then
      raise exception 'Note % was not found', existing_note_id;
    end if;

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
  where lower(n.title) = any (
    select lower(btrim(value)) from unnest(linked_titles) as value
  )
    and n.id <> saved_note_id
  on conflict do nothing;

  return saved_note_id;
end;
$$;

revoke all on function public.save_processed_note(text, text, jsonb, text[], uuid) from public, anon;
grant execute on function public.save_processed_note(text, text, jsonb, text[], uuid) to authenticated;
