-- Create a public storage bucket for event documents (PDFs, slides, etc.)
insert into storage.buckets (id, name, public)
values ('event-documents', 'event-documents', true);

-- Allow authenticated users to upload documents
create policy "Authenticated users can upload event documents"
on storage.objects for insert to authenticated
with check (bucket_id = 'event-documents');

-- Allow authenticated users to update/replace their uploads
create policy "Authenticated users can update event documents"
on storage.objects for update to authenticated
using (bucket_id = 'event-documents');

-- Allow authenticated users to delete their uploads
create policy "Authenticated users can delete event documents"
on storage.objects for delete to authenticated
using (bucket_id = 'event-documents');

-- Public read access (bucket is public)
create policy "Public read access for event documents"
on storage.objects for select to anon, authenticated
using (bucket_id = 'event-documents');
