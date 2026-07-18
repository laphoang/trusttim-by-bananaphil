-- TrustTim pgvector schema (Architecture guide §5.7, Implementation Spec §5).
-- Single datastore for both retrieval arms: dense vector + keyword tsvector on one table.
create extension if not exists vector;

create table if not exists kb_chunks (
  id           text primary key,
  topic        text not null,              -- bhyt_pricing | procedures | hospital_info | doctor_schedule (soft filter, not exclusive)
  title        text,
  content      text not null,              -- the chunk text (also what we embed)
  keywords     text[],                     -- for the keyword arm
  source_url   text,
  is_synthetic boolean default false,
  freshness    text,                        -- optional staleness caveat, surfaced in citations
  embedding    vector(1024),                -- dense vector from FPT Vietnamese_Embedding (must match EMBEDDING_DIM)
  fts          tsvector                     -- generated from content+keywords, for keyword search
);

create index if not exists kb_chunks_embedding_idx on kb_chunks using hnsw (embedding vector_cosine_ops);
create index if not exists kb_chunks_fts_idx on kb_chunks using gin (fts);
create index if not exists kb_chunks_topic_idx on kb_chunks (topic);
