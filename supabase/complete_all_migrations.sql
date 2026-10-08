-- ====================================================================================
-- 🎬 BINGER (بینجر) - MASTER COMPLETE DATABASE MIGRATION
-- ====================================================================================
-- این اسکریپت جامع و یکپارچه، تمامی جداول، ستون‌ها، ایندکس‌ها، فانکشن‌های RPC و
-- سیاست‌های امنیتی RLS مورد نیاز برای تمام قابلیت‌های بینجر را در یک مرحله اعمال می‌کند.
--
-- ویژگی‌ها:
-- ۱. کاملاً امن و تکرارپذیر (Idempotent): با عبارات IF NOT EXISTS و CREATE OR REPLACE
-- ۲. بدون حذف یا آسیب به داده‌های موجود (Non-destructive)
-- ۳. شامل:
--    - اشتراک VIP و تاریخ انقضا (vip_until)
--    - درگاه پرداخت زیبال (transactions)
--    - سیستم وبلاگ و CMS (posts)
--    - مدیریت داینامیک متون سایت (site_settings + seed)
--    - آینه و کش محلی سریال‌ها (cached_shows)
--    - سامانه فیلم‌های سینمایی (watched_movies, watchlist_movies, favorite_movies, cached_movies, movie_comments)
--    - سهمیه روزانه هوش مصنوعی مود (mood_ai_usage)
--    - دستاوردها و تعاملات کاربران (ratings, likes, saves, events)
--    - توابع تحلیلی و آمار عمیق ادمین (Analytics & Leaderboard)
--    - سیستم مانیتورینگ پیامک (sms_logs)
-- ====================================================================================

-- فعال‌سازی افزونه pgcrypto در صورت عدم وجود
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================================
-- ۱. ارتقای جدول کاربران (public.profiles)
-- ====================================================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vip_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_vip_until_idx ON public.profiles(vip_until);

