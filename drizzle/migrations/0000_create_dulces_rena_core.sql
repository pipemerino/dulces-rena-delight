CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.owner_access (
  user_id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.owner_access TO authenticated;
GRANT ALL ON public.owner_access TO service_role;
ALTER TABLE public.owner_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read own access" ON public.owner_access FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.owner_access WHERE user_id = _user_id)
$$;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;

CREATE TABLE public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL UNIQUE,
  store_name text NOT NULL DEFAULT 'Almacén Las Rosas',
  whatsapp_number text NOT NULL DEFAULT '',
  notification_channel text NOT NULL DEFAULT 'whatsapp',
  workers text[] NOT NULL DEFAULT '{}',
  cashier_token_hash text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_settings TO authenticated;
GRANT ALL ON public.store_settings TO service_role;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage settings" ON public.store_settings FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.is_owner(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.is_owner(auth.uid()));

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  short_name text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage products" ON public.products FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.is_owner(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.is_owner(auth.uid()));

CREATE TABLE public.deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  delivered_on date NOT NULL DEFAULT current_date,
  note text,
  payment_status text NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending','partial','paid')),
  paid_amount integer NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  total integer NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.deliveries TO authenticated;
GRANT ALL ON public.deliveries TO service_role;
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage deliveries" ON public.deliveries FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.is_owner(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.is_owner(auth.uid()));

CREATE TABLE public.delivery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price integer NOT NULL CHECK (unit_price >= 0),
  subtotal integer GENERATED ALWAYS AS (quantity * unit_price) STORED
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.delivery_items TO authenticated;
GRANT ALL ON public.delivery_items TO service_role;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage delivery items" ON public.delivery_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND d.owner_id = auth.uid() AND public.is_owner(auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.deliveries d WHERE d.id = delivery_id AND d.owner_id = auth.uid() AND public.is_owner(auth.uid())));

CREATE TABLE public.stock_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id),
  product_name text NOT NULL,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','attended')),
  whatsapp_status text NOT NULL DEFAULT 'not_started' CHECK (whatsapp_status IN ('not_started','opening','sent','error')),
  created_at timestamptz NOT NULL DEFAULT now(),
  attended_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_alerts TO authenticated;
GRANT ALL ON public.stock_alerts TO service_role;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage alerts" ON public.stock_alerts FOR ALL TO authenticated USING (owner_id = auth.uid() AND public.is_owner(auth.uid())) WITH CHECK (owner_id = auth.uid() AND public.is_owner(auth.uid()));

CREATE INDEX deliveries_owner_date_idx ON public.deliveries(owner_id, delivered_on DESC);
CREATE INDEX alerts_owner_status_idx ON public.stock_alerts(owner_id, status, created_at DESC);