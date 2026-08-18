import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claimsData.claims.sub as string;

    const { projectId, images } = await req.json();
    if (!projectId) return json({ error: "projectId is required" }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: project, error: projErr } = await admin
      .from("plantation_projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();
    if (projErr || !project) return json({ error: "Project not found" }, 404);
    if (project.user_id !== userId) return json({ error: "Forbidden" }, 403);

    const { data: evidence } = await admin
      .from("project_evidence")
      .select("evidence_type, latitude, longitude, captured_at, survival_percent")
      .eq("project_id", projectId);

    const evList = evidence ?? [];
    const byType = (t: string) => evList.filter((e) => e.evidence_type === t).length;
    const geotagged = evList.filter((e) => e.latitude != null && e.longitude != null).length;

    // ---- Deterministic evidence-completeness scoring (0-60) ----
    let base = 0;
    const notes: string[] = [];
    if ((project.bulk_rows ?? 0) > 0) {
      base += 15;
      const coverage = Math.min(1, (project.bulk_rows ?? 0) / Math.max(1, project.target_trees));
      base += Math.round(coverage * 10);
      notes.push(`Bulk plantation data: ${project.bulk_rows} rows against a target of ${project.target_trees}.`);
    } else {
      notes.push("No bulk plantation data uploaded — coverage cannot be cross-checked.");
    }
    if (byType("field") > 0) { base += 15; notes.push(`${byType("field")} geotagged field evidence photos submitted.`); }
    else notes.push("No field evidence photos submitted.");
    if (byType("drone") > 0) { base += 10; notes.push(`${byType("drone")} drone imagery captures submitted.`); }
    if (byType("satellite") > 0) { base += 5; notes.push(`${byType("satellite")} satellite monitoring captures submitted.`); }
    if (byType("survival") > 0) { base += 5; notes.push(`${byType("survival")} survival monitoring records submitted.`); }
    if (geotagged === 0 && evList.length > 0) notes.push("Warning: evidence photos are missing geotags.");
    base = Math.min(60, base);

    // ---- AI-assisted imagery review (0-40) ----
    let aiScore = 0;
    let aiText = "AI imagery review was not run (no images supplied).";
    const imgs = Array.isArray(images) ? images.slice(0, 4) : [];

    if (imgs.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) return json({ error: "AI gateway not configured" }, 500);

      const content: unknown[] = [
        {
          type: "text",
          text:
            `You are auditing a large-scale plantation project for an environmental verification platform.\n` +
            `Project: ${project.project_name} by ${project.organization_name} (${project.organization_type}).\n` +
            `Location: ${project.location}. Target trees: ${project.target_trees}. ` +
            `Species: ${(project.species ?? []).join(", ") || "unspecified"}. Plantation date: ${project.plantation_date}.\n` +
            `The images are field / drone / satellite evidence of the plantation site.\n` +
            `Assess: (a) are real saplings/trees visible in a genuine outdoor plantation site, ` +
            `(b) does the visible density plausibly support the claimed scale, ` +
            `(c) any signs of fraud — AI-generated imagery, screenshots, stock photos, watermarks, indoor scenes, ` +
            `or already-mature trees presented as a new plantation.\n` +
            `Respond ONLY with strict JSON: {"imagery_score": 0-40, "authenticity": "genuine"|"suspicious"|"fraudulent", "summary": "2-4 sentences", "flags": ["..."]}`,
        },
        ...imgs
          .filter((i: { base64?: string }) => typeof i?.base64 === "string" && i.base64.length > 128)
          .map((i: { base64: string }) => ({
            type: "image_url",
            image_url: { url: `data:image/jpeg;base64,${i.base64}` },
          })),
      ];

      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-pro",
          messages: [{ role: "user", content }],
        }),
      });

      if (aiRes.status === 429) return json({ error: "AI rate limit reached, please retry shortly." }, 429);
      if (aiRes.status === 402) return json({ error: "AI credits exhausted. Please top up in Settings." }, 402);
      if (!aiRes.ok) return json({ error: "AI verification failed" }, 502);

      const aiJson = await aiRes.json();
      const raw = aiJson?.choices?.[0]?.message?.content ?? "";
      let parsed: { imagery_score?: number; authenticity?: string; summary?: string; flags?: string[] } = {};
      try {
        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
      } catch {
        parsed = { imagery_score: 15, summary: String(raw).slice(0, 600) };
      }
      aiScore = Math.max(0, Math.min(40, Number(parsed.imagery_score ?? 0)));
      if (parsed.authenticity === "fraudulent") aiScore = 0;
      if (parsed.authenticity === "suspicious") aiScore = Math.min(aiScore, 15);
      aiText =
        `${parsed.summary ?? "No summary returned."}` +
        (parsed.flags?.length ? `\nFlags: ${parsed.flags.join("; ")}` : "") +
        (parsed.authenticity ? `\nImagery authenticity: ${parsed.authenticity}.` : "");
    }

    const total = Math.max(0, Math.min(100, base + aiScore));
    const status = total < 40 ? "rejected" : total < 70 ? "under_review" : "verified_pending_admin";

    const report =
      `AI-assisted project verification\n` +
      `Overall score: ${total}/100 (evidence completeness ${base}/60, imagery review ${aiScore}/40)\n\n` +
      `Evidence summary:\n- ${notes.join("\n- ")}\n\n` +
      `Imagery review:\n${aiText}\n\n` +
      `Recommended next step: ${
        status === "rejected"
          ? "Rejected — resubmit with genuine geotagged field evidence and complete plantation data."
          : status === "under_review"
          ? "Under review — add more geotagged field/drone evidence and random sample checks."
          : "Passed AI checks — awaiting final admin approval and periodic survival monitoring."
      }`;

    await admin
      .from("plantation_projects")
      .update({ ai_score: total, ai_report: report, status })
      .eq("id", projectId);

    return json({ score: total, status, report });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500);
  }
});
