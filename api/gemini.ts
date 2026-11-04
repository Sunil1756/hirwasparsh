export const config = {
  runtime: "edge",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const CANDIDATE_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-2.5-pro",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-pro-latest",
];

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: CORS_HEADERS,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed. Use POST." }),
      {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  // Server-side only: never bundled into browser client JS
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    "";

  if (!apiKey || apiKey.includes("your_gemini_api_key_here")) {
    return new Response(
      JSON.stringify({
        error: "GEMINI_API_KEY_NOT_CONFIGURED",
        message: "Server-side Google Gemini credentials are not configured in Vercel environment variables.",
      }),
      {
        status: 503,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const body = await req.json();
    const {
      prompt,
      imagesBase64,
      systemInstruction,
      isJson = true,
      model: preferredModel,
      temperature = 0.15,
      responseSchema,
    } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required." }),
        {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    const modelsToTry = preferredModel
      ? [preferredModel, ...CANDIDATE_MODELS.filter((m) => m !== preferredModel)]
      : CANDIDATE_MODELS;

    const parts: any[] = [];

    // Multimodal image processing
    if (imagesBase64) {
      const list = Array.isArray(imagesBase64) ? imagesBase64 : [imagesBase64];
      for (const b64 of list) {
        if (!b64 || typeof b64 !== "string") continue;
        const cleanB64 = b64.replace(/^data:image\/[a-z]+;base64,/, "").trim();
        if (cleanB64) {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg",
              data: cleanB64,
            },
          });
        }
      }
    }

    parts.push({ text: prompt });

    const requestPayload: any = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature,
      },
    };

    if (isJson) {
      requestPayload.generationConfig.responseMimeType = "application/json";
    }

    if (responseSchema) {
      requestPayload.generationConfig.responseSchema = responseSchema;
    }

    if (systemInstruction) {
      requestPayload.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    let lastErrorMsg = "No models available";
    let successfulResult: any = null;
    let modelUsed = "";

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 9500);

        let response: Response;
        try {
          response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestPayload),
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeout);
        }

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData?.error?.message || `Status ${response.status}`;
          lastErrorMsg = msg;
          continue; // Try next model fallback
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) {
          lastErrorMsg = "Empty response from Gemini";
          continue;
        }

        modelUsed = model;

        if (isJson) {
          const cleanJson = rawText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();
          try {
            successfulResult = JSON.parse(cleanJson);
          } catch {
            const matched = cleanJson.match(/\{[\s\S]*\}/);
            if (matched) {
              successfulResult = JSON.parse(matched[0]);
            } else {
              successfulResult = cleanJson;
            }
          }
        } else {
          successfulResult = rawText.trim();
        }

        break; // Successfully got response
      } catch (err: any) {
        lastErrorMsg = err?.message || String(err);
      }
    }

    if (successfulResult === null) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_CALL_FAILED",
          message: `All Gemini models failed. Last error: ${lastErrorMsg}`,
        }),
        {
          status: 502,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: successfulResult,
        modelUsed,
      }),
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "INTERNAL_SERVER_ERROR", message: err?.message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
}
