import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_CATEGORIES = [
  "Instalații Apă",
  "Gaze",
  "Electrice",
  "Centrale Termice",
  "Climatizare",
  "Altele",
];

const VALID_URGENCIES = ["low", "medium", "urgent"];

const SYSTEM_PROMPT = `Ești un asistent pentru platforma Fixano. Primești descrierea unei probleme casnice și trebuie să o clasifici.

Returnează STRICT un JSON valid (fără markdown, fără backticks, fără text suplimentar) cu exact aceste 3 câmpuri:
- "category": una din aceste valori EXACTE: "Instalații Apă", "Gaze", "Electrice", "Centrale Termice", "Climatizare", "Altele"
- "title": un titlu scurt și descriptiv (maxim 60 caractere) în limba în care a scris utilizatorul
- "urgency": una din "low", "medium", "urgent"

Reguli:
- Dacă problema implică apă, țevi, canalizare, scurgeri → "Instalații Apă"
- Dacă problema implică gaz, aragaz, butelie → "Gaze"
- Dacă problema implică curent, prize, siguranțe, becuri → "Electrice"
- Dacă problema implică centrală termică, cazan, încălzire → "Centrale Termice"
- Dacă problema implică aer condiționat, ventilație → "Climatizare"
- Orice altceva → "Altele"
- Dacă urgența nu e clară, alege "medium"
- Răspunde DOAR cu JSON-ul, nimic altceva.`;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    //  1. Check API Key exists 
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.error("GEMINI_API_KEY is not set in secrets");
      return jsonResponse({ error: "AI service not configured." }, 500);
    }

    //  2. Verify JWT (only logged-in users) 
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
      console.error("Auth error:", authError?.message);
      return jsonResponse({ error: "Invalid or expired token." }, 401);
    }

    //  3. Parse request body 
    let body;
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON body." }, 400);
    }

    const description = body?.description;
    if (!description || typeof description !== "string" || description.trim().length < 5) {
      return jsonResponse({ error: "Please provide a description (min 5 chars)." }, 400);
    }

    //  4. Call Gemini 2.5 Flash 
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: description.trim() }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 500,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text();
      console.error("Gemini API error:", geminiResponse.status, errText);
      return jsonResponse({ error: "AI service temporarily unavailable." }, 502);
    }

    const geminiData = await geminiResponse.json();

    //  5. Extract and parse AI text 
    const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    let parsed;
    try {
      // First try direct parse (should work with responseMimeType)
      parsed = JSON.parse(rawText.trim());
    } catch {
      // Fallback: try to find JSON object anywhere in the text
      const jsonMatch = rawText.match(/\{[\s\S]*?"category"[\s\S]*?"title"[\s\S]*?"urgency"[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
        } catch {
          console.error("Failed to parse Gemini output:", rawText);
          return jsonResponse({ error: "AI returned invalid format. Try again." }, 200);
        }
      } else {
        console.error("No JSON found in Gemini output:", rawText);
        return jsonResponse({ error: "AI returned invalid format. Try again." }, 200);
      }
    }

    //  6. Validate and sanitize 
    const category = VALID_CATEGORIES.includes(parsed.category) ? parsed.category : "Altele";
    const urgency = VALID_URGENCIES.includes(parsed.urgency) ? parsed.urgency : "medium";
    const title = typeof parsed.title === "string" ? parsed.title.slice(0, 60) : "Problemă casnică";

    //  7. Return clean result 
    return jsonResponse({ category, title, urgency });

  } catch (err) {
    console.error("Unexpected error:", err);
    return jsonResponse({ error: "Internal server error." }, 500);
  }
});
