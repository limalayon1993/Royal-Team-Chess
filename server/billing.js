/**
 * ==============================================================================
 * ROYAL TEAM CHESS - MÓDULO DE FACTURACIÓN Y MONETIZACIÓN (STRIPE BILLING)
 * ==============================================================================
 * Pilar 6 de PRD_VERSION_1.0.md - Fase 1.0-A
 * 
 * Reglas de Arquitectura:
 * - Aislamiento modular: Lógica de pagos completamente desacoplada del motor de ajedrez.
 * - Modo Simulación Seguro (Mock Fallback): Respuesta automática y navegación local
 *   ininterrumpida si STRIPE_SECRET_KEY no está configurada o es demo.
 * - Soporte para Tiers oficiales:
 *   * Nivel 1: Gratis (Free-to-Play, banners pasivos)
 *   * Nivel 2: Básica (5,00 € / mes, sin anuncios, torneos oficiales)
 *   * Nivel 3: Profesional (10,00 € / mes, clubes de 16 jugadores, circuito pro)
 * ==============================================================================
 */

const Stripe = require('stripe');
const db = require('./db');

/**
 * Determina si el backend debe operar en modo simulación / mock fallback
 * @returns {boolean}
 */
function isSimulationMode() {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key || typeof key !== 'string') return true;
    const trimmed = key.trim();
    if (trimmed === '' || trimmed === 'mock' || trimmed.startsWith('sk_test_...')) return true;
    if (process.env.STRIPE_SIMULATION === 'true') return true;
    return false;
}

/**
 * Instancia perezosa (lazy) del cliente oficial de Stripe
 * @returns {Stripe|null}
 */
let stripeInstance = null;
function getStripeClient() {
    if (isSimulationMode()) return null;
    if (!stripeInstance) {
        try {
            stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        } catch (err) {
            console.error('[Billing] Error instanciando cliente de Stripe:', err.message);
            return null;
        }
    }
    return stripeInstance;
}

/**
 * Normaliza y valida el nivel de suscripción
 * @param {string} tier 
 * @param {string} [priceId] 
 * @returns {'basic'|'pro'}
 */
function resolveTier(tier, priceId) {
    if (tier && String(tier).toLowerCase() === 'pro') return 'pro';
    if (tier && String(tier).toLowerCase() === 'basic') return 'basic';

    const proPrice = process.env.STRIPE_PRICE_ID_PRO;
    if (priceId && proPrice && priceId === proPrice) return 'pro';

    return 'basic';
}

/**
 * POST /api/billing/create-checkout-session
 * Genera una sesión de Stripe Checkout o redirige en modo simulación
 */
