import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabaseServer';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { extractExcerpt } from '@/lib/slug';
import ShareButtons from './ShareButtons';
import { formatPersianDate, toPersianDigits } from '@/lib/subscription';
import {
  Calendar,
  User,
  Clock,
  ArrowRight,
  BookOpen,
  Sparkles,
  ChevronLeft,
  Film,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }> | { slug: string };
}

export const dynamic = 'force-dynamic';

/**
 * Generate SEO Metadata for the article
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);
  const slug = decodeURIComponent(resolvedParams.slug);

  const supabase = await createClient();
  const { data: post } = await supabase
    .from('posts')
    .select('title, content, cover_image, created_at, updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (!post) {
    return {
      title: 'مقاله مورد نظر یافت نشد | مجله بینجر',
      description: 'مقاله مورد نظر در مجله بینجر یافت نشد.',
    };
  }

  const description = extractExcerpt(post.content, 160);
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://binger.ir').replace(/\/$/, '');
  const canonicalUrl = `${baseUrl}/blog/${encodeURIComponent(slug)}`;

  return {
    title: `${post.title} | مجله سینمایی بینجر`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: post.title,
      description,
      url: canonicalUrl,
      type: 'article',
      publishedTime: post.created_at,
      modifiedTime: post.updated_at || post.created_at,
      images: post.cover_image ? [{ url: post.cover_image, width: 1200, height: 630, alt: post.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description,
      images: post.cover_image ? [post.cover_image] : [],
    },
  };
}

export default async function SingleArticlePage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const slug = decodeURIComponent(resolvedParams.slug);

  const supabase = await createClient();

  // 1. Fetch Post by slug where published = true
  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, title, slug, content, cover_image, author_id, created_at, updated_at')
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (postError || !post) {
    notFound();
  }

  // 2. Fetch Author Profile if author_id exists
  let authorProfile: { username: string | null; avatar_url: string | null; bio: string | null } | null = null;
  if (post.author_id) {
    const { data: prof } = await supabase
      .from('profiles')
      .select('username, avatar_url, bio')
      .eq('id', post.author_id)
      .maybeSingle();

    if (prof) {
      authorProfile = prof;
    }
  }

  // 3. Fetch 3 other published posts for the "Related Articles" section
  const { data: relatedData } = await supabase
    .from('posts')
    .select('id, title, slug, cover_image, created_at')
    .eq('published', true)
    .neq('id', post.id)
    .order('created_at', { ascending: false })
    .limit(3);

  const relatedPosts = relatedData || [];

  // Calculate reading time (~200 words per minute)
  const wordCount = post.content ? post.content.trim().split(/\s+/).length : 0;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const authorName = authorProfile?.username || 'تحریریه بینجر';
  const authorAvatar = authorProfile?.avatar_url;
  const authorBio = authorProfile?.bio || 'نویسنده و منتقد سینمایی در تحریریه مجله بینجر';
  const createdDate = new Date(post.created_at);

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://binger.ir').replace(/\/$/, '');

  // Construct Google-compliant Schema.org Article JSON-LD structured data
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: extractExcerpt(post.content, 180),
    ...(post.cover_image ? {
      image: [post.cover_image],
    } : {}),
    datePublished: post.created_at,
    dateModified: post.updated_at || post.created_at,
    author: {
      '@type': 'Person',
      name: authorName,
      ...(authorAvatar ? { image: authorAvatar } : {}),
    },
    publisher: {
      '@type': 'Organization',
      name: 'بینجر | Binger',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icons/icon-512x512.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
    },
  };

  return (
    <>
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-300">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/" className="hover:text-white transition">خانه</Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-white transition">مجله بینجر</Link>
          <span>/</span>
          <span className="text-[#ccff00] font-medium truncate max-w-xs sm:max-w-md">
            {post.title}
          </span>
        </nav>

        {/* Article Header & Meta */}
        <header className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-[#ccff00]/15 text-[#ccff00] border border-[#ccff00]/30 text-xs font-bold font-mono">
              نقد و تحلیل سینمایی
            </span>
            <span className="text-xs text-gray-500 font-mono">BINGER ESSAY</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white leading-tight tracking-tight">
            {post.title}
          </h1>

          {/* Metadata & Share Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 pb-4 border-y border-white/10 text-xs text-gray-400">
            {/* Author info & reading time */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {/* Author */}
              <div className="flex items-center gap-2.5">
                {authorAvatar ? (
                  <Image
                    src={authorAvatar}
                    alt={authorName}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover border border-white/15"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-300">
                    <User className="w-4 h-4" />
                  </div>
                )}
                <div>
                  <span className="text-white font-bold block">{authorName}</span>
                  <span className="text-[11px] text-gray-500">منتقد و تحلیل‌گر بینجر</span>
                </div>
              </div>

              {/* Date */}
              <div className="flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>{formatPersianDate(createdDate)}</span>
              </div>

              {/* Reading Time */}
              <div className="flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span>{toPersianDigits(readingTimeMinutes)} دقیقه مطالعه</span>
              </div>
            </div>

            {/* Social Share Buttons */}
            <ShareButtons title={post.title} slug={post.slug} />
          </div>
        </header>

        {/* Hero Cover Image (LCP Priority Optimization) */}
        {post.cover_image && (
          <div className="relative rounded-3xl overflow-hidden bg-black/60 border border-white/10 shadow-2xl aspect-[16/9]">
            <Image
              src={post.cover_image}
              alt={post.title}
              fill
              priority
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
            />
          </div>
        )}

        {/* Main Article Content */}
        <section className="bg-[#0b0b0b]/60 border border-white/5 rounded-3xl p-6 sm:p-10 shadow-xl backdrop-blur-sm">
          <MarkdownRenderer content={post.content} />
        </section>

        {/* Author Bio Box */}
        <div className="p-6 rounded-3xl bg-[#0e0e0e] border border-white/10 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right shadow-xl">
          {authorAvatar ? (
            <Image
              src={authorAvatar}
              alt={authorName}
              width={64}
              height={64}
              className="w-16 h-16 rounded-2xl object-cover border border-white/15 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-gray-300 shrink-0">
              <User className="w-8 h-8" />
            </div>
          )}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <h3 className="text-sm font-bold text-white">درباره نویسنده: {authorName}</h3>
              <span className="text-[11px] text-[#ccff00] font-mono">تحریریه رسمی بینجر</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              {authorBio}
            </p>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedPosts && relatedPosts.length > 0 && (
          <section className="space-y-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#ccff00]" />
                <span>دیگر مقالات مجله بینجر</span>
              </h3>
              <Link
                href="/blog"
                className="text-xs font-bold text-[#ccff00] hover:underline flex items-center gap-1"
              >
                <span>مشاهده همه مقالات</span>
                <ChevronLeft className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedPosts.map((item) => (
                <Link
                  key={item.id}
                  href={`/blog/${item.slug}`}
                  className="group rounded-2xl overflow-hidden bg-[#0e0e0e] border border-white/5 hover:border-[#ccff00]/40 transition-all p-3 space-y-3 flex flex-col justify-between"
                >
                  <div className="aspect-video rounded-xl overflow-hidden bg-black/60 relative">
                    {item.cover_image ? (
                      <Image
                        src={item.cover_image}
                        alt={item.title}
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/[0.02]">
                        <Film className="w-8 h-8 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-white group-hover:text-[#ccff00] transition line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-gray-500 font-mono">
                    {formatPersianDate(new Date(item.created_at))}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Back to Blog CTA */}
        <div className="flex justify-center pt-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 hover:bg-[#ccff00] hover:text-black border border-white/10 text-xs font-bold text-white transition-all shadow-xl"
          >
            <ArrowRight className="w-4 h-4" />
            <span>بازگشت به تمام مقالات مجله</span>
          </Link>
        </div>
      </article>
    </>
  );
}
