import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabaseServer';
import { extractExcerpt } from '@/lib/slug';
import { formatPersianDate, toPersianDigits } from '@/lib/subscription';
import {
  Calendar,
  User,
  ArrowLeft,
  Sparkles,
  BookOpen,
  Eye,
  Film,
  Compass,
} from 'lucide-react';

export const metadata = {
  title: 'مجله و مقالات سینمایی | Binger Blog',
  description: 'تازه‌ترین تحلیل‌ها، نقد و بررسی سریال‌ها، اخبار سینمایی و مقالات اختصاصی پلتفرم بینجر',
};

export const dynamic = 'force-dynamic';

interface PublicPost {
  id: number;
  title: string;
  slug: string;
  content: string;
  cover_image: string | null;
  author_id: string | null;
  created_at: string;
  authorName?: string;
  authorAvatar?: string | null;
}

export default async function BlogIndexPage() {
  const supabase = await createClient();

  let posts: PublicPost[] = [];

  try {
    // Fetch published posts
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, title, slug, content, cover_image, author_id, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (postsError) {
      console.error('Error fetching blog posts:', postsError);
    } else if (postsData && postsData.length > 0) {
      // Fetch author profiles
      const authorIds = Array.from(
        new Set(postsData.map((p) => p.author_id).filter(Boolean))
      ) as string[];

      let authorMap = new Map<string, { username: string | null; avatar_url: string | null }>();

      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', authorIds);

        if (profilesData) {
          profilesData.forEach((prof) => {
            authorMap.set(prof.id, {
              username: prof.username,
              avatar_url: prof.avatar_url,
            });
          });
        }
      }

      posts = postsData.map((p) => {
        const author = p.author_id ? authorMap.get(p.author_id) : null;
        return {
          ...p,
          authorName: author?.username || 'تحریریه بینجر',
          authorAvatar: author?.avatar_url || null,
        };
      });
    }
  } catch (err) {
    console.error('Unexpected error loading blog index:', err);
  }

  const featuredPost = posts.length > 0 ? posts[0] : null;
  const gridPosts = posts.length > 1 ? posts.slice(1) : [];

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Hero Header */}
      <section className="text-center space-y-4 max-w-3xl mx-auto pt-4 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/25 text-[#ccff00] text-xs font-bold font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>BINGER CINEMATIC MAGAZINE</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          مجله سینما و سریال <span className="text-[#ccff00]">بینجر</span>
        </h1>
        <p className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-2xl mx-auto">
          جدیدترین نقدها و تحلیل‌های موشکافانه، معرفی شاهکارهای سینمای جهان و اخبار روز دنیای فیلم و سریال.
        </p>
      </section>

      {/* When No Posts Exist */}
      {posts.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-[#0d0d0d] border border-white/5 space-y-4 max-w-xl mx-auto p-8 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#ccff00]/10 border border-[#ccff00]/20 flex items-center justify-center text-[#ccff00] mx-auto">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">به‌زودی مقالات جدید منتشر خواهند شد</h3>
          <p className="text-xs text-gray-400 leading-relaxed">
            تحریریه بینجر در حال نگارش و آماده‌سازی نقد و بررسی‌های جذاب و مقالات تخصصی سریال‌ها است.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard/explore"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition"
            >
              <Compass className="w-4 h-4 text-[#ccff00]" />
              <span>کاوش در میان سریال‌ها</span>
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Featured Article Hero (First Post) */}
          {featuredPost && (
            <section className="relative group">
              <Link href={`/blog/${featuredPost.slug}`} className="block">
                <div className="relative rounded-3xl overflow-hidden bg-[#0e0e0e] border border-white/10 hover:border-[#ccff00]/40 transition-all duration-300 shadow-2xl flex flex-col lg:flex-row">
                  {/* Hero Cover Image */}
                  <div className="lg:w-3/5 relative aspect-video lg:aspect-auto overflow-hidden bg-black/60 min-h-[260px] sm:min-h-[340px]">
                    {featuredPost.cover_image ? (
                      <Image
                        src={featuredPost.cover_image}
                        alt={featuredPost.title}
                        fill
                        priority
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#121212] to-black">
                        <Film className="w-16 h-16 text-gray-700" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e0e] via-transparent to-transparent lg:hidden" />
                  </div>

                  {/* Hero Content */}
                  <div className="lg:w-2/5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-[#ccff00] text-black text-[10px] font-black uppercase tracking-wider">
                          مقاله ویژه
                        </span>
                        <span className="text-[11px] text-gray-500 font-mono">
                          {formatPersianDate(new Date(featuredPost.created_at))}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-black text-white group-hover:text-[#ccff00] transition leading-snug">
                        {featuredPost.title}
                      </h2>

                      <p className="text-xs sm:text-sm text-gray-400 leading-relaxed line-clamp-3">
                        {extractExcerpt(featuredPost.content, 140)}
                      </p>
                    </div>

                    {/* Author & CTA */}
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        {featuredPost.authorAvatar ? (
                          <Image
                            src={featuredPost.authorAvatar}
                            alt={featuredPost.authorName || 'Author'}
                            width={28}
                            height={28}
                            className="w-7 h-7 rounded-full object-cover border border-white/10"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-300">
                            <User className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="text-xs font-semibold text-gray-300">
                          {featuredPost.authorName}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#ccff00] group-hover:translate-x-[-4px] transition-transform">
                        <span>مطالعه مقاله</span>
                        <ArrowLeft className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </section>
          )}

          {/* Grid of Remaining Articles */}
          {gridPosts.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-[#ccff00] rounded-full inline-block" />
                  <span>دیگر مقالات مجله</span>
                </h3>
                <span className="text-xs text-gray-500 font-mono">
                  {toPersianDigits(gridPosts.length)} نوشته
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {gridPosts.map((post) => {
                  const createdDate = new Date(post.created_at);
                  const excerpt = extractExcerpt(post.content, 100);

                  return (
                    <article
                      key={post.id}
                      className="group rounded-3xl overflow-hidden bg-[#0d0d0d] border border-white/5 hover:border-[#ccff00]/30 transition-all duration-300 flex flex-col justify-between shadow-xl hover:shadow-2xl"
                    >
                      <Link href={`/blog/${post.slug}`} className="block flex-1 flex flex-col">
                        {/* Cover Image */}
                        <div className="relative aspect-[16/10] overflow-hidden bg-black/60">
                          {post.cover_image ? (
                            <Image
                              src={post.cover_image}
                              alt={post.title}
                              fill
                              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                              className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                              <Film className="w-10 h-10 text-gray-700" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent opacity-80" />
                        </div>

                        {/* Card Content */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-2">
                            <h4 className="text-base font-bold text-white group-hover:text-[#ccff00] transition line-clamp-2 leading-snug">
                              {post.title}
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">
                              {excerpt}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Card Footer */}
                      <div className="px-5 pb-5 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500">
                        {/* Author */}
                        <div className="flex items-center gap-2">
                          {post.authorAvatar ? (
                            <Image
                              src={post.authorAvatar}
                              alt={post.authorName || 'Author'}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px] text-gray-300">
                              <User className="w-3 h-3" />
                            </div>
                          )}
                          <span className="text-gray-300 font-medium truncate max-w-[100px]">
                            {post.authorName}
                          </span>
                        </div>

                        {/* Date */}
                        <div className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-gray-500" />
                          <span>{formatPersianDate(createdDate)}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
