-- Create historical_prices table for storing stock historical data
CREATE TABLE public.historical_prices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol TEXT NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(12, 2) NOT NULL,
  high NUMERIC(12, 2) NOT NULL,
  low NUMERIC(12, 2) NOT NULL,
  close NUMERIC(12, 2) NOT NULL,
  volume BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Ensure unique symbol+date combination
  CONSTRAINT unique_symbol_date UNIQUE (symbol, date)
);

-- Create indexes for efficient querying
CREATE INDEX idx_historical_prices_symbol ON public.historical_prices (symbol);
CREATE INDEX idx_historical_prices_date ON public.historical_prices (date DESC);
CREATE INDEX idx_historical_prices_symbol_date ON public.historical_prices (symbol, date DESC);

-- Enable Row Level Security (public read, no public write)
ALTER TABLE public.historical_prices ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read historical prices (public data)
CREATE POLICY "Historical prices are publicly readable"
ON public.historical_prices
FOR SELECT
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_historical_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_historical_prices_updated_at
BEFORE UPDATE ON public.historical_prices
FOR EACH ROW
EXECUTE FUNCTION public.update_historical_prices_updated_at();

-- Add comment for documentation
COMMENT ON TABLE public.historical_prices IS 'Stores daily historical stock price data for DSE stocks';