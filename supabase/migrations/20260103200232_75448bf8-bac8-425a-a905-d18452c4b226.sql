-- Add unique constraint on date if not exists
ALTER TABLE public.daily_stock_snapshots 
ADD CONSTRAINT daily_stock_snapshots_date_unique UNIQUE (date);