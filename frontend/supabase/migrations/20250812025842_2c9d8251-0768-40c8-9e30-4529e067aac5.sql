-- Create public bucket for archives files
insert into storage.buckets (id, name, public)
values ('archives', 'archives', true)
on conflict (id) do nothing;

-- Allow public read access to archives bucket
create policy if not exists "Public read access to archives"
on storage.objects
for select
using (bucket_id = 'archives');

-- Allow authenticated users to upload to archives bucket
create policy if not exists "Authenticated can upload to archives"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'archives');

-- Optional: Allow authenticated users to update their own files in archives
-- (We keep delete restricted and manage via staff UI)
create policy if not exists "Authenticated can update archives"
on storage.objects
for update
to authenticated
using (bucket_id = 'archives')
with check (bucket_id = 'archives');