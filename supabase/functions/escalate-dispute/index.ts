import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return jsonResponse({ error: "Resend not configured." }, 500);
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
      return jsonResponse({ error: "Invalid token." }, 401);
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON." }, 400);
    }

    const jobId = body?.job_id;
    if (!jobId) return jsonResponse({ error: "job_id missing." }, 400);

    // Luam jobul
    const { data: job } = await supabase
      .from("jobs")
      .select("id, status, title, dispute_reason, dispute_reporter_id, owner_id, helper_id")
      .eq("id", jobId)
      .single();

    if (!job) return jsonResponse({ error: "Job not found." }, 404);
    if (job.status !== "disputed") return jsonResponse({ error: "Job is not disputed." }, 400);

    // Verificam cine a apasat "Decline" (ar trebui sa fie celalalt)
    if (user.id === job.dispute_reporter_id) {
      return jsonResponse({ error: "You cannot escalate your own report." }, 403);
    }

    // Luam payment pt amount
    const { data: payment } = await supabase
      .from("payments")
      .select("amount")
      .eq("job_id", jobId)
      .eq("status", "held_by_platform")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Luam chat transcript
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id")
      .eq("job_id", jobId)
      .single();

    let transcriptText = "No conversation found.";
    if (conversation) {
      const { data: messages } = await supabase
        .from("messages")
        .select("sender_id, body, type, created_at")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: true });

      if (messages && messages.length > 0) {
        transcriptText = messages.map(m => {
          const sender = m.sender_id === job.owner_id ? "Owner" : "Technician";
          let messageContent = m.body;
          if (m.type === 'image') messageContent = '[Image Attached]';
          if (m.type === 'offer') messageContent = '[Sent an Offer]';
          return `[${new Date(m.created_at).toLocaleString()}] ${sender}: ${messageContent}`;
        }).join("\n");
      } else {
        transcriptText = "No messages in chat.";
      }
    }

    // Facem update la job status inainte de trimitere email, ca sa fim siguri ca e marcat escaladat
    await supabase.from("jobs").update({ status: "escalated" }).eq("id", jobId);

    const adminEmail = Deno.env.get("ADMIN_EMAIL") || "ioan.lucian.meraru@icloud.com";

    const emailHtml = `
      <h2>Fixano Dispute Escalation</h2>
      <p><strong>Job ID:</strong> ${job.id}</p>
      <p><strong>Job Title:</strong> ${job.title}</p>
      <p><strong>Held Amount:</strong> ${payment ? payment.amount + ' RON' : 'Unknown'}</p>
      <hr />
      <h3>Dispute Reason:</h3>
      <p><em>"${job.dispute_reason}"</em></p>
      <hr />
      <h3>Chat Transcript:</h3>
      <pre style="background: #f4f4f4; padding: 15px; border-radius: 5px; white-space: pre-wrap;">${transcriptText}</pre>
    `;

    // Trimitem email cu Resend
    const resResend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Fixano System <contact@fixano.ro>",
        to: adminEmail,
        subject: `Dispute Escalated - Job ${job.id}`,
        html: emailHtml,
      }),
    });

    if (!resResend.ok) {
      const errTxt = await resResend.text();
      console.error("Resend error:", errTxt);
      // Nu dam fail complet pentru ca jobul e deja escaladat in baza de date
    }

    return jsonResponse({ success: true });

  } catch (err) {
    console.error("Error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