-- تابع محاسبه روزهای باقی‌مانده اشتراک
CREATE OR REPLACE FUNCTION public.get_subscription_days_remaining(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_is_vip BOOLEAN;
  v_vip_until TIMESTAMPTZ;
  v_updated_at TIMESTAMPTZ;
  v_created_at TIMESTAMPTZ;
  v_expiry TIMESTAMPTZ;
  v_days INTEGER;
BEGIN
  SELECT role, COALESCE(is_vip, false), vip_until, updated_at, created_at
    INTO v_role, v_is_vip, v_vip_until, v_updated_at, v_created_at
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_role = 'admin' THEN
    RETURN 999;
  END IF;

  IF v_vip_until IS NOT NULL THEN
    v_days := CEIL(EXTRACT(EPOCH FROM (v_vip_until - now())) / 86400);
    RETURN GREATEST(0, v_days);
  END IF;

  IF v_is_vip THEN
    v_expiry := COALESCE(v_updated_at, v_created_at, now()) + INTERVAL '30 days';
    v_days := CEIL(EXTRACT(EPOCH FROM (v_expiry - now())) / 86400);
    IF v_days > 0 THEN
      RETURN v_days;
    ELSE
      RETURN 30 - (FLOOR(EXTRACT(EPOCH FROM (now() - COALESCE(v_updated_at, v_created_at, now()))) / 86400)::INTEGER % 30);
    END IF;
  END IF;

  RETURN 0;
END;
$$;

-- تریگر محافظت از ستون‌های حساس پروفایل (فقط ادمین یا سرویس رول حق تغییر دارند)
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF CURRENT_SETTING('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    RAISE EXCEPTION 'Unauthorized to modify role column';
  END IF;

  IF (NEW.is_vip IS DISTINCT FROM OLD.is_vip) THEN
    RAISE EXCEPTION 'Unauthorized to modify is_vip column';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive_profile_columns ON public.profiles;
CREATE TRIGGER trg_protect_sensitive_profile_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_sensitive_profile_columns();


-- ====================================================================================
-- ۲. درگاه پرداخت و تراکنش‌ها (Zibal Payment Integration)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  track_id TEXT,
  ref_number TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_track_id ON public.transactions(track_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins have full access to transactions" ON public.transactions;
CREATE POLICY "Admins have full access to transactions"
  ON public.transactions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Service role has full access to transactions" ON public.transactions;
CREATE POLICY "Service role has full access to transactions"
  ON public.transactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ====================================================================================
-- ۳. متون داینامیک و CMS عمومی (site_settings)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL DEFAULT '',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON public.site_settings (setting_key);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to site_settings" ON public.site_settings;
CREATE POLICY "Allow public read access to site_settings"
  ON public.site_settings FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Allow admins full access to site_settings" ON public.site_settings;
CREATE POLICY "Allow admins full access to site_settings"
  ON public.site_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow service role full access to site_settings" ON public.site_settings;
CREATE POLICY "Allow service role full access to site_settings"
  ON public.site_settings FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- مقداردهی اولیه متون اصلی سایت
INSERT INTO public.site_settings (setting_key, setting_value, description)
VALUES 
  ('site_title', 'بینجر | دستیار هوشمند و ردیاب فیلم و سریال', 'عنوان تب مرورگر و عنوان اصلی سایت'),
  ('home_hero_title', 'دستیار هوشمند خوره‌های سریال و سینما', 'تیتر اصلی بخش هیرو در صفحه نخست'),
  ('home_hero_subtitle', 'دیگه هرگز گم نکن کدوم اپیزود بودی! فیلم و سریال‌هاتو با یک لمس تیک بزن، تقویم اختصاصی پخش داشته باش و با دستیار هوش مصنوعی دقیقاً طبق مودِ لحظه‌ات اثر بعدی رو پیدا کن.', 'زیرعنوان بخش هیرو'),
  ('home_cta_text', 'شروع رایگان در چند ثانیه', 'متن دکمه CTA در صفحه نخست'),
  ('explore_page_title', 'کاوش و کشف هوشمند آثار برتر', 'عنوان اصلی بالای صفحه اکسپلور'),
  ('explore_page_subtitle', 'جدیدترین، محبوب‌ترین و بهترین فیلم‌ها و سریال‌های ایران و جهان', 'زیرعنوان صفحه اکسپلور'),
  ('footer_description', 'بینجر پلتفرم هوشمند مدیریت و کشف فیلم و سریال است. با بینجر همیشه می‌دونی چی ببینی و تا کجا دیدی.', 'متن معرفی فوتر'),
  ('footer_copyright', '© ۲۰۲۶ تمامی حقوق برای پلتفرم بینجر (Binger) محفوظ است.', 'متن کپی‌رایت فوتر')
ON CONFLICT (setting_key) DO NOTHING;


-- ====================================================================================
-- ۴. وبلاگ و مقالات CMS (posts)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.posts (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  cover_image TEXT,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts (slug);
CREATE INDEX IF NOT EXISTS idx_posts_published_created_at ON public.posts (published, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts (author_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to published posts" ON public.posts;
CREATE POLICY "Allow public read access to published posts"
  ON public.posts FOR SELECT TO public
  USING (published = true);

DROP POLICY IF EXISTS "Allow admins full access to posts" ON public.posts;
CREATE POLICY "Allow admins full access to posts"
  ON public.posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow service role full access to posts" ON public.posts;
CREATE POLICY "Allow service role full access to posts"
  ON public.posts FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ====================================================================================
-- ۵. مانیتورینگ لاگ پیامک‌ها (sms_logs)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.sms_logs (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  phone TEXT NOT NULL,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'melipayamak',
  rec_id TEXT,
  error_message TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_phone ON public.sms_logs (phone);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs (status);

ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins to read sms logs" ON public.sms_logs;
CREATE POLICY "Allow admins to read sms logs"
  ON public.sms_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

DROP POLICY IF EXISTS "Allow service role full access to sms logs" ON public.sms_logs;
CREATE POLICY "Allow service role full access to sms logs"
  ON public.sms_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ====================================================================================
-- ۶. کش و آینه اطلاعات سریال‌ها و فیلم‌ها (برای سرعت بالا و گذر از تحریم)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.cached_shows (
  id BIGINT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cached_shows_updated_at ON public.cached_shows (updated_at DESC);
ALTER TABLE public.cached_shows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to cached shows" ON public.cached_shows;
CREATE POLICY "Allow public read access to cached shows"
  ON public.cached_shows FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow all users to insert or update cached shows" ON public.cached_shows;
CREATE POLICY "Allow all users to insert or update cached shows"
  ON public.cached_shows FOR ALL TO public USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.cached_movies (
  id BIGINT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_cached_movies_updated_at ON public.cached_movies (updated_at DESC);
ALTER TABLE public.cached_movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to cached movies" ON public.cached_movies;
CREATE POLICY "Allow public read access to cached movies"
  ON public.cached_movies FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow all to upsert cached movies" ON public.cached_movies;
CREATE POLICY "Allow all to upsert cached movies"
  ON public.cached_movies FOR ALL TO public USING (true) WITH CHECK (true);


-- ====================================================================================
-- ۷. سهمیه روزانه هوش مصنوعی مود (Mood AI Quota)
-- ====================================================================================
CREATE TABLE IF NOT EXISTS public.mood_ai_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, usage_date)
);

ALTER TABLE public.mood_ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own mood ai usage" ON public.mood_ai_usage;
CREATE POLICY "users read own mood ai usage"
  ON public.mood_ai_usage FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_mood_ai_status()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vip BOOLEAN;
  used_count INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(is_vip, false) INTO vip
  FROM public.profiles
  WHERE id = auth.uid();

  SELECT request_count INTO used_count
  FROM public.mood_ai_usage
  WHERE user_id = auth.uid() AND usage_date = CURRENT_DATE;

  RETURN json_build_object(
    'is_vip', COALESCE(vip, false),
    'remaining', CASE WHEN COALESCE(vip, false) THEN null ELSE GREATEST(0, 1 - COALESCE(used_count, 0)) END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_mood_ai_credit()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vip BOOLEAN;
  current_count INTEGER;
  new_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(is_vip, false) INTO vip
  FROM public.profiles
  WHERE id = auth.uid();

  IF COALESCE(vip, false) THEN
    RETURN json_build_object('allowed', true, 'is_vip', true, 'remaining', null);
  END IF;

  SELECT request_count INTO current_count
  FROM public.mood_ai_usage
  WHERE user_id = auth.uid() AND usage_date = CURRENT_DATE;

  IF current_count IS NOT NULL AND current_count >= 1 THEN
    RETURN json_build_object('allowed', false, 'is_vip', false, 'remaining', 0);
  END IF;

  INSERT INTO public.mood_ai_usage (user_id, usage_date, request_count, updated_at)
  VALUES (auth.uid(), CURRENT_DATE, 1, now())
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    request_count = public.mood_ai_usage.request_count + 1,
    updated_at = now()
  RETURNING request_count INTO new_count;

  RETURN json_build_object(
    'allowed', true,
    'is_vip', false,
    'remaining', GREATEST(0, 1 - new_count)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_mood_ai_credit()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_updated INTEGER;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  UPDATE public.mood_ai_usage
  SET request_count = GREATEST(0, request_count - 1),
      updated_at = now()
  WHERE user_id = v_user_id
    AND usage_date = CURRENT_DATE
    AND request_count > 0;

  GET DIAGNOSTICS v_updated = row_count;
  RETURN jsonb_build_object('success', true, 'restored', v_updated > 0, 'remaining', 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_mood_ai_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_mood_ai_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_mood_ai_credit() TO authenticated;


-- ====================================================================================
-- ۸. دستاوردها، امتیازدهی، و تعاملات کاربران
-- ====================================================================================
ALTER TABLE public.user_lists
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS user_lists_user_pinned_idx ON public.user_lists(user_id, is_pinned);

CREATE TABLE IF NOT EXISTS public.episode_ratings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id BIGINT NOT NULL,
  episode_id BIGINT NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, episode_id)
);

CREATE TABLE IF NOT EXISTS public.comment_likes (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  comment_id BIGINT NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.list_saves (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  list_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.achievement_events (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  show_id BIGINT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS episode_ratings_user_idx ON public.episode_ratings(user_id);
CREATE INDEX IF NOT EXISTS episode_ratings_episode_idx ON public.episode_ratings(episode_id);
CREATE INDEX IF NOT EXISTS comment_likes_comment_idx ON public.comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON public.comment_likes(user_id);
CREATE INDEX IF NOT EXISTS list_saves_user_idx ON public.list_saves(user_id);
CREATE INDEX IF NOT EXISTS list_saves_list_idx ON public.list_saves(list_id);
CREATE INDEX IF NOT EXISTS achievement_events_user_idx ON public.achievement_events(user_id, event_type);

ALTER TABLE public.episode_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read episode ratings" ON public.episode_ratings;
CREATE POLICY "public read episode ratings" ON public.episode_ratings FOR SELECT USING (true);
DROP POLICY IF EXISTS "users manage own episode ratings" ON public.episode_ratings;
CREATE POLICY "users manage own episode ratings" ON public.episode_ratings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "public read comment likes" ON public.comment_likes;
CREATE POLICY "public read comment likes" ON public.comment_likes FOR SELECT USING (true);
DROP POLICY IF EXISTS "users manage own comment likes" ON public.comment_likes;
CREATE POLICY "users manage own comment likes" ON public.comment_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "public read list saves" ON public.list_saves;
CREATE POLICY "public read list saves" ON public.list_saves FOR SELECT USING (true);
DROP POLICY IF EXISTS "users manage own list saves" ON public.list_saves;
CREATE POLICY "users manage own list saves" ON public.list_saves FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users read own achievement events" ON public.achievement_events;
CREATE POLICY "users read own achievement events" ON public.achievement_events FOR SELECT USING (auth.uid() = user_id);

-- تابع ثبت امن رویدادهای دستاورد (RPC)
CREATE OR REPLACE FUNCTION public.record_achievement_event(
  p_event_type TEXT,
  p_show_id BIGINT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_exists BOOLEAN;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_event_type NOT IN (
    'easter_egg_found',
    'profile_shared',
    'show_shared',
    'randomizer_completed',
    'chronological_completed',
    'advocacy_click'
  ) THEN
    RAISE EXCEPTION 'invalid_event_type';
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.achievement_events
    WHERE user_id = v_user_id
      AND event_type = p_event_type
      AND ((show_id IS NULL AND p_show_id IS NULL) OR (show_id = p_show_id))
  ) INTO v_exists;

  IF v_exists THEN
    RETURN jsonb_build_object('success', true, 'recorded', false, 'reason', 'already_exists');
  END IF;

  INSERT INTO public.achievement_events (user_id, event_type, show_id, metadata)
  VALUES (v_user_id, p_event_type, p_show_id, COALESCE(p_metadata, '{}'::jsonb));

  RETURN jsonb_build_object('success', true, 'recorded', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_achievement_event(TEXT, BIGINT, JSONB) TO authenticated;

-- تابع ایجاد لیست سفارشی با بررسی لیمیت کاربران عادی (۳ لیست) و نامحدود برای VIP
CREATE OR REPLACE FUNCTION public.create_custom_list(
  p_title TEXT,
  p_description TEXT DEFAULT '',
  p_is_public BOOLEAN DEFAULT true
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vip BOOLEAN;
  list_count INTEGER;
  next_order INTEGER;
  new_list_id TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(is_vip, false) INTO vip
  FROM public.profiles
  WHERE id = auth.uid();

  SELECT count(*)::INTEGER, COALESCE(max(order_index), -1) + 1
    INTO list_count, next_order
  FROM public.user_lists
  WHERE user_id = auth.uid();

  IF NOT COALESCE(vip, false) AND list_count >= 3 THEN
    RETURN json_build_object('allowed', false, 'reason', 'limit_reached', 'limit', 3);
  END IF;

  INSERT INTO public.user_lists (user_id, title, description, is_public, order_index)
  VALUES (auth.uid(), trim(p_title), trim(COALESCE(p_description, '')), p_is_public, next_order)
  RETURNING id::TEXT INTO new_list_id;

  RETURN json_build_object('allowed', true, 'list_id', new_list_id, 'is_vip', COALESCE(vip, false));
END;
$$;

CREATE OR REPLACE FUNCTION public.pin_custom_list(p_list_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vip BOOLEAN;
  target_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT COALESCE(is_vip, false) INTO vip
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT COALESCE(vip, false) THEN
    RETURN json_build_object('allowed', false, 'reason', 'vip_required');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.user_lists
    WHERE id::TEXT = p_list_id AND user_id = auth.uid()
  ) INTO target_exists;

  IF NOT target_exists THEN
    RETURN json_build_object('allowed', false, 'reason', 'list_not_found');
  END IF;

  UPDATE public.user_lists
  SET is_pinned = false
  WHERE user_id = auth.uid();

  UPDATE public.user_lists
  SET is_pinned = true
  WHERE id::TEXT = p_list_id AND user_id = auth.uid();

  RETURN json_build_object('allowed', true, 'pinned_list_id', p_list_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_custom_list(TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pin_custom_list(TEXT) TO authenticated;


-- ====================================================================================
-- ۹. سامانه اختصاصی فیلم‌های سینمایی (Movies Feature)
-- ====================================================================================

-- ۹.۱ فیلم‌های دیده‌شده (watched_movies)
CREATE TABLE IF NOT EXISTS public.watched_movies (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  movie_title TEXT,
  poster_path TEXT,
  runtime_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watched_movies_user_id ON public.watched_movies (user_id);
CREATE INDEX IF NOT EXISTS idx_watched_movies_movie_id ON public.watched_movies (movie_id);

ALTER TABLE public.watched_movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own watched movies" ON public.watched_movies;
CREATE POLICY "Users can view their own watched movies"
  ON public.watched_movies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view watched movies for profile showcase" ON public.watched_movies;
CREATE POLICY "Public can view watched movies for profile showcase"
  ON public.watched_movies FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own watched movies" ON public.watched_movies;
CREATE POLICY "Users can insert their own watched movies"
  ON public.watched_movies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own watched movies" ON public.watched_movies;
CREATE POLICY "Users can delete their own watched movies"
  ON public.watched_movies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ۹.۲ لیست انتظار فیلم‌ها (watchlist_movies)
CREATE TABLE IF NOT EXISTS public.watchlist_movies (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  movie_title TEXT,
  poster_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_movies_user_id ON public.watchlist_movies (user_id);

ALTER TABLE public.watchlist_movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own watchlist movies" ON public.watchlist_movies;
CREATE POLICY "Users can view own watchlist movies"
  ON public.watchlist_movies FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own watchlist movies" ON public.watchlist_movies;
CREATE POLICY "Users can insert own watchlist movies"
  ON public.watchlist_movies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own watchlist movies" ON public.watchlist_movies;
CREATE POLICY "Users can delete own watchlist movies"
  ON public.watchlist_movies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ۹.۳ فیلم‌های موردعلاقه (favorite_movies - حداکثر ۱۰ فیلم تاپ)
CREATE TABLE IF NOT EXISTS public.favorite_movies (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  movie_title TEXT,
  poster_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_movies_user_id ON public.favorite_movies (user_id);

ALTER TABLE public.favorite_movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view favorite movies" ON public.favorite_movies;
CREATE POLICY "Public can view favorite movies"
  ON public.favorite_movies FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Users can insert own favorite movies" ON public.favorite_movies;
CREATE POLICY "Users can insert own favorite movies"
  ON public.favorite_movies FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorite movies" ON public.favorite_movies;
CREATE POLICY "Users can delete own favorite movies"
  ON public.favorite_movies FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ۹.۴ نظرات و نقد فیلم‌ها (movie_comments)
CREATE TABLE IF NOT EXISTS public.movie_comments (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  parent_id BIGINT REFERENCES public.movie_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_movie_comments_movie_id ON public.movie_comments (movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_comments_user_id ON public.movie_comments (user_id);

ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view movie comments" ON public.movie_comments;
CREATE POLICY "Public can view movie comments"
  ON public.movie_comments FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Users can insert movie comments" ON public.movie_comments;
CREATE POLICY "Users can insert movie comments"
  ON public.movie_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own movie comments" ON public.movie_comments;
CREATE POLICY "Users can delete own movie comments"
  ON public.movie_comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ۹.۵ ری‌اکشن‌ها و نظرسنجی فیلم‌ها (movie_reactions)
CREATE TABLE IF NOT EXISTS public.movie_reactions (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  reaction TEXT,
  character_id BIGINT,
  character_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_reactions_movie_id ON public.movie_reactions (movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_reactions_user_id ON public.movie_reactions (user_id);

ALTER TABLE public.movie_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view movie reactions" ON public.movie_reactions;
CREATE POLICY "Public can view movie reactions"
  ON public.movie_reactions FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Users can insert/update own movie reactions" ON public.movie_reactions;
CREATE POLICY "Users can insert/update own movie reactions"
  ON public.movie_reactions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ۹.۶ امتیازدهی فیلم‌ها (movie_ratings)
CREATE TABLE IF NOT EXISTS public.movie_ratings (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  movie_id BIGINT NOT NULL,
  rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_ratings_movie_id ON public.movie_ratings (movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_ratings_user_id ON public.movie_ratings (user_id);

ALTER TABLE public.movie_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view movie ratings" ON public.movie_ratings;
CREATE POLICY "Public can view movie ratings"
  ON public.movie_ratings FOR SELECT TO public
  USING (true);

DROP POLICY IF EXISTS "Users can insert/update own movie ratings" ON public.movie_ratings;
CREATE POLICY "Users can insert/update own movie ratings"
  ON public.movie_ratings FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);



-- ====================================================================================
-- ۱۰. توابع تحلیل عمیق و لیدربورد سراسری (Analytics & Leaderboard)
-- ====================================================================================

-- ۱۰.۱ پربیننده‌ترین کاربران (Power Users)
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

-- ۱۰.۲ پربحث‌ترین سریال‌ها
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

-- ۱۰.۳ رشد ۳۰ روزه پلتفرم
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

-- ۱۰.۴ کاربران ریزشی (Inactive/Churning)
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

-- ۱۰.۵ رتبه‌بندی برترین سریال‌های دیده‌شده
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

-- ۱۰.۶ لیدربورد جهانی و امن کاربران (Global Leaderboard)
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  is_vip BOOLEAN,
  score BIGINT,
  rank BIGINT,
  episodes_count BIGINT,
  comments_count BIGINT,
  followers_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  WITH user_stats AS (
    SELECT
      p.id AS user_id,
      COALESCE(p.username, 'کاربر بینجر') AS username,
      COALESCE(p.avatar_url, '😎') AS avatar_url,
      COALESCE(p.is_vip, false) AS is_vip,
      COALESCE(w.cnt, 0) AS episodes_count,
      COALESCE(c.cnt, 0) AS comments_count,
      COALESCE(f.cnt, 0) AS followers_count,
      ((COALESCE(w.cnt, 0) * 10) + (COALESCE(c.cnt, 0) * 5) + (COALESCE(f.cnt, 0) * 2)) AS score
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, count(*)::BIGINT AS cnt
      FROM public.watched
      GROUP BY user_id
    ) w ON w.user_id = p.id
    LEFT JOIN (
      SELECT user_id, count(*)::BIGINT AS cnt
      FROM public.comments
      GROUP BY user_id
    ) c ON c.user_id = p.id
    LEFT JOIN (
      SELECT following_id, count(*)::BIGINT AS cnt
      FROM public.follows
      GROUP BY following_id
    ) f ON f.following_id = p.id
  ),
  ranked AS (
    SELECT
      user_id,
      username,
      avatar_url,
      is_vip,
      score,
      row_number() OVER (ORDER BY score DESC, user_id ASC) AS rank,
      episodes_count,
      comments_count,
      followers_count
    FROM user_stats
  )
  SELECT * FROM ranked
  ORDER BY rank ASC
  LIMIT GREATEST(1, LEAST(100, p_limit))
  OFFSET GREATEST(0, p_offset);
$$;

-- دسترسی‌های اجرای توابع
GRANT EXECUTE ON FUNCTION public.get_power_users(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_most_discussed_shows(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_30_day_growth() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_churning_users(INT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_top_watched_shows(INT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.get_global_leaderboard(INTEGER, INTEGER) TO authenticated, anon;
