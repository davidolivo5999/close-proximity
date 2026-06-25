import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // Find all UserLocation records with deletion_scheduled_at in the past
    const allLocations = await base44.asServiceRole.entities.UserLocation.list();
    const toDelete = allLocations.filter(
      (loc) => loc.deletion_scheduled_at && loc.deletion_scheduled_at <= now
    );

    console.log(`Found ${toDelete.length} accounts to delete`);

    for (const loc of toDelete) {
      const uid = loc.user_id;
      try {
        await Promise.all([
          base44.asServiceRole.entities.UserLocation.delete(loc.id),
          base44.asServiceRole.entities.FriendRequest.filter({ from_user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.FriendRequest.delete(r.id)))),
          base44.asServiceRole.entities.FriendRequest.filter({ to_user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.FriendRequest.delete(r.id)))),
          base44.asServiceRole.entities.Encounter.filter({ user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.Encounter.delete(r.id)))),
          base44.asServiceRole.entities.Encounter.filter({ encountered_user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.Encounter.delete(r.id)))),
          base44.asServiceRole.entities.DirectMessage.filter({ from_user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.DirectMessage.delete(r.id)))),
          base44.asServiceRole.entities.DirectMessage.filter({ to_user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.DirectMessage.delete(r.id)))),
          base44.asServiceRole.entities.Block.filter({ blocker_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.Block.delete(r.id)))),
          base44.asServiceRole.entities.Block.filter({ blocked_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.Block.delete(r.id)))),
          base44.asServiceRole.entities.PhotoLike.filter({ user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.PhotoLike.delete(r.id)))),
          base44.asServiceRole.entities.PhotoLike.filter({ photo_owner_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.PhotoLike.delete(r.id)))),
          base44.asServiceRole.entities.MediaReaction.filter({ user_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.MediaReaction.delete(r.id)))),
          base44.asServiceRole.entities.MediaReaction.filter({ media_owner_id: uid }).then(rs => Promise.all(rs.map(r => base44.asServiceRole.entities.MediaReaction.delete(r.id)))),
        ]);
        console.log(`Deleted all data for user ${uid}`);
      } catch (err) {
        console.error(`Failed to delete data for user ${uid}:`, err.message);
      }
    }

    return Response.json({ deleted: toDelete.length });
  } catch (error) {
    console.error('processScheduledDeletions error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});