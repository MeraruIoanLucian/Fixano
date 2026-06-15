// Edge Function pt onboarding helper pe Stripe Express
// Helper-ul apasa "Connect Payout Account" -> il redirectam la Stripe
// Stripe se ocupa de tot UI-ul (KYC, IBAN, etc.)

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

    //  2. Verificam ca e helper 
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, stripe_account_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "helper") {
      return jsonResponse({ error: "Only technicians can connect a payout account." }, 403);
    }

    //  3. Citim return_url din body 
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }
    const returnUrl = body?.return_url || "https://fixano.ro/profile";

    //  4. Cream sau refolosim contul Stripe Express 
    let stripeAccountId = profile.stripe_account_id;

    if (!stripeAccountId) {
      // cream cont Express nou
      const createRes = await fetch("https://api.stripe.com/v1/accounts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          "type": "express",
          "metadata[fixano_user_id]": user.id,
        }),
      });
      const account = await createRes.json();
      if (account.error) {
        console.error("Stripe create account error:", account.error);
        return jsonResponse({ error: "Failed to create Stripe account." }, 500);
      }
      stripeAccountId = account.id;

      // salvam stripe_account_id in profiles
      await supabase
        .from("profiles")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", user.id);
    }

    //  5. Cream link de onboarding (Account Link) 
    const linkRes = await fetch("https://api.stripe.com/v1/account_links", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "account": stripeAccountId,
        "refresh_url": returnUrl,
        "return_url": returnUrl,
        "type": "account_onboarding",
      }),
    });
    const link = await linkRes.json();
    if (link.error) {
      console.error("Stripe account link error:", link.error);
      return jsonResponse({ error: "Failed to create onboarding link." }, 500);
    }

    //  6. Returnam URL-ul de onboarding 
    return jsonResponse({ url: link.url });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
