-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Documents table
create table if not exists public.documents (
  id uuid default gen_random_uuid() primary key,
  vol_number integer unique not null,
  title text not null,
  pdf_url text not null,
  storage_path text,
  published_date text,
  content text,
  summary text,
  embedding vector(768),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Index for vector similarity search
create index if not exists documents_embedding_idx
  on public.documents
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 50);

-- Index for vol_number lookup
create index if not exists documents_vol_number_idx
  on public.documents (vol_number desc);

-- Full text search index
create index if not exists documents_title_idx
  on public.documents using gin (to_tsvector('simple', title));

-- Function for vector similarity search
create or replace function match_documents(
  query_embedding text,
  match_threshold float default 0.3,
  match_count int default 5
)
returns table (
  id uuid,
  vol_number integer,
  title text,
  content text,
  summary text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.vol_number,
    d.title,
    d.content,
    d.summary,
    1 - (d.embedding <=> query_embedding::vector) as similarity
  from public.documents d
  where 1 - (d.embedding <=> query_embedding::vector) > match_threshold
  order by d.embedding <=> query_embedding::vector
  limit match_count;
end;
$$;

-- RLS policies
alter table public.documents enable row level security;

-- Allow authenticated users to read documents
create policy "Allow authenticated read" on public.documents
  for select to authenticated using (true);

-- Allow service role full access
create policy "Allow service role all" on public.documents
  for all to service_role using (true);

-- Storage bucket for PDFs
insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

-- Storage policy: allow authenticated users to read
create policy "Allow public read" on storage.objects
  for select using (bucket_id = 'documents');

-- Storage policy: allow service role to upload
create policy "Allow service upload" on storage.objects
  for insert to service_role with check (bucket_id = 'documents');