async function createCheckoutSession(req, res) {
    const { userId, priceId, tier, returnUrl } = req.body || {};

    if (!userId) {
        return res.status(400).json({ error: 'Falta el parámetro requerido: userId' });
    }

    // 1. Validar la existencia del usuario en Supabase (profiles)
    let userProfile = null;
    if (typeof db.getUserProfile === 'function') {
        userProfile = await db.getUserProfile(userId);
    }

    const isMockUser = isSimulationMode() && (
        String(userId).startsWith('mock_') || 
        String(userId).startsWith('test_') || 
        userId === 'demo'
    );

    if (db.isConnected() && !userProfile && !isMockUser) {
        return res.status(404).json({ error: `Usuario con identificador "${userId}" no encontrado en profiles` });
    }

    // 2. Determinar tier y precios oficiales (PRD Pilar 6: Básica 5€/mes, Pro 10€/mes)
    const resolvedTierValue = resolveTier(tier, priceId);
    const envPriceId = resolvedTierValue === 'pro' 
        ? process.env.STRIPE_PRICE_ID_PRO 
        : process.env.STRIPE_PRICE_ID_BASIC;
    const effectivePriceId = (priceId && !priceId.startsWith('price_...')) 
        ? priceId 
        : (envPriceId && !envPriceId.startsWith('price_...') ? envPriceId : null);

    const actualUserId = userProfile ? userProfile.id : userId;
    const actualUsername = userProfile ? userProfile.username : 'player';

    // 3. MODO SIMULACIÓN SEGURO (MOCK FALLBACK)
    if (isSimulationMode()) {
        console.log(`[Billing] [MODO SIMULACIÓN] createCheckoutSession para usuario "${actualUsername}" (${actualUserId}) - Tier: ${resolvedTierValue}`);
        
        const fallbackBase = returnUrl || process.env.CLIENT_URL || 'http://localhost:5173/profile';
        let directSuccessUrl;
        try {
            const parsedUrl = new URL(fallbackBase, 'http://localhost:5173');
            parsedUrl.searchParams.set('checkout_status', 'success');
            parsedUrl.searchParams.set('session_id', `mock_session_${Date.now()}`);
            parsedUrl.searchParams.set('tier', resolvedTierValue);
            directSuccessUrl = parsedUrl.toString();
        } catch {
            const sep = fallbackBase.includes('?') ? '&' : '?';
            directSuccessUrl = `${fallbackBase}${sep}checkout_status=success&session_id=mock_session_${Date.now()}&tier=${resolvedTierValue}`;
        }

        return res.status(200).json({
            url: directSuccessUrl,
            sessionId: `mock_session_${Date.now()}`,
            tier: resolvedTierValue,
            mock: true,
            message: 'Stripe en modo simulación (claves no configuradas). URL directa de éxito provista para pruebas locales.'
        });
    }

    // 4. MODO OFICIAL STRIPE
    const stripe = getStripeClient();
    if (!stripe) {
        return res.status(500).json({ error: 'Error al inicializar el cliente de Stripe' });
    }

    try {
        let lineItems;
        if (effectivePriceId && effectivePriceId.startsWith('price_')) {
            lineItems = [{ price: effectivePriceId, quantity: 1 }];
        } else {
            // Precios dinámicos en EUR respaldados por el PRD (Básica: 5,00 € / mes, Pro: 10,00 € / mes)
            const isPro = resolvedTierValue === 'pro';
            lineItems = [{
                price_data: {
                    currency: 'eur',
                    product_data: {
                        name: isPro 
                            ? 'Royal Team Chess - Suscripción Profesional' 
                            : 'Royal Team Chess - Suscripción Básica',
                        description: isPro 
                            ? 'Acceso a Clubes de 16 jugadores, Circuito Profesional y Selecciones Nacionales (10,00 € / mes)'
                            : 'Eliminación Total de Publicidad, Torneos Oficiales RTC y Condecoraciones (5,00 € / mes)'
                    },
                    unit_amount: isPro ? 1000 : 500, // En céntimos de EUR (1000 = 10,00 €, 500 = 5,00 €)
                    recurring: { interval: 'month' }
                },
                quantity: 1
            }];
        }

        const baseReturn = returnUrl || process.env.CLIENT_URL || 'http://localhost:5173/profile';
        const sep = baseReturn.includes('?') ? '&' : '?';
        const successUrl = `${baseReturn}${sep}session_id={CHECKOUT_SESSION_ID}&checkout_status=success&tier=${resolvedTierValue}`;
        const cancelUrl = `${baseReturn}${sep}checkout_status=cancelled`;

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: lineItems,
            client_reference_id: actualUserId,
            customer_email: userProfile?.email || undefined,
            metadata: {
                userId: actualUserId,
                username: actualUsername,
                tier: resolvedTierValue
            },
            subscription_data: {
                metadata: {
                    userId: actualUserId,
                    username: actualUsername,
                    tier: resolvedTierValue
                }
            },
            success_url: successUrl,
            cancel_url: cancelUrl
        });

        return res.status(200).json({
            url: session.url,
            sessionId: session.id,
            tier: resolvedTierValue
        });
    } catch (err) {
        console.error('[Billing] Error creando sesión en Stripe Checkout:', err);
        return res.status(500).json({ error: `Stripe Checkout Error: ${err.message}` });
    }
}

/**
 * POST /api/webhooks/stripe
 * Recibe eventos autoritativos de Stripe y actualiza la persistencia
 */
