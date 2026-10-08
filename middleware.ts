import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  // Standard @supabase/ssr cookie integration with getAll() and setAll()
  // Handles chunked tokens seamlessly on both desktop and mobile browsers
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = request.nextUrl;

  // Check if browser cookies currently hold Supabase auth tokens
  const allCookies = request.cookies.getAll();
  const hasAuthCookies = allCookies.some(
    (c) => c.name.startsWith('sb-') && c.name.includes('-auth-token') && c.value.length > 5
  );

  let user = null;
  let authNetworkError = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      user = data.user;
    } else if (error) {
      const msg = error.message?.toLowerCase() || '';
      if (
        msg.includes('fetch') ||
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('connection') ||
        msg.includes('econn') ||
        msg.includes('failed to fetch')
      ) {
        authNetworkError = true;
      }
    }
  } catch {
    authNetworkError = true;
  }

  // سناریو ادمین: فقط کاربران با نقش admin در جدول profiles مجاز به ورود هستند
  if (pathname.startsWith('/admin')) {
    if (!user) {
      if (hasAuthCookies && authNetworkError) {
        // در صورت اختلال موقت شبکه هنگام چک ادمین، اجازه عبور داده تا کلاینت رترای کند
        return response;
      }
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('next', '/admin');
      return NextResponse.redirect(url);
    }

    const adminEmails = (process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    const isEmailAdmin = Boolean(user.email && adminEmails.includes(user.email.toLowerCase()));

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const isRoleAdmin = profile?.role === 'admin';

    if (!isRoleAdmin && !isEmailAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    return response;
  }

  // سناریو ۱: کاربر به بخش‌های محافظت‌شده داشبورد می‌رود
  if (!user && pathname.startsWith('/dashboard')) {
    // اگر کاربر کوکی احراز هویت دارد ولی به دلیل قطعی موقت اینترنت یا تغییر IP سوپابیس پاسخ نداد،
    // کاربر را به هیچ وجه به لاگین پرت نکن! اجازه عبور بده تا سشن محلی در کلاینت حفظ شود.
    if (hasAuthCookies) {
      return response;
    }

    // اجازه دسترسی عمومی به جزئیات سریال‌ها و فیلم‌ها برای لینک‌های اشتراک‌گذاری و سئو
    if (
      pathname.startsWith('/dashboard/tv/') ||
      pathname.startsWith('/dashboard/movie/')
    ) {
      return response;
    }

    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // سناریو ۲: کاربر لاگین کرده است
  if (user) {
    const isOnboarded = user.user_metadata?.onboarding_complete === true;

    // اگر کاربر آنبوردینگ نکرده و به داشبورد اصلی می‌رود -> هدایت به آنبوردینگ
    if (!isOnboarded && pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    // اگر آنبوردینگ کرده و دوباره به صفحه آنبوردینگ سر زده -> هدایت به داشبورد
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