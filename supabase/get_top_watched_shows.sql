-- ==============================================================================
-- Migration: Top Watched Shows Leaderboard RPC
-- Function: get_top_watched_shows(p_limit INT)
-- Description: Counts occurrences of each show_id in the watched table and
--              returns the top most watched shows ordered by view_count descending.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.get_top_watched_shows(p_limit INT DEFAULT 10)
RETURNS TABLE (
  show_id BIGINT,
  view_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    w.show_id::BIGINT,
    COUNT(*)::BIGINT AS view_count
  FROM public.watched w
  WHERE w.show_id IS NOT NULL
  GROUP BY w.show_id
  ORDER BY view_count DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 100));
$$;

-- Grant execution permissions to authenticated, anon and service_role
GRANT EXECUTE ON FUNCTION public.get_top_watched_shows(INT) TO authenticated, service_role, anon;

COMMENT ON FUNCTION public.get_top_watched_shows(INT) IS 'Counts occurrences of each show_id in the watched table and returns the top watched shows with their view_count.';
