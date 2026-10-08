-- =====================================================================
-- Binger (بینجر) - زیرساخت مستقل و کامل بخش فیلم‌ها (Movies Architecture)
-- بدون هیچ‌گونه تداخل با سریال‌ها و با پشتیبانی کامل از RLS و سرعت بالا
-- =====================================================================

-- ۱. جدول فیلم‌های دیده‌شده کاربر (Watched Movies)
CREATE TABLE IF NOT EXISTS public.watched_movies (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    movie_title TEXT,
    poster_path TEXT,
    runtime_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_watched_movie UNIQUE (user_id, movie_id)
);

-- ایندکس‌های کارایی بالا برای کوئری‌های فوق‌سریع
CREATE INDEX IF NOT EXISTS idx_watched_movies_user_id ON public.watched_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_watched_movies_movie_id ON public.watched_movies(movie_id);
CREATE INDEX IF NOT EXISTS idx_watched_movies_created_at ON public.watched_movies(created_at DESC);

-- فعال‌سازی RLS برای watched_movies
ALTER TABLE public.watched_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "کاربران می‌توانند فیلم‌های دیده‌شده خود را ببینند"
    ON public.watched_movies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "کاربران می‌توانند فیلم دیده‌شده ثبت کنند"
    ON public.watched_movies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "کاربران می‌توانند فیلم دیده‌شده خود را حذف کنند"
    ON public.watched_movies FOR DELETE
    USING (auth.uid() = user_id);

-- ۲. جدول لیست انتظار فیلم‌ها (Watchlist Movies)
CREATE TABLE IF NOT EXISTS public.watchlist_movies (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    movie_title TEXT,
    poster_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_watchlist_movie UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_movies_user_id ON public.watchlist_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_movies_movie_id ON public.watchlist_movies(movie_id);

ALTER TABLE public.watchlist_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "کاربران می‌توانند لیست انتظار فیلم‌های خود را ببینند"
    ON public.watchlist_movies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "کاربران می‌توانند فیلم به لیست انتظار اضافه کنند"
    ON public.watchlist_movies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "کاربران می‌توانند فیلم را از لیست انتظار حذف کنند"
    ON public.watchlist_movies FOR DELETE
    USING (auth.uid() = user_id);

-- ۳. جدول فیلم‌های موردعلاقه (Favorite Movies)
CREATE TABLE IF NOT EXISTS public.favorite_movies (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    movie_title TEXT,
    poster_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_favorite_movie UNIQUE (user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_favorite_movies_user_id ON public.favorite_movies(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_movies_movie_id ON public.favorite_movies(movie_id);

ALTER TABLE public.favorite_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "همه کاربران می‌توانند فیلم‌های موردعلاقه عمومی دیگران را ببینند"
    ON public.favorite_movies FOR SELECT
    USING (true);

CREATE POLICY "کاربران می‌توانند فیلم محبوب ثبت کنند"
    ON public.favorite_movies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "کاربران می‌توانند فیلم محبوب خود را حذف کنند"
    ON public.favorite_movies FOR DELETE
    USING (auth.uid() = user_id);

-- ۴. جدول کش ابری دیتابیس برای جزئیات فیلم‌ها (Cached Movies) جهت لود آنی
CREATE TABLE IF NOT EXISTS public.cached_movies (
    id BIGINT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.cached_movies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "همه کاربران مجاز به خواندن کش فیلم‌ها هستند"
    ON public.cached_movies FOR SELECT
    USING (true);

CREATE POLICY "کاربران احرازشده می‌توانند کش فیلم ذخیره یا آپدیت کنند"
    ON public.cached_movies FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

CREATE POLICY "کاربران احرازشده می‌توانند کش فیلم را آپدیت کنند"
    ON public.cached_movies FOR UPDATE
    USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- ۵. نظرات اختصاصی فیلم‌ها (Movie Comments)
CREATE TABLE IF NOT EXISTS public.movie_comments (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    parent_id BIGINT REFERENCES public.movie_comments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_movie_comments_movie_id ON public.movie_comments(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_comments_user_id ON public.movie_comments(user_id);

ALTER TABLE public.movie_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "همه می‌توانند نظرات فیلم‌ها را ببینند"
    ON public.movie_comments FOR SELECT
    USING (true);

CREATE POLICY "کاربران لاگین کرده می‌توانند نظر ثبت کنند"
    ON public.movie_comments FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "کاربران می‌توانند نظر خود را حذف کنند"
    ON public.movie_comments FOR DELETE
    USING (auth.uid() = user_id);

-- ۶. ری‌اکشن‌ها و نظرسنجی اختصاصی فیلم‌ها (Movie Reactions & Character Polls)
CREATE TABLE IF NOT EXISTS public.movie_reactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    reaction TEXT,
    character_id BIGINT,
    character_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_reactions_movie_id ON public.movie_reactions(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_reactions_user_id ON public.movie_reactions(user_id);

ALTER TABLE public.movie_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "همه می‌توانند ری‌اکشن‌های فیلم‌ها را ببینند" ON public.movie_reactions;
CREATE POLICY "همه می‌توانند ری‌اکشن‌های فیلم‌ها را ببینند"
    ON public.movie_reactions FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "کاربران می‌توانند ری‌اکشن فیلم خود را ثبت و ویرایش کنند" ON public.movie_reactions;
CREATE POLICY "کاربران می‌توانند ری‌اکشن فیلم خود را ثبت و ویرایش کنند"
    ON public.movie_reactions FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ۷. امتیازدهی کاربران به فیلم‌ها (Movie Ratings)
CREATE TABLE IF NOT EXISTS public.movie_ratings (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    movie_id BIGINT NOT NULL,
    rating NUMERIC NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, movie_id)
);

CREATE INDEX IF NOT EXISTS idx_movie_ratings_movie_id ON public.movie_ratings(movie_id);
CREATE INDEX IF NOT EXISTS idx_movie_ratings_user_id ON public.movie_ratings(user_id);

ALTER TABLE public.movie_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "همه می‌توانند امتیازات فیلم‌ها را ببینند" ON public.movie_ratings;
CREATE POLICY "همه می‌توانند امتیازات فیلم‌ها را ببینند"
    ON public.movie_ratings FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "کاربران می‌توانند امتیاز خود را ثبت و ویرایش کنند" ON public.movie_ratings;
CREATE POLICY "کاربران می‌توانند امتیاز خود را ثبت و ویرایش کنند"
    ON public.movie_ratings FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

