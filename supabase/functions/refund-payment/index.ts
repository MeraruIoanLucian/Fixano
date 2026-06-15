import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  // FORCED 200 STATUS FOR DEBUGGING - this ensures the React client sees the actual error message
  return new Response(JSON.stringify(body), {
    status: 200,
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

    // Luam job-ul
    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, owner_id, helper_id, dispute_reporter_id")
      .eq("id", jobId)
      .single();

    if (!job) return jsonResponse({ error: "Job not found." }, 404);
    if (job.status !== "disputed") return jsonResponse({ error: "Job is not disputed." }, 400);
    
    // Verificam daca e chemat de celalalt user (sau admin eventual)
    if (user.id === job.dispute_reporter_id) {
      return jsonResponse({ error: "You cannot agree to your own refund request." }, 403);
    }
    if (user.id !== job.owner_id && user.id !== job.helper_id) {
      return jsonResponse({ error: "You are not part of this job." }, 403);
    }

    // Luam plata
    const { data: payment } = await supabase
      .from("payments")
      .select("id, stripe_payment_intent_id, status")
      .eq("job_id", jobId)
      .eq("status", "held_by_platform")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!payment || !payment.stripe_payment_intent_id) {
      return jsonResponse({ error: "Payment record not found." }, 404);
    }
    if (payment.status !== "held_by_platform") {
      return jsonResponse({ error: "Payment is not held." }, 400);
    }

    //  Cream refund-ul in Stripe 
    const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "payment_intent": payment.stripe_payment_intent_id,
        "reason": "requested_by_customer"
      }),
    });

    const refund = await refundRes.json();
    if (refund.error) {
      console.error("Stripe refund error:", refund.error);
      return jsonResponse({ error: "Refund failed: " + refund.error.message }, 500);
    }

    // Daca s-a facut refund cu succes, update-am baza de date
    await supabase
      .from("payments")
      .update({ status: "refunded" })
      .eq("id", payment.id);

    await supabase
      .from("jobs")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", jobId);

    return jsonResponse({ success: true, refund_id: refund.id });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
