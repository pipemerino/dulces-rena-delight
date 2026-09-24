import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Cookie,
  CreditCard,
  Donut,
  Edit3,
  Home,
  LayoutGrid,
  Minus,
  PackageCheck,
  Plus,
  ReceiptText,
  Settings,
  ShoppingBag,
  Store,
  TrendingUp,
  UserRound,
  UsersRound,
  BrainCircuit,
  Copy,
  Link2,
  Loader2,
  LogOut,
  MessageCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { analyzeBusiness } from "@/lib/rena-ai.functions";
import { attendAlert, createCashierLink, getCashierData, getOwnerData, initializeOwner, saveDelivery, setWhatsAppStatus, submitCashierAlert, updateSettings } from "@/lib/rena.functions";

type Screen = "welcome" | "owner" | "cashier";
type OwnerTab = "delivery" | "summary" | "alerts" | "settings";
type SweetId = "cuchufli" | "galleta" | "dona" | "alfajor";
type PaymentState = "pending" | "partial" | "paid";

type Sweet = {
  id: SweetId;
  name: string;
  shortName: string;
  subtitle: string;
  price: number;
  icon: typeof Donut;
  tone: string;
};

const sweets: Sweet[] = [
  { id: "cuchufli", name: "Cuchuflí bañado", shortName: "Cuchuflí", subtitle: "Chocolate y manjar", price: 1200, icon: Cookie, tone: "bg-sweet-caramel" },
  { id: "galleta", name: "Galleta rellena", shortName: "Galletas", subtitle: "Suave y crocante", price: 1000, icon: Cookie, tone: "bg-sweet-cookie" },
  { id: "dona", name: "Mini dona", shortName: "Mini donas", subtitle: "Glaseado rosado", price: 1500, icon: Donut, tone: "bg-sweet-pink" },
  { id: "alfajor", name: "Alfajor casero", shortName: "Alfajores", subtitle: "Manjar y coco", price: 1800, icon: Cookie, tone: "bg-sweet-cocoa" },
];

const initialCounts: Record<SweetId, number> = { cuchufli: 10, galleta: 8, dona: 6, alfajor: 4 };

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dulces Rena — Entregas de dulces" },
      { name: "description", content: "Registro de entregas y avisos de faltantes de Dulces Rena." },
      { property: "og:title", content: "Dulces Rena — Entregas de dulces" },
      { property: "og:description", content: "Una forma simple y cálida de gestionar entregas y avisos de dulces." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DulcesRenaApp,
});

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3" aria-label="Dulces Rena">
      <div className={cn("brand-donut", compact ? "size-11" : "size-16")} aria-hidden="true">
        <span className="brand-donut-hole" />
        <span className="brand-donut-face">⌣</span>
      </div>
      <div className={cn("font-display leading-[0.82]", compact ? "text-xl" : "text-4xl")}>
        <span className="block font-bold text-foreground">Dulces</span>
        <span className="block font-extrabold text-primary">Rena</span>
      </div>
    </div>
  );
}

function SweetBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.08]" aria-hidden="true">
      <Donut className="absolute -right-5 top-12 size-32 rotate-12 text-primary" strokeWidth={1.4} />
      <Cookie className="absolute -left-8 top-[38%] size-28 -rotate-12 text-foreground" strokeWidth={1.4} />
      <Donut className="absolute bottom-12 right-[18%] size-20 -rotate-12 text-primary" strokeWidth={1.4} />
      <Cookie className="absolute bottom-4 left-[30%] size-14 rotate-12 text-foreground" strokeWidth={1.4} />
    </div>
  );
}

