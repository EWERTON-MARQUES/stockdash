-- Create table to store API configuration persistently
CREATE TABLE public.api_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  base_url TEXT NOT NULL,
  token TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.api_config ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage config
CREATE POLICY "Authenticated users can view api_config"
  ON public.api_config
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert api_config"
  ON public.api_config
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update api_config"
  ON public.api_config
  FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete api_config"
  ON public.api_config
  FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_config_updated_at
  BEFORE UPDATE ON public.api_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();