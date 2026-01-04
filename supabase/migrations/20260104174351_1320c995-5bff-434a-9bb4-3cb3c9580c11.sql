-- Drop trigger first
DROP TRIGGER IF EXISTS update_telegram_config_updated_at ON public.telegram_config;

-- Drop policies
DROP POLICY IF EXISTS "Authenticated users only" ON public.telegram_config;
DROP POLICY IF EXISTS "Allow all operations on telegram_config" ON public.telegram_config;

-- Drop the telegram_config table
DROP TABLE IF EXISTS public.telegram_config;