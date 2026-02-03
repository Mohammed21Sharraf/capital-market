-- Create new dse_market_data schema
CREATE SCHEMA IF NOT EXISTS dse_market_data;

-- Create historical_prices table in dse_market_data schema
CREATE TABLE dse_market_data.historical_prices (
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
CREATE INDEX idx_dse_historical_prices_symbol ON dse_market_data.historical_prices (symbol);
CREATE INDEX idx_dse_historical_prices_date ON dse_market_data.historical_prices (date DESC);
CREATE INDEX idx_dse_historical_prices_symbol_date ON dse_market_data.historical_prices (symbol, date DESC);

-- Enable Row Level Security
ALTER TABLE dse_market_data.historical_prices ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read historical prices (public data)
CREATE POLICY "Historical prices are publicly readable"
ON dse_market_data.historical_prices
FOR SELECT
USING (true);

-- Create function to update timestamps for dse_market_data schema
CREATE OR REPLACE FUNCTION dse_market_data.update_historical_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = dse_market_data;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_historical_prices_updated_at
BEFORE UPDATE ON dse_market_data.historical_prices
FOR EACH ROW
EXECUTE FUNCTION dse_market_data.update_historical_prices_updated_at();

-- Add comment for documentation
COMMENT ON TABLE dse_market_data.historical_prices IS 'Stores daily historical stock price data for DSE stocks in dse_market_data schema';
COMMENT ON SCHEMA dse_market_data IS 'Dedicated schema for DSE market data and stock information';

-- Create webhook_events table in dse_market_data schema
CREATE TABLE dse_market_data.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT,
  source TEXT,
  payload JSONB NOT NULL,
  headers JSONB,
  ip_address TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for webhook_events
ALTER TABLE dse_market_data.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to insert/update
CREATE POLICY "Service role can manage webhook events"
ON dse_market_data.webhook_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_dse_webhook_events_created_at ON dse_market_data.webhook_events(created_at DESC);
CREATE INDEX idx_dse_webhook_events_event_type ON dse_market_data.webhook_events(event_type);
CREATE INDEX idx_dse_webhook_events_processed ON dse_market_data.webhook_events(processed);

-- Add comment for documentation
COMMENT ON TABLE dse_market_data.webhook_events IS 'Stores incoming webhook events for DSE market data processing';
