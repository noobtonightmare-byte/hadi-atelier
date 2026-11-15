import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "Sign in required" }, 401);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("ORDER_NOTIFICATION_FROM");
  const adminEmail = Deno.env.get("ADMIN_NOTIFICATION_EMAIL");
  if (!url || !anonKey || !resendKey || !from || !adminEmail) {
    return json({ error: "Order email is not configured. See the deployment guide." }, 503);
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return json({ error: "Sign in required" }, 401);

  let payload: { order_id?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  if (typeof payload.order_id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.order_id)) {
    return json({ error: "Invalid order reference" }, 400);
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("id,tracking_number,status,total,phone,shipping_address,created_at")
    .eq("id", payload.order_id)
    .eq("user_id", authData.user.id)
    .maybeSingle();
  if (orderError || !order) return json({ error: "Order not found" }, 404);
  const { data: items, error: itemsError } = await supabase
    .from("order_items")
    .select("product_snapshot,quantity,unit_price")
    .eq("order_id", order.id);
  if (itemsError) return json({ error: "Could not read order details" }, 500);

  const lines = (items ?? []).map((item) => {
    const snapshot = item.product_snapshot as { name?: string };
    return `${snapshot.name ?? "Atelier piece"} × ${item.quantity} — PKR ${Number(item.unit_price) * item.quantity}`;
  }).join("\n");
  const address = order.shipping_address as Record<string, string>;
  const content = `Order ${order.tracking_number}\nStatus: ${order.status}\nTotal: PKR ${order.total}\nPayment: Cash on delivery\n\n${lines}\n\n${address.full_name ?? ""}\n${address.address ?? ""}, ${address.city ?? ""}\n${order.phone}`;
  const destinations = [...new Set([authData.user.email, adminEmail].filter((email): email is string => Boolean(email)))]
    .map((to) => ({ from, to: [to], subject: `HADI ATELIER · Order ${order.tracking_number}`, text: content }));
  const responses = await Promise.all(destinations.map(async (email) => {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(email),
    });
    if (!response.ok) return { ok: false, status: response.status };
    return { ok: true };
  }));
  if (responses.some((result) => !result.ok)) {
    console.error("One or more order emails failed", responses);
    return json({ error: "Order was saved, but one or more email notifications failed" }, 502);
  }
  return json({ sent: true });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
