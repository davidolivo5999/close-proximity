import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import * as jose from 'npm:jose@5.9.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const PUBLIC_KEY_PEM = Deno.env.get('WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
    if (!PUBLIC_KEY_PEM) {
      console.error('Missing WIX_PAYMENTS_WEBHOOK_PUBLIC_KEY');
      return new Response('Misconfigured', { status: 500 });
    }

    const body = await req.text();

    // Step 1: Verify JWT
    let rawPayload;
    try {
      const publicKey = await jose.importSPKI(PUBLIC_KEY_PEM, 'RS256');
      const { payload } = await jose.jwtVerify(body, publicKey, { algorithms: ['RS256'] });
      rawPayload = payload;
    } catch (e) {
      console.error('JWT verification failed:', e.message);
      return new Response('Unauthorized', { status: 401 });
    }

    // Step 2: Double-parse nested JSON
    const event = JSON.parse(rawPayload.data);
    const eventData = JSON.parse(event.data);
    const eventType = event.eventType;

    console.log('Webhook event type:', eventType);

    if (eventType === 'wix.ecom.v1.order_approved') {
      const order = eventData.actionEvent.body.order;
      const checkoutId = order.checkoutId;

      // Find user by checkout ID
      const users = await base44.asServiceRole.entities.User.filter({ pro_checkout_id: checkoutId });
      if (!users.length) {
        console.warn('No user found for checkoutId:', checkoutId);
        return new Response('OK', { status: 200 });
      }
      const user = users[0];

      // Extract subscription ID from line items
      let subscriptionId = null;
      for (const lineItem of order.lineItems || []) {
        if (lineItem.subscriptionInfo?.id) {
          subscriptionId = lineItem.subscriptionInfo.id;
          break;
        }
      }

      await base44.asServiceRole.entities.User.update(user.id, {
        pro_status: 'active',
        pro_subscription_id: subscriptionId || '',
      });
      console.log('Pro activated for user:', user.id, 'subscription:', subscriptionId);

    } else if (
      eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_canceled' ||
      eventType === 'wix.ecom.subscription_contracts.v1.subscription_contract_expired'
    ) {
      const subscriptionContract = eventData.actionEvent.body.subscriptionContract;
      const subscriptionId = subscriptionContract.id;

      const users = await base44.asServiceRole.entities.User.filter({ pro_subscription_id: subscriptionId });
      if (!users.length) {
        console.warn('No user found for subscriptionId:', subscriptionId);
        return new Response('OK', { status: 200 });
      }
      const user = users[0];

      await base44.asServiceRole.entities.User.update(user.id, {
        pro_status: eventType.includes('canceled') ? 'canceled' : 'none',
      });
      console.log('Pro deactivated for user:', user.id);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response('Error', { status: 500 });
  }
});