function DulcesRenaApp() {
  const cashierToken = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("cajera") ?? "";
  const [screen, setScreen] = useState<Screen>(cashierToken ? "cashier" : "welcome");
  const [sessionReady, setSessionReady] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { if (data.session && !cashierToken) setScreen("owner"); setSessionReady(true); });
    const { data } = supabase.auth.onAuthStateChange((event, session) => { if (event === "SIGNED_IN" && session && !cashierToken) setScreen("owner"); if (event === "SIGNED_OUT") setScreen("welcome"); });
    return () => data.subscription.unsubscribe();
  }, [cashierToken]);
  if (!sessionReady && !cashierToken) return <main className="grid min-h-dvh place-items-center bg-background"><Loader2 className="size-7 animate-spin text-primary" /></main>;
  if (screen === "owner") return <OwnerApp onExit={async () => { await supabase.auth.signOut(); setScreen("welcome"); }} />;
  if (screen === "cashier") return <CashierApp token={cashierToken} onExit={() => { window.history.replaceState({}, "", "/"); setScreen("welcome"); }} />;
  return <WelcomeScreen onOwner={async () => { const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin, extraParams: { prompt: "select_account" } }); if (!result.error && !result.redirected) setScreen("owner"); }} onCashier={() => setScreen("cashier")} />;
}

function WelcomeScreen({ onOwner, onCashier }: { onOwner: () => void; onCashier: () => void }) {
  return (
    <main className="min-h-dvh bg-background p-3 sm:grid sm:place-items-center sm:p-8">
      <section className="relative mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-app sm:min-h-[760px]">
        <div className="relative flex min-h-[390px] flex-1 flex-col items-center justify-center bg-brand-soft px-8 text-center">
          <SweetBackdrop />
          <div className="relative animate-rise">
            <BrandLogo />
          </div>
          <p className="relative mt-7 max-w-[270px] text-base leading-relaxed text-secondary-foreground">
            Entregas simples, cuentas claras y dulces siempre disponibles.
          </p>
        </div>
        <div className="relative space-y-3 bg-card p-6 pb-8">
          <div className="mb-5">
            <p className="font-display text-2xl font-bold text-foreground">¡Hola!</p>
            <p className="mt-1 text-sm text-muted-foreground">Elige cómo quieres entrar.</p>
          </div>
          <Button onClick={onOwner} size="lg" className="h-14 w-full rounded-xl text-base shadow-brand">
            <span className="grid size-6 place-items-center rounded-full bg-primary-foreground font-bold text-primary">G</span>
            Entrar como dueña
          </Button>
          <Button onClick={onCashier} variant="outline" size="lg" className="h-14 w-full rounded-xl border-2 text-base" disabled>
            <Store className="size-5" />
            Soy cajera de la tienda
          </Button>
          <p className="pt-2 text-center text-xs leading-relaxed text-muted-foreground">
            Las cajeras entran desde el enlace privado de la tienda.
          </p>
        </div>
      </section>
    </main>
  );
}

