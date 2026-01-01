-- Create table for product marketplace settings
CREATE TABLE public.product_marketplaces (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  amazon BOOLEAN NOT NULL DEFAULT false,
  mercado_livre BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Enable RLS
ALTER TABLE public.product_marketplaces ENABLE ROW LEVEL SECURITY;

-- Allow public read/write since this is a single-user inventory system
CREATE POLICY "Allow all operations on product_marketplaces" 
ON public.product_marketplaces 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create table for Telegram configuration
CREATE TABLE public.telegram_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_token TEXT,
  chat_id TEXT,
  enabled BOOLEAN NOT NULL DEFAULT false,
  low_stock_threshold INTEGER NOT NULL DEFAULT 80,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.telegram_config ENABLE ROW LEVEL SECURITY;

-- Allow public access for single-user system
CREATE POLICY "Allow all operations on telegram_config" 
ON public.telegram_config 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Financial Module Tables

-- Accounts (categories for financial entries)
CREATE TABLE public.financial_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense', 'asset', 'liability')),
  parent_id UUID REFERENCES public.financial_accounts(id),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on financial_accounts" 
ON public.financial_accounts 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Accounts Payable
CREATE TABLE public.accounts_payable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  supplier VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method VARCHAR(100),
  category VARCHAR(100),
  notes TEXT,
  recurrence VARCHAR(50) CHECK (recurrence IN ('none', 'weekly', 'monthly', 'yearly')),
  document_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts_payable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on accounts_payable" 
ON public.accounts_payable 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Accounts Receivable
CREATE TABLE public.accounts_receivable (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  customer VARCHAR(255),
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,
  received_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'overdue', 'cancelled')),
  payment_method VARCHAR(100),
  category VARCHAR(100),
  notes TEXT,
  recurrence VARCHAR(50) CHECK (recurrence IN ('none', 'weekly', 'monthly', 'yearly')),
  document_number VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.accounts_receivable ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on accounts_receivable" 
ON public.accounts_receivable 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Cash Flow entries
CREATE TABLE public.cash_flow (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('income', 'expense')),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  date DATE NOT NULL,
  category VARCHAR(100),
  payment_method VARCHAR(100),
  reference_id UUID,
  reference_type VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on cash_flow" 
ON public.cash_flow 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_product_marketplaces_updated_at
BEFORE UPDATE ON public.product_marketplaces
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_telegram_config_updated_at
BEFORE UPDATE ON public.telegram_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_accounts_updated_at
BEFORE UPDATE ON public.financial_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_payable_updated_at
BEFORE UPDATE ON public.accounts_payable
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_accounts_receivable_updated_at
BEFORE UPDATE ON public.accounts_receivable
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_updated_at
BEFORE UPDATE ON public.cash_flow
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default financial categories
INSERT INTO public.financial_accounts (name, type, description) VALUES
('Receitas de Vendas', 'income', 'Receitas provenientes de vendas de produtos'),
('Receitas de Serviços', 'income', 'Receitas provenientes de prestação de serviços'),
('Outras Receitas', 'income', 'Outras receitas diversas'),
('Custo de Mercadorias', 'expense', 'Custo das mercadorias vendidas'),
('Despesas Operacionais', 'expense', 'Despesas operacionais gerais'),
('Despesas com Pessoal', 'expense', 'Salários, encargos e benefícios'),
('Despesas Administrativas', 'expense', 'Despesas administrativas gerais'),
('Despesas com Marketing', 'expense', 'Investimentos em marketing e publicidade'),
('Despesas Financeiras', 'expense', 'Juros, taxas bancárias, etc'),
('Impostos', 'expense', 'Impostos e tributos'),
('Frete e Logística', 'expense', 'Custos de frete e logística'),
('Taxas de Marketplace', 'expense', 'Taxas cobradas pelos marketplaces');