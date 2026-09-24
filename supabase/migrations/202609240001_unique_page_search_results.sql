-- Search still scores individual chunks, but only the strongest matching chunk
-- from each note is returned. This gives the UI one result per page while
-- retaining a relevant excerpt for the result preview.
create or replace function public.hybrid_search(
  query_text text,
  query_embedding extensions.vector(1536),
  match_threshold double precision default 0.62,
  vector_weight double precision default 0.5,
  text_weight double precision default 0.5,
  rrf_k integer default 60
)
returns table (
  chunk_id uuid,
  note_id uuid,
  title text,
  content text,
  vector_similarity double precision,
  rrf_score double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  with vector_candidates as (
    select
      c.id,
      1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity,
      row_number() over (
        order by c.embedding OPERATOR(extensions.<=>) query_embedding
      ) as rank
    from public.chunks c
    where 1 - (c.embedding OPERATOR(extensions.<=>) query_embedding)
      >= greatest(-1.0, least(1.0, match_threshold))
    order by c.embedding OPERATOR(extensions.<=>) query_embedding
    limit 50
  ),
  text_candidates as (
    select
      c.id,
      1 - (c.embedding OPERATOR(extensions.<=>) query_embedding) as similarity,
      row_number() over (
        order by ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) desc
      ) as rank
    from public.chunks c
    where nullif(btrim(query_text), '') is not null
      and c.fts @@ websearch_to_tsquery('english', query_text)
    order by ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) desc
    limit 50
  ),
  fused as (
    select
      coalesce(v.id, t.id) as id,
      coalesce(v.similarity, t.similarity) as similarity,
      coalesce(
        coalesce(vector_weight, 0.5) / (greatest(rrf_k, 1) + v.rank),
        0.0
      ) + coalesce(
        coalesce(text_weight, 0.5) / (greatest(rrf_k, 1) + t.rank),
        0.0
      ) as score
    from vector_candidates v
    full outer join text_candidates t on t.id = v.id
  ),
  ranked_pages as (
    select
      c.id as chunk_id,
      c.note_id,
      n.title,
      c.content,
      fused.similarity,
      fused.score,
      row_number() over (
        partition by c.note_id
        order by fused.score desc, fused.similarity desc nulls last, c.id
      ) as page_chunk_rank
    from fused
    join public.chunks c on c.id = fused.id
    join public.notes n on n.id = c.note_id
  )
  select
    ranked_pages.chunk_id,
    ranked_pages.note_id,
    ranked_pages.title,
    ranked_pages.content,
    ranked_pages.similarity,
    ranked_pages.score
  from ranked_pages
  where ranked_pages.page_chunk_rank = 1
  order by ranked_pages.score desc,
    ranked_pages.similarity desc nulls last,
    ranked_pages.chunk_id
  limit 5;
$$;

notify pgrst, 'reload schema';
