// Edge Function pt transferul banilor la helper
// Se apeleaza cand homeowner-ul confirma finalizarea lucrarii
// Banii se transfera din balanta platformei in contul Stripe al helperului

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

    //  2. Citim job_id din body 
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const jobId = body?.job_id;
    if (!jobId) {
      return jsonResponse({ error: "job_id is required." }, 400);
    }

    //  3. Verificam jobul 
    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, owner_id, helper_id")
      .eq("id", jobId)
      .single();

    if (!job) {
      return jsonResponse({ error: "Job not found." }, 404);
    }
    if (job.status !== "pending_completion") {
      return jsonResponse({ error: "Job is not pending completion." }, 400);
    }
    // doar owner-ul poate confirma
    if (user.id !== job.owner_id) {
      return jsonResponse({ error: "Only the homeowner can confirm completion." }, 403);
    }

    //  4. Iau payment-ul 
    const { data: payment } = await supabase
      .from("payments")
      .select("id, amount, status, payee_id")
      .eq("job_id", jobId)
      .eq("status", "held_by_platform")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment) {
      return jsonResponse({ error: "Payment record not found." }, 404);
    }
    if (payment.status !== "held_by_platform") {
      return jsonResponse({ error: "Payment is not held. Current status: " + payment.status }, 400);
    }

    //  5. Iau contul Stripe al helperului 
    const { data: helperProfile } = await supabase
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", payment.payee_id)
      .single();

    if (!helperProfile?.stripe_account_id) {
      return jsonResponse({ error: "Technician has no connected Stripe account." }, 400);
    }

    //  6. Cream transferul Stripe 
    // Platforma retine 10% comision (pt a acoperi taxele Stripe si profitul).
    // Helper-ul primeste 90% din suma initiala.
    const platformFeePercent = 0.10;
    const amountToTransfer = payment.amount * (1 - platformFeePercent);
    const amountInBani = Math.round(amountToTransfer * 100);

    const transferRes = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "amount": amountInBani.toString(),
        "currency": "ron",
        "destination": helperProfile.stripe_account_id,
        "metadata[job_id]": jobId,
        "metadata[payer_id]": job.owner_id,
        "metadata[payee_id]": payment.payee_id,
      }),
    });

    const transfer = await transferRes.json();
    if (transfer.error) {
      console.error("Stripe transfer error:", transfer.error);
      return jsonResponse({ error: "Transfer failed: " + transfer.error.message }, 500);
    }

    //  7. Update DB: payment + job 
    // update payment
    await supabase
      .from("payments")
      .update({
        status: "transferred",
        stripe_transfer_id: transfer.id,
        transferred_at: new Date().toISOString(),
      })
      .eq("id", payment.id);

    // update job la completed
    // trigger-ul on_job_status_notify trimite notificare automat
    await supabase
      .from("jobs")
      .update({ status: "completed", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return jsonResponse({ success: true, transfer_id: transfer.id });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
