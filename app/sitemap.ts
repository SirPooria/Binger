import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase';

// Revalidate sitemap at most once every hour
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://binger.ir').replace(/\/$/, '');

  // 1. Static Routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/vip`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
  ];

  // 2. Dynamic Blog Routes from Supabase
  let blogRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = createClient();
    const { data: posts, error } = await supabase
      .from('posts')
      .select('slug, updated_at, created_at')
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(posts)) {
      blogRoutes = posts.map((post) => ({
        url: `${baseUrl}/blog/${encodeURIComponent(post.slug)}`,
        lastModified: post.updated_at ? new Date(post.updated_at) : (post.created_at ? new Date(post.created_at) : new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));
    }
  } catch (err) {
    console.error('[sitemap] Error fetching posts for sitemap:', err);
  }

  return [...staticRoutes, ...blogRoutes];
}
