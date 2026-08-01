-- Create a public storage bucket for feed post images
insert into storage.buckets (id, name, public, file_size_limit)
values ('post-images', 'post-images', true, 5242880); -- 5MB limit

-- Allow authenticated users to upload
create policy "Authenticated users can upload post images"
on storage.objects for insert to authenticated
with check (bucket_id = 'post-images');

-- Allow authenticated users to delete their uploads
create policy "Authenticated users can delete post images"
on storage.objects for delete to authenticated
using (bucket_id = 'post-images');

-- Public read access
create policy "Public read access for post images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'post-images');
