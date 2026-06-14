import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plan } = await req.json();
    if (!['monthly', 'annual'].includes(plan)) {
      return Response.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const WIX_API_KEY = Deno.env.get('WIX_PAYMENTS_API_KEY');
    const WIX_SITE_ID = Deno.env.get('WIX_PAYMENTS_SITE_ID');
    const origin = req.headers.get('Origin') || 'https://app.base44.com';

    const isMonthly = plan === 'monthly';
    const item = {
      name: isMonthly ? 'VibeCheck Pro – Monthly' : 'VibeCheck Pro – Annual',
      quantity: 1,
      price: isMonthly ? '5.99' : '44.99',
      subscriptionInfo: {
        subscriptionSettings: {
          frequency: isMonthly ? 'MONTH' : 'YEAR',
        },
        title: isMonthly ? 'VibeCheck Pro Monthly' : 'VibeCheck Pro Annual',
        description: 'Priority placement, profile badge, connection analytics & more.',
      },
    };

    const checkoutRes = await fetch(
      'https://www.wixapis.com/payments/platform/v1/checkout-sessions/construct',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: WIX_API_KEY,
          'wix-site-id': WIX_SITE_ID,
        },
        body: JSON.stringify({
          cart: {
            items: [item],
            customerInfo: {
              email: user.email,
              firstName: user.full_name?.split(' ')[0] || '',
              lastName: user.full_name?.split(' ').slice(1).join(' ') || '',
            },
          },
          callbackUrls: {
            postFlowUrl: `${origin}/pro`,
            thankYouPageUrl: `${origin}/pro?status=confirming`,
          },
        }),
      }
    );

    if (!checkoutRes.ok) {
      const err = await checkoutRes.text();
      console.error('Wix checkout error:', err);
      return Response.json({ error: 'Failed to create checkout' }, { status: 500 });
    }

    const { checkoutSession } = await checkoutRes.json();

    // Persist pending record so webhook can correlate back to this user
    await base44.asServiceRole.entities.User.update(user.id, {
      pro_status: 'pending',
      pro_checkout_id: checkoutSession.id,
      pro_plan: plan,
    });

    return Response.json({ redirectUrl: checkoutSession.redirectUrl });
  } catch (error) {
    console.error('createCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});