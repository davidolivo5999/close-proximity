import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { targetUserId } = await req.json();
    if (!targetUserId) return Response.json({ error: 'targetUserId required' }, { status: 400 });

    const sr = base44.asServiceRole;

    // Delete all entity records belonging to the banned user in parallel
    await Promise.all([
      sr.entities.UserLocation.deleteMany({ user_id: targetUserId }),
      sr.entities.FriendRequest.deleteMany({ from_user_id: targetUserId }),
      sr.entities.FriendRequest.deleteMany({ to_user_id: targetUserId }),
      sr.entities.DirectMessage.deleteMany({ from_user_id: targetUserId }),
      sr.entities.DirectMessage.deleteMany({ to_user_id: targetUserId }),
      sr.entities.Block.deleteMany({ blocker_id: targetUserId }),
      sr.entities.Block.deleteMany({ blocked_id: targetUserId }),
      sr.entities.Encounter.deleteMany({ user_id: targetUserId }),
      sr.entities.Encounter.deleteMany({ encountered_user_id: targetUserId }),
      sr.entities.PhotoLike.deleteMany({ user_id: targetUserId }),
      sr.entities.PhotoLike.deleteMany({ photo_owner_id: targetUserId }),
      sr.entities.MediaReaction.deleteMany({ user_id: targetUserId }),
      sr.entities.MediaReaction.deleteMany({ media_owner_id: targetUserId }),
      sr.entities.Hangout.deleteMany({ host_id: targetUserId }),
      sr.entities.HangoutMessage.deleteMany({ user_id: targetUserId }),
      sr.entities.Report.deleteMany({ reported_user_id: targetUserId }),
    ]);

    // Delete the user account last
    await sr.entities.User.delete(targetUserId);

    console.log(`[banUser] Banned and deleted user ${targetUserId} by admin ${user.id}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[banUser] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});