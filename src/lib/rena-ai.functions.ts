import { createOpenAI } from "@ai-sdk/openai";
import { createServerFn } from "@tanstack/react-start";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createGatewayFetch } from "./ai-gateway.server";

export const analyzeBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ question: z.string().min(5).max(1000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: isOwner } = await context.supabase.rpc("is_owner", { _user_id: context.userId });
    if (!isOwner) throw new Error("Esta cuenta no tiene acceso de dueña.");
    const [deliveries, alerts] = await Promise.all([
      context.supabase.from("deliveries").select("delivered_on,total,paid_amount,payment_status,delivery_items(quantity,unit_price,products(short_name))").eq("owner_id", context.userId).order("delivered_on", { ascending: false }).limit(100),
      context.supabase.from("stock_alerts").select("product_name,note,status,created_at").eq("owner_id", context.userId).order("created_at", { ascending: false }).limit(100),
    ]);
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("La ayuda inteligente no está configurada.");
    const gatewayFetch = createGatewayFetch();
    const lovable = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey: key, headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: gatewayFetch.fetch });
    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      system: "Eres una asesora práctica para un pequeño negocio casero chileno de dulces en consignación. Analiza solamente los datos entregados. Responde en español claro, breve y accionable. Da 3 recomendaciones como máximo, menciona incertidumbre cuando falten datos y no inventes cifras.",
      prompt: `Pregunta de la dueña: ${data.question}\n\nEntregas recientes: ${JSON.stringify(deliveries.data ?? [])}\n\nAvisos recientes: ${JSON.stringify(alerts.data ?? [])}`,
      providerOptions: { openai: { forceReasoning: true, reasoningEffort: "medium", reasoningSummary: "auto", store: false, include: ["reasoning.encrypted_content"] } },
    });
    const text = await result.text;
    if (!text) throw new Error("No se recibió una recomendación. Inténtalo nuevamente.");
    return { text };
  });