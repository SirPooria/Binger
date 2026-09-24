import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Authenticate user securely server-side
  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // سناریو ادمین: فقط کاربران با نقش admin در جدول profiles مجاز به ورود هستند
  if (pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', '/admin');
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return response;
  }

  // سناریو ۱: کاربر لاگین نکرده و می‌خواهد برود داشبورد -> بفرست لاگین
  if (!user && pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // سناریو ۲: کاربر لاگین کرده
  if (user) {
    const isOnboarded = user.user_metadata?.onboarding_complete === true;

    // اگر آنبوردینگ نکرده و دارد می‌رود داشبورد -> بفرست آنبوردینگ
    if (!isOnboarded && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    // اگر آنبوردینگ کرده و دوباره آمده صفحه آنبوردینگ -> بفرست داشبورد
    if (isOnboarded && pathname === '/onboarding') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/onboarding',
  ],
};