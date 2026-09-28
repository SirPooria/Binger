-- =========================================================================
-- Transactions Table for Zibal Payment Integration
-- Tracks user subscription payments (Monthly / Yearly VIP)
-- =========================================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- Amount in Rials (e.g. 1490000 or 14900000)
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  track_id TEXT,
  ref_number TEXT,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'yearly')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_track_id ON public.transactions(track_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their own transactions
DROP POLICY IF EXISTS "Users can view their own transactions" ON public.transactions;
CREATE POLICY "Users can view their own transactions"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 2. Authenticated users can insert their own transactions
DROP POLICY IF EXISTS "Users can insert their own transactions" ON public.transactions;
CREATE POLICY "Users can insert their own transactions"
  ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Admins have full access
DROP POLICY IF EXISTS "Admins have full access to transactions" ON public.transactions;
CREATE POLICY "Admins have full access to transactions"
  ON public.transactions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. Service role has full access (for server-side verification and updates)
DROP POLICY IF EXISTS "Service role full access on transactions" ON public.transactions;
CREATE POLICY "Service role full access on transactions"
  ON public.transactions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