function OwnerApp({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<OwnerTab>("delivery");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const refresh = async () => { try { setError(""); await initializeOwner(); setData(await getOwnerData()); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudieron cargar los datos."); } };
  useEffect(() => { void refresh(); }, []);
  const tabs = [
    { id: "delivery" as const, label: "Entregas", icon: ReceiptText },
    { id: "summary" as const, label: "Resumen", icon: TrendingUp },
    { id: "alerts" as const, label: "Avisos", icon: Bell, badge: true },
    { id: "settings" as const, label: "Ajustes", icon: Settings },
  ];

  return (
    <main className="min-h-dvh bg-background pb-24">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-4 py-3 sm:px-6">
          <BrandLogo compact />
          <Button variant="ghost" size="icon" onClick={onExit} aria-label="Volver al inicio" className="size-10 rounded-full">
            <UserRound className="size-5" />
          </Button>
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-6 sm:px-6">
        {error && <div className="mb-4 rounded-xl bg-warning-soft p-4 text-sm text-warning">{error} <Button variant="ghost" size="sm" onClick={refresh}><RefreshCw /> Reintentar</Button></div>}
        {!data ? <div className="grid min-h-64 place-items-center"><Loader2 className="size-7 animate-spin text-primary" /></div> : <>
        {tab === "delivery" && <DeliveryView products={data.products} onSaved={refresh} />}
        {tab === "summary" && <SummaryView data={data} />}
        {tab === "alerts" && <AlertsView alerts={data.alerts} onChanged={refresh} />}
        {tab === "settings" && <SettingsView settings={data.settings} onChanged={refresh} onExit={onExit} />}
        </>}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-lg">
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2">
          {tabs.map(({ id, label, icon: Icon, badge }) => (
            <Button key={id} variant="ghost" onClick={() => setTab(id)} className={cn("relative h-14 flex-col gap-1 rounded-xl px-1 text-[11px]", tab === id ? "bg-brand-soft text-primary" : "text-muted-foreground")}>
              <span className="relative">
                <Icon className="size-5" strokeWidth={tab === id ? 2.5 : 2} />
                {badge && <span className="absolute -right-2 -top-1 size-2 rounded-full bg-warning" />}
              </span>
              {label}
            </Button>
          ))}
        </div>
      </nav>
    </main>
  );
}

function SectionHeader({ eyebrow, title, copy }: { eyebrow: string; title: string; copy: string }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-bold uppercase tracking-wider text-primary">{eyebrow}</p>
      <h1 className="mt-1 font-display text-3xl font-bold text-foreground">{title}</h1>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{copy}</p>
    </div>
  );
}

function DeliveryView({ products, onSaved }: { products: any[]; onSaved: () => Promise<void> }) {
  const [counts, setCounts] = useState<Record<string, number>>(() => Object.fromEntries(products.map((product) => [product.id, 0])));
  const [payment, setPayment] = useState<PaymentState>("pending");
  const [paidAmount, setPaidAmount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const total = useMemo(() => products.reduce((sum, product) => sum + (counts[product.id] ?? 0) * product.price, 0), [counts, products]);

  const changeCount = (id: string, delta: number) => {
    setSaved(false);
    setCounts((current) => ({ ...current, [id]: Math.max(0, current[id] + delta) }));
  };

  return (
    <div className="animate-fade">
       <SectionHeader eyebrow={new Intl.DateTimeFormat("es-CL", { dateStyle: "full" }).format(new Date())} title="Nueva entrega" copy="Anota lo que dejaste hoy en la tienda." />
      <div className="grid gap-5 lg:grid-cols-[1.35fr_.85fr] lg:items-start">
        <section className="surface-card p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Productos</h2>
              <p className="text-xs text-muted-foreground">Toca + o − para ajustar</p>
            </div>
             <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-bold text-primary">{Object.values(counts).reduce((a, b) => a + b, 0)} unidades</span>
          </div>
          <div className="divide-y divide-border">
            {products.map((sweet, index) => {
              const Icon = index === 2 ? Donut : Cookie;
              return (
                <div key={sweet.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 first:pt-1">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-foreground"><Icon className="size-5" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{sweet.name}</p>
                      <p className="text-xs text-muted-foreground">${sweet.price.toLocaleString("es-CL")} c/u</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-background p-1">
                     <Button variant="ghost" size="icon" className="size-8 rounded-lg" onClick={() => changeCount(sweet.id, -1)} aria-label={`Quitar ${sweet.short_name}`}><Minus /></Button>
                     <span className="w-7 text-center font-display text-base font-bold">{counts[sweet.id] ?? 0}</span>
                     <Button variant="secondary" size="icon" className="size-8 rounded-lg" onClick={() => changeCount(sweet.id, 1)} aria-label={`Agregar ${sweet.short_name}`}><Plus /></Button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <section className="receipt-card p-5">
            <div className="flex items-center gap-2 border-b border-dashed border-border pb-4">
              <ReceiptText className="size-5 text-primary" />
              <h2 className="font-display text-lg font-bold">Ticket de entrega</h2>
            </div>
            <div className="space-y-2.5 py-4">
              {products.filter((s) => (counts[s.id] ?? 0) > 0).map((sweet) => (
                <div key={sweet.id} className="grid grid-cols-[1fr_auto] gap-3 text-sm">
                   <span className="text-muted-foreground">{counts[sweet.id]} × {sweet.short_name}</span>
                   <span className="font-semibold">${((counts[sweet.id] ?? 0) * sweet.price).toLocaleString("es-CL")}</span>
                </div>
              ))}
            </div>
            <div className="flex items-end justify-between border-t border-dashed border-border pt-4">
              <span className="text-sm font-semibold text-muted-foreground">Total</span>
              <span className="font-display text-3xl font-extrabold text-foreground">${total.toLocaleString("es-CL")}</span>
            </div>
          </section>

          <section className="surface-card space-y-4 p-5">
            <label className="block text-sm font-bold text-foreground">Fecha de entrega
               <span className="mt-2 flex h-11 items-center gap-2 rounded-xl border border-input bg-background px-3 font-normal"><CalendarDays className="size-4 text-primary" />{new Date().toLocaleDateString("es-CL")}</span>
            </label>
            <div>
              <p className="mb-2 text-sm font-bold">¿Te pagaron?</p>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
                {(["pending", "partial", "paid"] as PaymentState[]).map((state) => (
                  <Button key={state} variant="ghost" className={cn("h-9 rounded-lg px-1 text-xs", payment === state && "bg-card text-foreground shadow-sm")} onClick={() => setPayment(state)}>
                    {state === "pending" ? "Pendiente" : state === "partial" ? "Parcial" : "Pagado"}
                  </Button>
                ))}
              </div>
            </div>
            {payment === "partial" && (
              <label className="block text-sm font-bold">Monto recibido
                <input value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} type="number" className="mt-2 h-11 w-full rounded-xl border border-input bg-background px-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
              </label>
            )}
            <label className="block text-sm font-bold">Nota <span className="font-normal text-muted-foreground">(opcional)</span>
               <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ej: dejar en vitrina principal" className="mt-2 min-h-20 w-full resize-none rounded-xl border border-input bg-background p-3 font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
            </label>
             {error && <p className="text-sm text-destructive">{error}</p>}
             <Button disabled={saving || total === 0} className="h-12 w-full rounded-xl text-base shadow-brand" onClick={async () => { try { setSaving(true); setError(""); await saveDelivery({ data: { deliveredOn: new Date().toISOString().slice(0, 10), note, paymentStatus: payment, paidAmount, items: products.filter((p) => (counts[p.id] ?? 0) > 0).map((p) => ({ productId: p.id, quantity: counts[p.id], unitPrice: p.price })) } }); setSaved(true); await onSaved(); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo guardar."); } finally { setSaving(false); } }}>
               {saving ? <><Loader2 className="animate-spin" /> Guardando…</> : saved ? <><CheckCircle2 /> Entrega registrada</> : <><PackageCheck /> Registrar entrega</>}
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SummaryView({ data }: { data: any }) {
  const month = new Date().toISOString().slice(0, 7);
  const deliveries = data.deliveries.filter((delivery: any) => delivery.delivered_on.startsWith(month));
  const delivered = deliveries.reduce((sum: number, item: any) => sum + item.total, 0);
  const paid = deliveries.reduce((sum: number, item: any) => sum + item.paid_amount, 0);
  const productCounts = new Map<string, number>();
  deliveries.forEach((delivery: any) => delivery.delivery_items.forEach((item: any) => productCounts.set(item.product_id, (productCounts.get(item.product_id) ?? 0) + item.quantity)));
  const maxProduct = Math.max(1, ...productCounts.values());
  const ranking = Object.entries(data.alerts.reduce((acc: Record<string, number>, alert: any) => ({ ...acc, [alert.product_name]: (acc[alert.product_name] ?? 0) + 1 }), {})).sort((a: any, b: any) => b[1] - a[1]);
  return (
    <div className="animate-fade">
      <SectionHeader eyebrow={new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(new Date())} title="Resumen del mes" copy="Todo lo importante, de un vistazo." />
      <div className="grid gap-3 sm:grid-cols-3">
         <Metric label="Entregado" value={`$${delivered.toLocaleString("es-CL")}`} icon={ShoppingBag} />
         <Metric label="Cobrado" value={`$${paid.toLocaleString("es-CL")}`} icon={CheckCircle2} success />
         <Metric label="Por cobrar" value={`$${(delivered - paid).toLocaleString("es-CL")}`} icon={CreditCard} warning />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="surface-card p-5">
          <div className="mb-6 flex items-center justify-between"><div><h2 className="font-display text-lg font-bold">Ventas por producto</h2><p className="text-xs text-muted-foreground">Unidades entregadas</p></div><LayoutGrid className="size-5 text-primary" /></div>
          <div className="flex h-48 items-end justify-around gap-3 border-b border-border px-2">
            {data.products.map((sweet: any) => (
              <div key={sweet.id} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                <span className="text-xs font-bold">{productCounts.get(sweet.id) ?? 0}</span>
                <div className="w-full max-w-12 rounded-t-lg bg-primary transition-all duration-700" style={{ height: `${((productCounts.get(sweet.id) ?? 0) / maxProduct) * 100}%` }} />
                <span className="h-8 text-center text-[10px] leading-tight text-muted-foreground">{sweet.short_name}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="surface-card p-5">
          <div className="mb-6"><h2 className="font-display text-lg font-bold">Movimiento por día</h2><p className="text-xs text-muted-foreground">Última semana</p></div>
          <div className="flex h-48 items-end gap-2 border-b border-border px-1">
            {[0,1,2,3,4,5,6].map((day) => { const count = deliveries.filter((d: any) => new Date(`${d.delivered_on}T12:00:00`).getDay() === day).length; return <div key={day} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="w-full rounded-t-md bg-brand-soft transition-all duration-700" style={{ height: `${Math.max(4, count * 20)}%` }} /><span className="text-[10px] text-muted-foreground">{["D", "L", "M", "M", "J", "V", "S"][day]}</span></div>; })}
          </div>
        </section>
      </div>
      <section className="mt-5 surface-card p-5">
        <h2 className="font-display text-lg font-bold">Los que más se acaban</h2>
        <p className="mb-4 text-xs text-muted-foreground">Avisos recibidos este mes</p>
         {ranking.slice(0, 3).map(([name, count]: any, index: number) => (
           <div key={name} className="flex items-center gap-3 border-t border-border py-3 first:border-0">
            <span className={cn("grid size-8 place-items-center rounded-full font-display text-sm font-bold", index === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</span>
             <span className="flex-1 font-semibold">{name}</span><span className="text-sm text-muted-foreground">{count} avisos</span>
          </div>
        ))}
      </section>
      <AiAdvisor />
    </div>
  );
}

function Metric({ label, value, icon: Icon, success, warning }: { label: string; value: string; icon: typeof ShoppingBag; success?: boolean; warning?: boolean }) {
  return <div className="surface-card p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold text-muted-foreground">{label}</span><span className={cn("grid size-8 place-items-center rounded-lg bg-brand-soft text-primary", success && "bg-success-soft text-success", warning && "bg-warning-soft text-warning")}><Icon className="size-4" /></span></div><p className="mt-4 font-display text-2xl font-bold">{value}</p></div>;
}

function AlertsView() {
  const [handled, setHandled] = useState<number[]>([3]);
  const alerts = [
    { id: 1, product: "Cuchuflí", note: "Quedan solo 3 en la vitrina", time: "Hace 18 min" },
    { id: 2, product: "Mini donas", note: "Se vendieron casi todas", time: "Hace 1 hora" },
    { id: 3, product: "Galletas", note: "Ya fueron repuestas", time: "Ayer, 17:42" },
  ];
  const pending = alerts.filter((alert) => !handled.includes(alert.id));
  return (
    <div className="animate-fade">
      <SectionHeader eyebrow={`${pending.length} pendientes`} title="Avisos de la tienda" copy="Revisa qué dulce necesita reposición." />
      <div className="space-y-3">
        {alerts.map((alert) => {
          const done = handled.includes(alert.id);
          return <article key={alert.id} className={cn("surface-card grid grid-cols-[auto_minmax(0,1fr)] gap-3 p-4 transition", done && "opacity-60")}><span className={cn("grid size-11 place-items-center rounded-xl", done ? "bg-success-soft text-success" : "bg-warning-soft text-warning")}>{done ? <Check className="size-5" /> : <AlertCircle className="size-5" />}</span><div className="min-w-0"><div className="flex items-start justify-between gap-2"><h2 className="font-display text-base font-bold">{alert.product}</h2><span className="shrink-0 text-[11px] text-muted-foreground">{alert.time}</span></div><p className="mt-1 text-sm text-muted-foreground">{alert.note}</p>{!done && <Button variant="outline" size="sm" className="mt-3 rounded-lg" onClick={() => setHandled((current) => [...current, alert.id])}><Check className="size-3.5" /> Marcar atendido</Button>}{done && <span className="mt-2 inline-flex text-xs font-bold text-success">Atendido</span>}</div></article>;
        })}
      </div>
    </div>
  );
}

function SettingsView() {
  const rows = [
    { icon: Store, title: "Nombre de la tienda", value: "Almacén Las Rosas" },
    { icon: Cookie, title: "Productos y precios", value: "4 productos activos" },
    { icon: UsersRound, title: "Trabajadoras", value: "Camila, Andrea y Sofía" },
    { icon: Bell, title: "Notificaciones", value: "WhatsApp" },
    { icon: CreditCard, title: "Número de WhatsApp", value: "+56 9 •••• 4821" },
  ];
  return (
    <div className="animate-fade">
      <SectionHeader eyebrow="Preferencias" title="Ajustes" copy="Administra los datos de la tienda y tus avisos." />
      <section className="surface-card overflow-hidden">
        {rows.map(({ icon: Icon, title, value }) => <Button key={title} variant="ghost" className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-none border-b border-border p-4 text-left last:border-0"><span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-primary"><Icon className="size-4" /></span><span className="min-w-0"><span className="block text-sm font-bold">{title}</span><span className="block truncate text-xs font-normal text-muted-foreground">{value}</span></span><ChevronRight className="size-4 text-muted-foreground" /></Button>)}
      </section>
      <Button variant="outline" className="mt-5 h-11 w-full rounded-xl">Cerrar sesión</Button>
    </div>
  );
}

function CashierApp({ onExit }: { onExit: () => void }) {
  const [selected, setSelected] = useState<Sweet | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState<SweetId[]>(["cuchufli"]);

  const sendAlert = () => {
    if (!selected) return;
    setPending((current) => current.includes(selected.id) ? current : [...current, selected.id]);
    setSent(true);
  };

  const closeFlow = () => { setSelected(null); setSent(false); };

  if (sent && selected) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background p-5">
        <section className="w-full max-w-sm text-center animate-rise">
          <div className="mx-auto grid size-24 place-items-center rounded-full bg-success-soft text-success"><Check className="size-11" strokeWidth={2.5} /></div>
          <p className="mt-7 text-xs font-bold uppercase tracking-wider text-success">Aviso enviado</p>
          <h1 className="mt-2 font-display text-3xl font-bold">¡Listo! Ya avisamos</h1>
          <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">La dueña verá que se están acabando los <strong className="text-foreground">{selected.shortName.toLowerCase()}</strong>.</p>
          <Button className="mt-8 h-13 w-full rounded-xl shadow-brand"><Bell /> Reenviar por WhatsApp</Button>
          <Button variant="ghost" className="mt-2 h-12 w-full rounded-xl" onClick={closeFlow}>Volver a los dulces</Button>
        </section>
      </main>
    );
  }

  if (selected) {
    const Icon = selected.icon;
    return (
      <main className="min-h-dvh bg-background">
        <header className="border-b border-border bg-card"><div className="mx-auto flex max-w-lg items-center px-4 py-3"><Button variant="ghost" size="icon" onClick={closeFlow} aria-label="Volver" className="rounded-full"><ArrowLeft /></Button><span className="ml-3 font-display text-lg font-bold">Enviar aviso</span></div></header>
        <div className="mx-auto max-w-lg px-5 py-8 animate-fade">
          <div className="flex items-center gap-4"><span className={cn("grid size-16 place-items-center rounded-2xl", selected.tone)}><Icon className="size-8" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-primary">Se está acabando</p><h1 className="font-display text-2xl font-bold">{selected.shortName}</h1></div></div>
          <label className="mt-8 block font-display text-lg font-bold">¿Quieres agregar algo? <span className="font-sans text-xs font-normal text-muted-foreground">Opcional</span><textarea autoFocus placeholder="Ej: quedan solo 2 unidades" className="mt-3 min-h-32 w-full resize-none rounded-2xl border-2 border-input bg-card p-4 font-sans text-base font-normal outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" /></label>
          <Button onClick={sendAlert} className="mt-5 h-14 w-full rounded-xl text-base shadow-brand"><Bell className="size-5" /> Enviar aviso</Button>
          <p className="mt-4 text-center text-xs text-muted-foreground">La dueña recibirá el aviso al instante.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-background pb-8">
      <header className="relative overflow-hidden bg-brand-soft"><SweetBackdrop /><div className="relative mx-auto flex max-w-lg items-center justify-between px-5 py-5"><BrandLogo compact /><Button variant="ghost" size="icon" onClick={onExit} aria-label="Ir al inicio" className="rounded-full"><Home /></Button></div></header>
      <div className="mx-auto max-w-lg px-5 pt-8">
        <p className="text-xs font-bold uppercase tracking-wider text-primary">Almacén Las Rosas</p>
        <h1 className="mt-1 font-display text-3xl font-bold">¿Qué se está acabando?</h1>
        <p className="mt-2 text-sm text-muted-foreground">Toca el dulce y envía el aviso.</p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          {sweets.map((sweet) => {
            const Icon = sweet.icon;
            const isPending = pending.includes(sweet.id);
            return (
              <Button key={sweet.id} variant="outline" onClick={() => setSelected(sweet)} className="relative h-44 flex-col justify-between overflow-hidden rounded-2xl border-2 bg-card p-4 text-left shadow-sm transition-transform active:scale-[0.98]">
                {isPending && <span className="absolute right-3 top-3 rounded-full bg-warning-soft px-2 py-1 text-[10px] font-bold text-warning">Avisado</span>}
                <span className={cn("grid size-14 place-items-center rounded-2xl text-foreground", sweet.tone)}><Icon className="size-7" /></span>
                <span className="w-full whitespace-normal"><span className="block font-display text-lg font-bold leading-tight">{sweet.shortName}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">{sweet.subtitle}</span></span>
              </Button>
            );
          })}
        </div>
        {pending.length > 0 && <div className="mt-5 flex items-center gap-3 rounded-xl bg-warning-soft p-3 text-sm text-warning"><AlertCircle className="size-5 shrink-0" /><span>Ya hay {pending.length} aviso{pending.length > 1 ? "s" : ""} pendiente{pending.length > 1 ? "s" : ""}.</span></div>}
      </div>
    </main>
  );
}
