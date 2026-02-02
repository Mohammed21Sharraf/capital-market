-- Create webhook_events table to store incoming webhook data
CREATE TABLE public.webhook_events (
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

-- Enable RLS
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policy for service role to insert/update (edge functions use service role)
CREATE POLICY "Service role can manage webhook events"
ON public.webhook_events
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_events_processed ON public.webhook_events(processed);