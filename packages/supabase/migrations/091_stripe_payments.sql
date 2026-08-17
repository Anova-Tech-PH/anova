-- =============================================================================
-- Migration 091: Stripe Payments — Orders, Refunds, Stripe Connect columns
-- =============================================================================

-- =====================
-- 1. ADD STRIPE CONNECT COLUMNS
-- =====================

-- Org-level Stripe Connect account
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- Per-event override (future use)
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;

-- =====================
-- 2. ORDERS TABLE
-- =====================

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  amount_total INTEGER NOT NULL,
  amount_discount INTEGER NOT NULL DEFAULT 0,
  amount_refunded INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'refunded', 'partially_refunded')),
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_orders_event_id ON public.orders(event_id);
CREATE INDEX idx_orders_registration_id ON public.orders(registration_id);

-- =====================
-- 3. ORDER_REFUNDS TABLE
-- =====================

CREATE TABLE public.order_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  stripe_refund_id TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL,
  reason TEXT,
  refunded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.order_refunds ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_refunds_order_id ON public.order_refunds(order_id);

-- =====================
-- 4. ADD order_id TO REGISTRATIONS
-- =====================

ALTER TABLE public.registrations
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id);

-- =====================
-- 5. GRANTS
-- =====================

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT SELECT, INSERT ON public.order_refunds TO authenticated;

GRANT ALL ON public.orders TO service_role;
GRANT ALL ON public.order_refunds TO service_role;

-- =====================
-- 6. RLS POLICIES — ORDERS
-- =====================

-- Organizers can view all orders for their events
CREATE POLICY "Org members can view orders"
  ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = orders.event_id
    AND public.is_org_member(e.organization_id)
  ));

-- Organizers (editor+) can update orders (e.g. mark refunded)
CREATE POLICY "Org editors can update orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    WHERE e.id = orders.event_id
    AND public.is_org_member(e.organization_id, 'editor')
  ));

-- Attendees can view their own orders via registration.user_id
CREATE POLICY "Attendees can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.registrations r
    WHERE r.id = orders.registration_id
    AND r.user_id = auth.uid()
  ));

-- Service role inserts orders (via webhook / server action), so no INSERT policy needed
-- for authenticated users directly. But we grant INSERT so server-side with service_role works.

-- =====================
-- 7. RLS POLICIES — ORDER_REFUNDS
-- =====================

-- Organizers (editor+) can view refunds
CREATE POLICY "Org editors can view refunds"
  ON public.order_refunds FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
    WHERE o.id = order_refunds.order_id
    AND public.is_org_member(e.organization_id, 'editor')
  ));

-- Organizers (editor+) can create refunds
CREATE POLICY "Org editors can create refunds"
  ON public.order_refunds FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.events e ON e.id = o.event_id
    WHERE o.id = order_refunds.order_id
    AND public.is_org_member(e.organization_id, 'editor')
  ));
