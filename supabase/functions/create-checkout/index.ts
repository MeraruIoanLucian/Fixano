// Edge Function pt crearea unui Stripe Checkout Session
// Se apeleaza cand homeowner-ul accepta o oferta din chat
// Banii ajung pe balanta platformei (escrow)

import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      return jsonResponse({ error: "Stripe not configured." }, 500);
    }

    //  1. Verificam JWT 
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return jsonResponse({ error: "Invalid or expired token." }, 401);
    }

    //  2. Citim chat_offer_id din body 
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const chatOfferId = body?.chat_offer_id;
    if (!chatOfferId) {
      return jsonResponse({ error: "chat_offer_id is required." }, 400);
    }

    //  3. Iau oferta si conversatia 
    const { data: chatOffer } = await supabase
      .from("chat_offers")
      .select("id, amount, status, conversation_id")
      .eq("id", chatOfferId)
      .single();

    if (!chatOffer) {
      return jsonResponse({ error: "Offer not found." }, 404);
    }
    if (chatOffer.status !== "pending") {
      return jsonResponse({ error: "Offer is no longer pending." }, 400);
    }

    // iau conversatia ca sa stiu job_id, helped_id, helper_id
    const { data: conversation } = await supabase
      .from("conversations")
      .select("job_id, helped_id, helper_id")
      .eq("id", chatOffer.conversation_id)
      .single();

    if (!conversation) {
      return jsonResponse({ error: "Conversation not found." }, 404);
    }

    // doar homeowner-ul (helped) poate plati
    if (user.id !== conversation.helped_id) {
      return jsonResponse({ error: "Only the homeowner can pay." }, 403);
    }

    //  4. Verificam ca jobul e inca open 
    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, title")
      .eq("id", conversation.job_id)
      .single();

    if (!job || job.status !== "open") {
      return jsonResponse({ error: "This job is no longer open." }, 400);
    }

    //  5. Verificam ca helper-ul are cont Stripe 
    const { data: helperProfile } = await supabase
      .from("profiles")
      .select("stripe_account_id, full_name")
      .eq("id", conversation.helper_id)
      .single();

    if (!helperProfile?.stripe_account_id) {
      return jsonResponse({
        error: "The technician hasn't connected their payout account yet. Payment cannot proceed."
      }, 400);
    }

    //  6. Cream Stripe Checkout Session 
    // pretul e in RON, Stripe lucreaza in bani (1 RON = 100 bani)
    const amountInBani = Math.round(chatOffer.amount * 100);

    const frontendUrl = body?.frontend_url || "https://fixano.ro";

    const checkoutRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "line_items[0][price_data][currency]": "ron",
        "line_items[0][price_data][unit_amount]": amountInBani.toString(),
        "line_items[0][price_data][product_data][name]": `Fixano Service: ${job.title}`,
        "line_items[0][quantity]": "1",
        "success_url": `${frontendUrl}/chat/${chatOffer.conversation_id}?payment=success`,
        "cancel_url": `${frontendUrl}/chat/${chatOffer.conversation_id}?payment=cancelled`,
        "metadata[chat_offer_id]": chatOffer.id,
        "metadata[job_id]": job.id,
        "metadata[payer_id]": user.id,
        "metadata[payee_id]": conversation.helper_id,
        "metadata[amount]": chatOffer.amount.toString(),
        "metadata[helper_stripe_account_id]": helperProfile.stripe_account_id,
      }),
    });

    const session = await checkoutRes.json();
    if (session.error) {
      console.error("Stripe checkout error:", session.error);
      return jsonResponse({ error: "Failed to create payment session." }, 500);
    }

    //  7. Cream inregistrare in payments (status: pending) 
    await supabase.from("payments").insert({
      job_id: job.id,
      payer_id: user.id,
      payee_id: conversation.helper_id,
      amount: chatOffer.amount,
      currency: "ron",
      stripe_checkout_session_id: session.id,
      status: "pending",
    });

    //  8. Returnam URL-ul de checkout 
    return jsonResponse({ url: session.url });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
