import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROXIMITY_METERS = 500;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    // Automation entity payload shape: { event, data, old_data }
    const updatedLoc = body.data || body;
    const updatedUserId = updatedLoc?.user_id;

    if (!updatedUserId) {
      return Response.json({ error: 'Missing user_id in payload' }, { status: 400 });
    }
    if (!updatedLoc || !updatedLoc.is_visible) {
      return Response.json({ skipped: 'not visible' });
    }

    // Find all accepted friends of the updated user
    const sentRequests = await base44.asServiceRole.entities.FriendRequest.filter({
      from_user_id: updatedUserId,
      status: 'accepted',
    });
    const receivedRequests = await base44.asServiceRole.entities.FriendRequest.filter({
      to_user_id: updatedUserId,
      status: 'accepted',
    });

    const friendIds = [
      ...sentRequests.map((r) => r.to_user_id),
      ...receivedRequests.map((r) => r.from_user_id),
    ];

    if (friendIds.length === 0) {
      return Response.json({ notified: 0 });
    }

    // Get all friend locations
    let notified = 0;
    for (const friendId of friendIds) {
      const friendLocs = await base44.asServiceRole.entities.UserLocation.filter({ user_id: friendId });
      const friendLoc = friendLocs[0];
      if (!friendLoc || !friendLoc.is_visible) continue;

      const dist = calculateDistance(
        updatedLoc.latitude, updatedLoc.longitude,
        friendLoc.latitude, friendLoc.longitude
      );

      if (dist <= PROXIMITY_METERS) {
        notified++;
        console.log(`Friend ${updatedUserId} is nearby friend ${friendId}`);
      }
    }

    return Response.json({ notified });
  } catch (error) {
    console.error('friendProximityAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});