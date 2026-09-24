import { createHash, randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const defaultProducts = [
  { name: "Cuchuflí bañado", short_name: "Cuchuflí", price: 1200, sort_order: 1 },
  { name: "Galleta rellena", short_name: "Galletas", price: 1000, sort_order: 2 },
  { name: "Mini dona", short_name: "Mini donas", price: 1500, sort_order: 3 },
  { name: "Alfajor casero", short_name: "Alfajores", price: 1800, sort_order: 4 },
];

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

async function assertOwner(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("is_owner", { _user_id: context.userId });
  if (!data) throw new Error("Esta cuenta no tiene acceso de dueña.");
}

export const initializeOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!email) throw new Error("Tu cuenta de Google no entregó un correo válido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin.from("owner_access").select("user_id", { count: "exact", head: true });
    const { data: ownAccess } = await supabaseAdmin.from("owner_access").select("user_id").eq("user_id", context.userId).maybeSingle();
    if (!ownAccess && (count ?? 0) > 0) throw new Error("Esta cuenta no está autorizada como dueña.");
    if (!ownAccess) await supabaseAdmin.from("owner_access").insert({ user_id: context.userId, email });

    const { data: settings } = await supabaseAdmin.from("store_settings").select("id").eq("owner_id", context.userId).maybeSingle();
    let cashierToken: string | null = null;
    if (!settings) {
      cashierToken = randomBytes(24).toString("base64url");
      await supabaseAdmin.from("store_settings").insert({ owner_id: context.userId, cashier_token_hash: hashToken(cashierToken) });
      await supabaseAdmin.from("products").insert(defaultProducts.map((product) => ({ ...product, owner_id: context.userId })));
    }
    return { ok: true, cashierToken };
  });

export const getOwnerData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOwner(context);
    const [products, deliveries, alerts, settings] = await Promise.all([
      context.supabase.from("products").select("*").eq("owner_id", context.userId).order("sort_order"),
      context.supabase.from("deliveries").select("*, delivery_items(*)").eq("owner_id", context.userId).order("delivered_on", { ascending: false }),
      context.supabase.from("stock_alerts").select("*").eq("owner_id", context.userId).order("created_at", { ascending: false }),
      context.supabase.from("store_settings").select("*").eq("owner_id", context.userId).single(),
    ]);
    const error = products.error ?? deliveries.error ?? alerts.error ?? settings.error;
    if (error) throw new Error(error.message);
    return { products: products.data, deliveries: deliveries.data, alerts: alerts.data, settings: settings.data };
  });

const DeliveryInput = z.object({
  deliveredOn: z.string(), note: z.string().max(500), paymentStatus: z.enum(["pending", "partial", "paid"]),
  paidAmount: z.number().nonnegative(), items: z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().positive(), unitPrice: z.number().int().nonnegative() })).min(1),
});

export const saveDelivery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input: unknown) => DeliveryInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const total = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const paidAmount = data.paymentStatus === "paid" ? total : data.paymentStatus === "pending" ? 0 : Math.min(data.paidAmount, total);
    const { data: delivery, error } = await context.supabase.from("deliveries").insert({ owner_id: context.userId, delivered_on: data.deliveredOn, note: data.note || null, payment_status: data.paymentStatus, paid_amount: paidAmount, total }).select("id").single();
    if (error || !delivery) throw new Error(error?.message ?? "No se pudo registrar la entrega.");
    const { error: itemsError } = await context.supabase.from("delivery_items").insert(data.items.map((item) => ({ delivery_id: delivery.id, product_id: item.productId, quantity: item.quantity, unit_price: item.unitPrice })));
    if (itemsError) throw new Error(itemsError.message);
    return { id: delivery.id };
  });

export const attendAlert = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { error } = await context.supabase.from("stock_alerts").update({ status: "attended", attended_at: new Date().toISOString() }).eq("id", data.id).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator((input: unknown) => z.object({ storeName: z.string().min(1).max(100), whatsappNumber: z.string().max(30), workers: z.array(z.string().max(80)).max(30) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context);
    const { error } = await context.supabase.from("store_settings").update({ store_name: data.storeName, whatsapp_number: data.whatsappNumber, workers: data.workers, updated_at: new Date().toISOString() }).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const createCashierLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }) => {
    await assertOwner(context);
    const token = randomBytes(24).toString("base64url");
    const { error } = await context.supabase.from("store_settings").update({ cashier_token_hash: hashToken(token), updated_at: new Date().toISOString() }).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { token };
  });

const CashierToken = z.object({ token: z.string().min(20) });
export const getCashierData = createServerFn({ method: "POST" }).inputValidator((input: unknown) => CashierToken.parse(input)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("store_settings").select("owner_id, store_name, whatsapp_number").eq("cashier_token_hash", hashToken(data.token)).maybeSingle();
  if (!settings) throw new Error("Este enlace de cajera no es válido o fue renovado.");
  const [products, alerts] = await Promise.all([
    supabaseAdmin.from("products").select("id, name, short_name, price, sort_order").eq("owner_id", settings.owner_id).eq("active", true).order("sort_order"),
    supabaseAdmin.from("stock_alerts").select("product_id").eq("owner_id", settings.owner_id).eq("status", "pending"),
  ]);
  return { storeName: settings.store_name, whatsappNumber: settings.whatsapp_number, products: products.data ?? [], pendingProductIds: (alerts.data ?? []).map((a) => a.product_id).filter(Boolean) };
});

export const submitCashierAlert = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ token: z.string().min(20), productId: z.string().uuid(), note: z.string().max(500) }).parse(input)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("store_settings").select("owner_id, store_name, whatsapp_number").eq("cashier_token_hash", hashToken(data.token)).maybeSingle();
  if (!settings) throw new Error("Este enlace ya no es válido.");
  const { data: product } = await supabaseAdmin.from("products").select("id, short_name").eq("id", data.productId).eq("owner_id", settings.owner_id).eq("active", true).maybeSingle();
  if (!product) throw new Error("Este producto ya no está disponible.");
  const { data: alert, error } = await supabaseAdmin.from("stock_alerts").insert({ owner_id: settings.owner_id, product_id: product.id, product_name: product.short_name, note: data.note || null }).select("id").single();
  if (error || !alert) throw new Error(error?.message ?? "No se pudo enviar el aviso.");
  const message = `Hola, en ${settings.store_name} se están acabando los ${product.short_name.toLowerCase()}.${data.note ? ` Nota: ${data.note}` : ""}`;
  return { alertId: alert.id, whatsappNumber: settings.whatsapp_number, message };
});

export const setWhatsAppStatus = createServerFn({ method: "POST" }).inputValidator((input: unknown) => z.object({ token: z.string().min(20), alertId: z.string().uuid(), status: z.enum(["opening", "sent", "error"]) }).parse(input)).handler(async ({ data }) => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: settings } = await supabaseAdmin.from("store_settings").select("owner_id").eq("cashier_token_hash", hashToken(data.token)).maybeSingle();
  if (!settings) throw new Error("Este enlace ya no es válido.");
  const { error } = await supabaseAdmin.from("stock_alerts").update({ whatsapp_status: data.status }).eq("id", data.alertId).eq("owner_id", settings.owner_id);
  if (error) throw new Error(error.message);
  return { ok: true };
});