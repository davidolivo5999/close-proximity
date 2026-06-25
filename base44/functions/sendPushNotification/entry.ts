import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const ONESIGNAL_APP_ID = '48bbfe1d-f3b8-457a-9297-fff4c084b8ec';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // entity automation payload shape: { event, data, old_data }
    const record = body.data || body;
    const eventType = body.event?.type || body.type;

    const restApiKey = Deno.env.get('ONESIGNAL_REST_API_KEY');
    if (!restApiKey) {
      console.error('Missing ONESIGNAL_REST_API_KEY');
      return Response.json({ error: 'Missing API key' }, { status: 500 });
    }

    let targetUserId, title, message;

    if (eventType === 'create' && record.from_user_id && record.to_user_id && record.status === 'pending') {
      // New friend request
      targetUserId = record.to_user_id;
      title = '👋 New Friend Request';
      message = `${record.from_user_name || 'Someone'} sent you a friend request`;
    } else if (eventType === 'create' && record.from_user_id && record.to_user_id && record.text) {
      // New direct message
      targetUserId = record.to_user_id;
      title = `💬 New message from ${record.from_user_name || 'Someone'}`;
      message = record.text.length > 80 ? record.text.slice(0, 80) + '…' : record.text;
    } else {
      console.log('Skipping — unrecognized event shape', JSON.stringify(body).slice(0, 200));
      return Response.json({ skipped: true });
    }

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_aliases: { external_id: [targetUserId] },
      target_channel: 'push',
      headings: { en: title },
      contents: { en: message },
    };

    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('OneSignal error:', JSON.stringify(result));
      return Response.json({ error: result }, { status: 502 });
    }

    console.log(`Push sent to ${targetUserId} — notification id: ${result.id}`);
    return Response.json({ success: true, notificationId: result.id });
  } catch (error) {
    console.error('sendPushNotification error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});