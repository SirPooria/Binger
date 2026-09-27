-- =========================================================================
-- Migration: Create cached_shows table for TV Show Database Mirroring
-- Permanently stores and mirrors TMDB show metadata in Supabase to eliminate
-- external TMDB network latency, bypass sanctions, and survive server restarts.
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.cached_shows (
  id BIGINT PRIMARY KEY,                            -- TMDB Show ID
  data JSONB NOT NULL,                              -- Complete unified TMDBShow payload (English & Persian)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on updated_at for fast TTL validation and cache housekeeping
CREATE INDEX IF NOT EXISTS idx_cached_shows_updated_at ON public.cached_shows (updated_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.cached_shows ENABLE ROW LEVEL SECURITY;

-- 1. Policy: Allow public read access to cached show data
CREATE POLICY "Allow public read access to cached shows"
  ON public.cached_shows
  FOR SELECT
  TO public
  USING (true);

-- 2. Policy: Allow authenticated and anon users to insert / update cache entries
CREATE POLICY "Allow all users to insert or update cached shows"
  ON public.cached_shows
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);
