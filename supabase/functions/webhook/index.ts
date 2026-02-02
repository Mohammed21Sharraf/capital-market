import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

interface WebhookPayload {
  event_type?: string;
  source?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

// Validate that the payload is valid JSON and has required structure
function validatePayload(payload: unknown): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== "object") {
    return { valid: false, error: "Payload must be a JSON object" };
  }

  // Basic size check (limit to ~1MB)
  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > 1_000_000) {
    return { valid: false, error: "Payload too large (max 1MB)" };
  }

  return { valid: true };
}

// Extract relevant headers for logging
function extractHeaders(req: Request): Record<string, string> {
  const relevantHeaders: Record<string, string> = {};
  const headersToCapture = [
    "content-type",
    "user-agent",
    "x-webhook-secret",
    "x-forwarded-for",
    "x-real-ip",
    "x-request-id",
  ];

  headersToCapture.forEach((header) => {
    const value = req.headers.get(header);
    if (value) {
      relevantHeaders[header] = value;
    }
  });

  return relevantHeaders;
}

// Get client IP address
function getClientIP(req: Request): string | null {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed", allowed: ["POST"] }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse the request body
    let payload: WebhookPayload;
    try {
      const text = await req.text();
      if (!text || text.trim() === "") {
        return new Response(
          JSON.stringify({ error: "Empty request body" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      payload = JSON.parse(text);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract metadata
    const headers = extractHeaders(req);
    const ipAddress = getClientIP(req);
    const eventType = payload.event_type || payload.type || null;
    const source = payload.source || headers["user-agent"]?.split("/")[0] || null;

    console.log(`Received webhook: type=${eventType}, source=${source}`);

    // Store the webhook event
    const { data, error } = await supabase
      .from("webhook_events")
      .insert({
        event_type: eventType,
        source: source,
        payload: payload,
        headers: headers,
        ip_address: ipAddress,
        processed: false,
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to store webhook event" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Webhook stored: id=${data.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook received and stored",
        event_id: data.id,
        received_at: data.created_at,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
