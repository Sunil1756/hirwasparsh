export const config = {
  runtime: "edge",
};

export default async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  // Purely server-side environment credentials (never exposed to browser bundles)
  const clientId = process.env.COPERNICUS_CLIENT_ID || "sh-bca04d51-5029-419e-a9d2-29b4cb7ae6fa";
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET || "65bC8ZTF2Uu4Vy9nBV8Tg6q6ldXAxenF";

  const tokenEndpoint = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";

  try {
    const res = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Copernicus OAuth failed: ${res.status}` }), {
        status: res.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const data = await res.json();
    return new Response(
      JSON.stringify({
        access_token: data.access_token,
        expires_in: data.expires_in || 1800,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, s-maxage=1200, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
}
