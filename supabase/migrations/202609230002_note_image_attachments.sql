create table public.note_attachments (
  id uuid primary key,
  note_id uuid not null references public.notes(id) on delete cascade,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint note_attachments_file_name_not_blank check (btrim(file_name) <> ''),
  constraint note_attachments_image_type check (mime_type in (
    'image/gif', 'image/jpeg', 'image/png', 'image/webp'
  )),
  constraint note_attachments_size check (size_bytes > 0 and size_bytes <= 10485760)
);

create index note_attachments_note_id_idx on public.note_attachments(note_id);

alter table public.note_attachments enable row level security;

create policy "single user can read note attachments" on public.note_attachments
  for select to authenticated using ((select auth.uid()) is not null);
create policy "single user can insert note attachments" on public.note_attachments
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "single user can delete note attachments" on public.note_attachments
  for delete to authenticated using ((select auth.uid()) is not null);

revoke all on public.note_attachments from anon;
grant select, insert, delete on public.note_attachments to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'note-images',
  'note-images',
  false,
  10485760,
  array['image/gif', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "users can read their note images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "users can upload their note images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "users can delete their note images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-images'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

notify pgrst, 'reload schema';
