-- The original graph rebuild used an unqualified DELETE. Supabase projects
-- with safe-update enforcement reject it with "DELETE requires a WHERE
-- clause", which prevented any changed note (including a title-only edit)
-- from being saved.
create or replace function public.rebuild_note_edges()
returns void
language sql
security invoker
set search_path = ''
as $$
  -- Both edge columns are NOT NULL. This predicate deliberately matches all
  -- rows while satisfying safe-update enforcement.
  delete from public.edges where note_id is not null;

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
