-- Create a public storage bucket for event images (hero backgrounds, etc.)
insert into storage.buckets (id, name, public)
values ('event-images', 'event-images', true);

-- Allow authenticated users to upload to their event's folder
create policy "Authenticated users can upload event images"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-images');

-- Allow authenticated users to update/replace their uploads
create policy "Authenticated users can update event images"
on storage.objects for update to authenticated
using (bucket_id = 'event-images');

-- Allow authenticated users to delete their uploads
create policy "Authenticated users can delete event images"
on storage.objects for delete to authenticated
using (bucket_id = 'event-images');

-- Public read access (bucket is public)
create policy "Public read access for event images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'event-images');
