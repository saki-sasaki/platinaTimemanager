export async function onRequest(context) {
  const { request, env } = context;
  const GAS_URL = env.GAS_URL;

  const cors = corsHeaders(request);
  const url = new URL(request.url);

  // debug: /api?__debug=1
  if (url.searchParams.get("__debug") === "1") {
    return json({
      ok: true,
      hasGasUrl: !!GAS_URL,
      gasUrl: GAS_URL ? GAS_URL.slice(0, 60) + "..." : null,
      method: request.method,
      path: url.pathname,
      query: Object.fromEntries(url.searchParams.entries()),
    }, 200, cors);
  }

  if (!GAS_URL) return json({ ok:false, error:"GAS_URL is not set" }, 500, cors);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors });
  }

  const forward = new URL(GAS_URL);
  forward.search = url.search;

  const init = {
    method: request.method,
    headers: { "Content-Type": request.headers.get("Content-Type") || "application/json" },
    redirect: "follow",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.text();
  }

  const res = await fetch(forward.toString(), init);
  const body = await res.text();

  const out = new Headers(cors);
  out.set("Cache-Control", "no-store");
  out.set("Content-Type", res.headers.get("Content-Type") || "application/json");

  return new Response(body, { status: res.status, headers: out });
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extra,
    },
  });
}
