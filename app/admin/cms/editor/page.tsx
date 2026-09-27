import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/adminAuth';
import EditorClient from './EditorClient';
import { ShieldAlert } from 'lucide-react';
import { PostRecord } from '../CmsTableClient';

export const metadata = {
  title: 'ویرایشگر مجله و وبلاگ | Binger Admin',
  description: 'نگارش و ویرایش مقالات، نقدها و اخبار رسمی در پلتفرم بینجر',
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams?: Promise<{ id?: string }> | { id?: string };
}

export default async function AdminPostEditorPage({ searchParams }: PageProps) {
  const { authorized, supabase } = await verifyAdminSession();

  if (!authorized || !supabase) {
    return (
      <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center space-y-3">
        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">دسترسی غیرمجاز</h2>
        <p className="text-sm text-gray-400">
          فقط مدیران سیستم مجاز به استفاده از ویرایشگر مقالات هستند.
        </p>
        <Link
          href="/dashboard"
          className="inline-block px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition"
        >
          بازگشت به داشبورد
        </Link>
      </div>
    );
  }

  // Next.js 15: searchParams may be a Promise
  const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {};
  const postIdParam = resolvedParams.id;

  let initialPost: PostRecord | null = null;

  if (postIdParam) {
    const numericId = parseInt(postIdParam, 10);
    if (!isNaN(numericId)) {
      try {
        const { data, error } = await supabase
          .from('posts')
          .select('id, title, slug, content, cover_image, author_id, published, created_at, updated_at')
          .eq('id', numericId)
          .single();

        if (error) {
          console.error('Error fetching post for editor:', error);
        } else if (data) {
          initialPost = data as PostRecord;
        }
      } catch (err) {
        console.error('Unexpected error fetching post for editor:', err);
      }
    }
  }

  return <EditorClient initialPost={initialPost} />;
}
