-- =========================================================================
-- Migration: Deep Analytics & Data Mining RPCs
-- Provides high-performance database aggregations for the Admin Analytics Panel
-- =========================================================================

-- 1. Get Power Users (Top Watchers)
CREATE OR REPLACE FUNCTION public.get_power_users(p_limit INT DEFAULT 20)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  phone TEXT,
  watched_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id AS user_id,
    p.username,
    p.avatar_url,
    p.phone,
    COUNT(w.id)::BIGINT AS watched_count
  FROM public.profiles p
  JOIN public.watched w ON w.user_id = p.id
  GROUP BY p.id, p.username, p.avatar_url, p.phone
  ORDER BY watched_count DESC
  LIMIT COALESCE(p_limit, 20);
$$;

-- 2. Get Most Discussed Shows (Shows with most comments)
CREATE OR REPLACE FUNCTION public.get_most_discussed_shows(p_limit INT DEFAULT 20)
RETURNS TABLE (
  show_id BIGINT,
  comment_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.show_id,
    COUNT(c.id)::BIGINT AS comment_count
  FROM public.comments c
  WHERE c.show_id IS NOT NULL
  GROUP BY c.show_id
  ORDER BY comment_count DESC
  LIMIT COALESCE(p_limit, 20);
$$;

-- 3. Get 30-Day Growth (New Users & Episodes Watched per Day)
CREATE OR REPLACE FUNCTION public.get_30_day_growth()
RETURNS TABLE (
  date TEXT,
  new_users BIGINT,
  episodes_watched BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH date_series AS (
    SELECT to_char(d::date, 'YYYY-MM-DD') AS day_str, d::date AS day_date
    FROM generate_series(
      CURRENT_DATE - INTERVAL '29 days',
      CURRENT_DATE,
      INTERVAL '1 day'
    ) AS d
  ),
  daily_users AS (
    SELECT 
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day_str,
      COUNT(*)::BIGINT AS user_cnt
    FROM public.profiles
    WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days')
    GROUP BY 1
  ),
  daily_watched AS (
    SELECT 
      to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day_str,
      COUNT(*)::BIGINT AS watch_cnt
    FROM public.watched
    WHERE created_at >= (CURRENT_DATE - INTERVAL '30 days')
    GROUP BY 1
  )
  SELECT 
    ds.day_str AS date,
    COALESCE(du.user_cnt, 0)::BIGINT AS new_users,
    COALESCE(dw.watch_cnt, 0)::BIGINT AS episodes_watched
  FROM date_series ds
  LEFT JOIN daily_users du ON du.day_str = ds.day_str
  LEFT JOIN daily_watched dw ON dw.day_str = ds.day_str
  ORDER BY ds.day_date ASC;
$$;

-- 4. Get Churning Users (Registered > 14 days ago, NO watched episodes in last 7 days)
CREATE OR REPLACE FUNCTION public.get_churning_users(p_limit INT DEFAULT 100)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  phone TEXT,
  last_active TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id AS user_id,
    p.username,
    p.phone,
    COALESCE(MAX(w.created_at), p.created_at) AS last_active
  FROM public.profiles p
  LEFT JOIN public.watched w ON w.user_id = p.id
  WHERE p.created_at < (now() - INTERVAL '14 days')
    AND NOT EXISTS (
      SELECT 1 
      FROM public.watched w2 
      WHERE w2.user_id = p.id 
        AND w2.created_at >= (now() - INTERVAL '7 days')
    )
  GROUP BY p.id, p.username, p.phone, p.created_at
  ORDER BY last_active DESC NULLS LAST
  LIMIT COALESCE(p_limit, 100);
$$;

-- Permissions: Allow authenticated admin users and service role to execute
GRANT EXECUTE ON FUNCTION public.get_power_users(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_most_discussed_shows(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_30_day_growth() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_churning_users(INT) TO authenticated, service_role;
