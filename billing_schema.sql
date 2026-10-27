-- ==============================================================================
-- ROYAL TEAM CHESS - ESQUEMA DE FACTURACIÓN Y SUSCRIPCIONES (PILAR 6)
-- ==============================================================================
-- Este script complementa el esquema de Supabase para soportar los tres niveles
-- comerciales definidos en PRD_VERSION_1.0.md:
--   * 'free': Gratuito con anuncios pasivos
--   * 'basic': Básica 5,00 €/mes (ad-free, torneos oficiales RTC, medallas)
--   * 'pro': Profesional 10,00 €/mes (clubes de 16 jugadores, selecciones nacionales)
-- ==============================================================================

-- 1. Añadir columna 'tier' a la tabla 'profiles' (si no existe)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'free' CHECK (tier IN ('free', 'basic', 'pro'));

-- 2. Asegurar que usuarios existentes tengan asignado el tier 'free' por defecto
UPDATE public.profiles 
SET tier = 'free' 
WHERE tier IS NULL;

-- 3. Crear tabla autoritativa de suscripciones ('subscriptions')
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan TEXT DEFAULT 'basic' CHECK (plan IN ('free', 'basic', 'pro')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'unpaid', 'incomplete')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
);

-- 4. Habilitar Row Level Security (RLS) en la tabla de suscripciones
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. Política RLS Idempotente: Los usuarios autenticados pueden consultar su propia suscripción
DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
CREATE POLICY "Users can read own subscription"
ON public.subscriptions FOR SELECT
USING (auth.uid() = user_id);

-- 6. Índices de rendimiento para búsquedas rápidas por cliente de Stripe y por tier
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer 
ON public.subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_profiles_tier 
ON public.profiles(tier);
