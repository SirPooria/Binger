import { createClient } from './supabaseServer';

export interface AdminUser {
  id: string;
  email?: string;
  role: string;
}

export async function verifyAdminSession(): Promise<{
  authorized: boolean;
  user: AdminUser | null;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return { authorized: false, user: null, supabase };
  }

  // Trusted database query: role MUST be 'admin' in profiles table
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || profile?.role !== 'admin') {
    return { authorized: false, user: null, supabase };
  }

  return {
    authorized: true,
    user: {
      id: user.id,
      email: user.email,
      role: 'admin',
    },
    supabase,
  };
}
