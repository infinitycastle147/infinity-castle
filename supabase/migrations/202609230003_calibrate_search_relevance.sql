-- Vector proximity and lexical relevance are separate signals. A semantic
-- threshold should reject weak vector-only neighbours, but it must never hide
-- an exact full-text match (especially names and other rare terms).
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
  )
  select
    c.id,
    c.note_id,
    n.title,
    c.content,
    fused.similarity,
    fused.score
  from fused
  join public.chunks c on c.id = fused.id
  join public.notes n on n.id = c.note_id
  order by fused.score desc, fused.similarity desc nulls last, c.id
  limit 5;
$$;

notify pgrst, 'reload schema';