async function handleWebhook(req, res) {
    let event;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const isMockWebhook = isSimulationMode() || !webhookSecret || webhookSecret.includes('whsec_...');

    if (isMockWebhook) {
        // En modo simulación o entorno de desarrollo local sin webhook secret configurado
        try {
            event = typeof req.body === 'string' || Buffer.isBuffer(req.body)
                ? JSON.parse(req.body.toString('utf8'))
                : req.body;
            console.log(`[Stripe Webhook] [SIMULACIÓN] Procesando evento sin validación de firma: ${event?.type}`);
        } catch (err) {
            console.error('[Stripe Webhook] Error parseando payload de simulación:', err.message);
            return res.status(400).json({ error: 'Payload JSON inválido' });
        }
    } else {
        const sig = req.headers['stripe-signature'];
        if (!sig) {
            console.warn('[Stripe Webhook] Encabezado stripe-signature ausente');
            return res.status(400).send('Missing stripe-signature header');
        }

        const stripe = getStripeClient();
        try {
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('[Stripe Webhook] Verificación de firma fallida:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }
    }

    if (!event || !event.type) {
        return res.status(400).json({ error: 'Evento de webhook malformado' });
    }

    try {
        switch (event.type) {
            // 1. Pago y suscripción completada con éxito
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id || session.metadata?.userId;
                const tier = session.metadata?.tier || 'basic';
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                console.log(`[Stripe Webhook] checkout.session.completed -> Usuario: ${userId}, Tier: ${tier}`);

                if (userId) {
                    await db.updateUserTier(userId, tier);
                    await db.saveSubscription({
                        userId,
                        plan: tier,
                        status: 'active',
                        customerId,
                        subscriptionId
                    });
                } else {
                    console.warn('[Stripe Webhook] checkout.session.completed recibido sin userId identificable');
                }
                break;
            }

            // 2. Suscripción cancelada o finalizada
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                let userId = subscription.metadata?.userId;
                const customerId = subscription.customer;
                const subscriptionId = subscription.id;

                if (!userId && customerId && typeof db.getUserIdByStripeCustomer === 'function') {
                    userId = await db.getUserIdByStripeCustomer(customerId);
                }

                console.log(`[Stripe Webhook] customer.subscription.deleted -> Usuario: ${userId || customerId}`);

                if (userId) {
                    await db.updateUserTier(userId, 'free');
                    await db.saveSubscription({
                        userId,
                        plan: 'free',
                        status: 'canceled',
                        customerId,
                        subscriptionId
                    });
                } else {
                    console.warn(`[Stripe Webhook] customer.subscription.deleted: No se pudo resolver userId para el cliente ${customerId}`);
                }
                break;
            }

            // 3. Suscripción modificada o cambio de estado
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                let userId = subscription.metadata?.userId;
                const customerId = subscription.customer;
                const status = subscription.status; // 'active', 'past_due', 'unpaid', 'canceled'
                const tier = subscription.metadata?.tier || 'basic';

                if (!userId && customerId && typeof db.getUserIdByStripeCustomer === 'function') {
                    userId = await db.getUserIdByStripeCustomer(customerId);
                }

                console.log(`[Stripe Webhook] customer.subscription.updated -> Estado: ${status}, Usuario: ${userId || customerId}`);

                if (userId) {
                    if (status === 'active') {
                        await db.updateUserTier(userId, tier);
                        await db.saveSubscription({
                            userId,
                            plan: tier,
                            status: 'active',
                            customerId,
                            subscriptionId: subscription.id
                        });
                    } else if (['canceled', 'unpaid', 'past_due'].includes(status)) {
                        await db.updateUserTier(userId, 'free');
                        await db.saveSubscription({
                            userId,
                            plan: 'free',
                            status: status,
                            customerId,
                            subscriptionId: subscription.id
                        });
                    }
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Evento ignorado (no requiere acción): ${event.type}`);
                break;
        }

        return res.status(200).json({ received: true });
    } catch (err) {
        console.error('[Stripe Webhook] Excepción procesando evento:', err);
        return res.status(500).json({ error: 'Error interno en procesamiento de webhook' });
    }
}

/**
 * POST /api/billing/customer-portal
 * Genera un enlace seguro a Stripe Customer Portal o mock fallback
 */
async function createCustomerPortal(req, res) {
    const { userId, returnUrl } = req.body || {};

    if (!userId) {
        return res.status(400).json({ error: 'Falta el parámetro requerido: userId' });
    }

    const fallbackUrl = returnUrl || process.env.CLIENT_URL || 'http://localhost:5173/profile';

    // MODO SIMULACIÓN SEGURO
    if (isSimulationMode()) {
        console.log(`[Billing] [MODO SIMULACIÓN] createCustomerPortal para usuario: ${userId}`);
        let portalUrl;
        try {
            const parsedUrl = new URL(fallbackUrl, 'http://localhost:5173');
            parsedUrl.searchParams.set('portal', 'simulated');
            parsedUrl.searchParams.set('userId', userId);
            portalUrl = parsedUrl.toString();
        } catch {
            const sep = fallbackUrl.includes('?') ? '&' : '?';
            portalUrl = `${fallbackUrl}${sep}portal=simulated&userId=${userId}`;
        }

        return res.status(200).json({
            url: portalUrl,
            mock: true,
            message: 'Stripe en modo simulación. Se devuelve enlace simulado al portal de gestión.'
        });
    }

    // MODO OFICIAL STRIPE
    const stripe = getStripeClient();
    if (!stripe) {
        return res.status(500).json({ error: 'Error al inicializar el cliente de Stripe' });
    }

    try {
        let customerId = null;

        // 1. Buscar customerId en la base de datos
        if (typeof db.getSubscriptionByUserId === 'function') {
            const sub = await db.getSubscriptionByUserId(userId);
            if (sub && sub.stripe_customer_id) {
                customerId = sub.stripe_customer_id;
            }
        }

        // 2. Si no está en BD, buscar en Stripe por metadata
        if (!customerId) {
            const search = await stripe.customers.search({
                query: `metadata['userId']:'${userId}'`
            });
            if (search.data && search.data.length > 0) {
                customerId = search.data[0].id;
            }
        }

        if (!customerId) {
            return res.status(404).json({ error: 'No se encontró un cliente de Stripe activo asociado a este usuario' });
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: fallbackUrl
        });

        return res.status(200).json({ url: portalSession.url });
    } catch (err) {
        console.error('[Billing] Error creando sesión en Stripe Customer Portal:', err);
        return res.status(500).json({ error: `Customer Portal Error: ${err.message}` });
    }
}

/**
 * GET /api/billing/status
 * Devuelve el estado de configuración de facturación y tiers disponibles
 */
function getBillingStatus(req, res) {
    const simMode = isSimulationMode();
    return res.status(200).json({
        status: 'ok',
        simulationMode: simMode,
        stripeConfigured: !simMode,
        priceIdBasicConfigured: !!(process.env.STRIPE_PRICE_ID_BASIC && !process.env.STRIPE_PRICE_ID_BASIC.includes('price_...')),
        priceIdProConfigured: !!(process.env.STRIPE_PRICE_ID_PRO && !process.env.STRIPE_PRICE_ID_PRO.includes('price_...')),
        webhookSecretConfigured: !!(process.env.STRIPE_WEBHOOK_SECRET && !process.env.STRIPE_WEBHOOK_SECRET.includes('whsec_...')),
        tiers: [
            { id: 'free', name: 'Nivel 1: GRATIS', price: 0, currency: 'EUR', interval: 'infinite' },
            { id: 'basic', name: 'Nivel 2: BÁSICA', price: 5.00, currency: 'EUR', interval: 'month' },
            { id: 'pro', name: 'Nivel 3: PROFESIONAL', price: 10.00, currency: 'EUR', interval: 'month' }
        ]
    });
}

module.exports = {
    isSimulationMode,
    createCheckoutSession,
    handleWebhook,
    createCustomerPortal,
    getBillingStatus
};
