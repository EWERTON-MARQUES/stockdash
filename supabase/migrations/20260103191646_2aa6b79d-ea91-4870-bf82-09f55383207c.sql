-- Create table to store daily stock snapshots
CREATE TABLE public.daily_stock_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_stock INTEGER NOT NULL DEFAULT 0,
  total_value DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_products INTEGER NOT NULL DEFAULT 0,
  low_stock_products INTEGER NOT NULL DEFAULT 0,
  out_of_stock_products INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster date queries
CREATE INDEX idx_daily_stock_snapshots_date ON public.daily_stock_snapshots(date DESC);

-- Enable RLS but allow public access for this data
ALTER TABLE public.daily_stock_snapshots ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read the snapshots
CREATE POLICY "Anyone can view daily stock snapshots" 
ON public.daily_stock_snapshots 
FOR SELECT 
USING (true);

-- Allow inserts and updates (for the edge function/api calls)
CREATE POLICY "Allow insert daily stock snapshots" 
ON public.daily_stock_snapshots 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow update daily stock snapshots" 
ON public.daily_stock_snapshots 
FOR UPDATE 
USING (true);