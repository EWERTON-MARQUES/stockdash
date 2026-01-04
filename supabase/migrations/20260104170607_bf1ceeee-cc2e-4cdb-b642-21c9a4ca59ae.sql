-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all operations on telegram_config" ON public.telegram_config;
DROP POLICY IF EXISTS "Allow all operations on accounts_payable" ON public.accounts_payable;
DROP POLICY IF EXISTS "Allow all operations on accounts_receivable" ON public.accounts_receivable;
DROP POLICY IF EXISTS "Allow all operations on cash_flow" ON public.cash_flow;
DROP POLICY IF EXISTS "Allow all operations on financial_accounts" ON public.financial_accounts;
DROP POLICY IF EXISTS "Allow all operations on product_marketplaces" ON public.product_marketplaces;
DROP POLICY IF EXISTS "Anyone can view daily stock snapshots" ON public.daily_stock_snapshots;
DROP POLICY IF EXISTS "Allow insert daily stock snapshots" ON public.daily_stock_snapshots;
DROP POLICY IF EXISTS "Allow update daily stock snapshots" ON public.daily_stock_snapshots;

-- Create authenticated-only policies for all tables
CREATE POLICY "Authenticated users only" ON public.telegram_config
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.accounts_payable
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.accounts_receivable
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.cash_flow
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.financial_accounts
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.product_marketplaces
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users only" ON public.daily_stock_snapshots
FOR ALL USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);