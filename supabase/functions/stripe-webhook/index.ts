// Edge Function pt webhook-uri Stripe
// Stripe trimite aici cand plata e confirmata (checkout.session.completed)
// Noi acceptam oferta din chat si marcam plata ca "held_by_platform"

import { createClient } from "jsr:@supabase/supabase-js@2";

// webhook-ul vine direct de la Stripe, nu prin browser
// deci nu avem nevoie de CORS normal, dar le punem pt safety
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// functie simpla de verificare semnatura Stripe (HMAC SHA256)
async function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string
): Promise<boolean> {
  try {
    // stripe trimite: t=timestamp,v1=signature
    const parts: Record<string, string> = {};
    for (const item of sigHeader.split(",")) {
      const [key, val] = item.split("=");
      parts[key] = val;
    }
    const timestamp = parts["t"];
    const signature = parts["v1"];
    if (!timestamp || !signature) return false;

    // verificam ca timestamp-ul nu e prea vechi (5 minute)
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp)) > 300) return false;

    // calculam HMAC
    const signedPayload = `${timestamp}.${payload}`;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(signedPayload)
    );
    const computedSig = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return computedSig === signature;
  } catch {
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET not set");
      return jsonResponse({ error: "Webhook not configured." }, 500);
    }

    // ─── 1. Verificam semnatura Stripe ──────────────────────
    const rawBody = await req.text();
    const sigHeader = req.headers.get("stripe-signature");
    if (!sigHeader) {
      return jsonResponse({ error: "Missing stripe-signature header." }, 400);
    }

    const isValid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!isValid) {
      console.error("Invalid Stripe signature");
      return jsonResponse({ error: "Invalid signature." }, 400);
    }

    // ─── 2. Parsam evenimentul ──────────────────────────────
    const event = JSON.parse(rawBody);
    console.log("Stripe event:", event.type);

    // ne intereseaza doar checkout.session.completed
    if (event.type !== "checkout.session.completed") {
      return jsonResponse({ received: true });
    }

    const session = event.data.object;
    const metadata = session.metadata || {};
    const chatOfferId = metadata.chat_offer_id;
    const jobId = metadata.job_id;
    const payerId = metadata.payer_id;
    const payeeId = metadata.payee_id;

    if (!chatOfferId || !jobId) {
      console.error("Missing metadata in checkout session:", metadata);
      return jsonResponse({ error: "Missing metadata." }, 400);
    }

    // ─── 3. Update-uri in DB (cu service role) ──────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 3a. Acceptam oferta din chat
    // trigger-ul on_chat_offer_accepted se ocupa de:
    //   - job → assigned
    //   - offers → accepted/rejected
    const { error: offerError } = await supabase
      .from("chat_offers")
      .update({ status: "accepted" })
      .eq("id", chatOfferId);

    if (offerError) {
      console.error("Error accepting chat offer:", offerError);
    }

    // 3b. Update payment → held_by_platform
    const { error: paymentError } = await supabase
      .from("payments")
      .update({
        status: "held_by_platform",
        stripe_payment_intent_id: session.payment_intent,
        paid_at: new Date().toISOString(),
      })
      .eq("stripe_checkout_session_id", session.id);

    if (paymentError) {
      console.error("Error updating payment:", paymentError);
    }

    console.log(`Payment confirmed: job=${jobId}, payer=${payerId}, payee=${payeeId}`);
    return jsonResponse({ received: true });

  } catch (err) {
    console.error("Webhook error:", err);
    return jsonResponse({ error: "Webhook processing failed." }, 500);
  }
});
