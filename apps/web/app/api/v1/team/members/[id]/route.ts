import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { getCurrentUser } from '@/lib/services/auth';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (!currentUser.is_admin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin privileges required' }, { status: 403 });
    }

    const targetUserId = params.id;
    const body = await request.json().catch(() => ({}));
    const { is_admin, priority_rank, is_enabled, groups: newGroupNames } = body;

    // Check target user exists
    const { rows: targetRows } = await db.query(
      `SELECT id, email, is_admin FROM users WHERE id = $1`,
      [targetUserId]
    );
    if (targetRows.length === 0) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'User not found' }, { status: 404 });
    }

    // Safety check: Prevent demoting the only admin
    if (is_admin === false && targetRows[0].is_admin) {
      const { rows: adminCount } = await db.query(
        `SELECT COUNT(*) as count FROM users WHERE is_admin = TRUE AND is_enabled = TRUE`
      );
      if (parseInt(adminCount[0].count, 10) <= 1) {
        return NextResponse.json(
          { error: 'CANNOT_DEMOTE_LAST_ADMIN', message: 'Cannot remove the last active administrator' },
          { status: 400 }
        );
      }
    }

    // Update user columns
    const updates: string[] = [];
    const values: any[] = [];

    if (is_admin !== undefined) {
      values.push(Boolean(is_admin));
      updates.push(`is_admin = $${values.length}`);
    }

    if (priority_rank !== undefined) {
      values.push(parseInt(priority_rank, 10));
      updates.push(`priority_rank = $${values.length}`);
    }

    if (is_enabled !== undefined) {
      values.push(Boolean(is_enabled));
      updates.push(`is_enabled = $${values.length}`);
    }

    if (updates.length > 0) {
      values.push(targetUserId);
      await db.query(
        `UPDATE users SET ${updates.join(', ')} WHERE id = $${values.length}`,
        values
      );
    }

    // Update groups if provided
    if (Array.isArray(newGroupNames)) {
      // Delete existing group mappings for this user
      await db.query(`DELETE FROM user_group_map WHERE user_id = $1`, [targetUserId]);

      // Ensure standard groups exist and get their IDs
      const validGroupNames = ['security-team', 'qa-team', 'dev-team'];
      for (const gName of newGroupNames) {
        if (validGroupNames.includes(gName)) {
          // Ensure group exists
          const gRes = await db.query(`SELECT id FROM groups WHERE name = $1`, [gName]);
          let groupId: string;
          if (gRes.rows.length > 0) {
            groupId = gRes.rows[0].id;
          } else {
            const insRes = await db.query(
              `INSERT INTO groups (name, description) VALUES ($1, $2) RETURNING id`,
              [gName, `${gName} members`]
            );
            groupId = insRes.rows[0].id;
          }

          await db.query(
            `INSERT INTO user_group_map (user_id, group_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [targetUserId, groupId]
          );
        }
      }
    }

    // Return updated user data
    const { rows: updatedUser } = await db.query(
      `SELECT 
         u.id, u.email, u.display_name, u.username, u.avatar_url,
         u.is_admin, u.is_enabled, u.priority_rank, u.created_at,
         COALESCE(
           ARRAY_AGG(g.name) FILTER (WHERE g.name IS NOT NULL),
           '{}'
         ) as groups
       FROM users u
       LEFT JOIN user_group_map ugm ON ugm.user_id = u.id
       LEFT JOIN groups g ON g.id = ugm.group_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [targetUserId]
    );

    return NextResponse.json({
      member: updatedUser[0],
      message: 'Member updated successfully',
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, { status: 401 });
    }
    if (!currentUser.is_admin) {
      return NextResponse.json({ error: 'FORBIDDEN', message: 'Admin privileges required' }, { status: 403 });
    }

    const targetUserId = params.id;
    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: 'CANNOT_DELETE_SELF', message: 'Cannot deactivate your own account' }, { status: 400 });
    }

    // Soft-deactivate user and remove groups
    await db.query(`UPDATE users SET is_enabled = FALSE WHERE id = $1`, [targetUserId]);
    await db.query(`DELETE FROM user_group_map WHERE user_id = $1`, [targetUserId]);

    return NextResponse.json({ message: 'Member deactivated successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
