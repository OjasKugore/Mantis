import { db } from '../db/client.js';

export function applyGroupFilter(
  userId: string | null,
  paramIndex: number = 1
): { fragment: string; param: string | null; nextIndex: number } {
  if (!userId) {
    return {
      fragment: `AND b.id NOT IN (SELECT bug_id FROM bug_group_map)`,
      param: null,
      nextIndex: paramIndex,
    };
  }

  return {
    fragment: `AND (
      b.id NOT IN (SELECT bug_id FROM bug_group_map)
      OR b.id IN (
        SELECT bgm.bug_id FROM bug_group_map bgm
        JOIN user_group_map ugm ON ugm.group_id = bgm.group_id
        WHERE ugm.user_id = $${paramIndex}
      )
    )`,
    param: userId,
    nextIndex: paramIndex + 1,
  };
}

export async function canUserAccessBug(bugId: number | bigint, userId: string | null): Promise<boolean> {
  // Check if bug is restricted to any group
  const { rows: groupRows } = await db.query(
    `SELECT group_id FROM bug_group_map WHERE bug_id = $1`,
    [bugId]
  );

  // If not restricted to any group, it is public
  if (groupRows.length === 0) {
    return true;
  }

  // If restricted but user is not logged in, denied
  if (!userId) {
    return false;
  }

  // Check if user is a member of any of the restricting groups
  const groupIds = groupRows.map((r) => r.group_id);
  const { rows: membershipRows } = await db.query(
    `SELECT group_id FROM user_group_map WHERE user_id = $1 AND group_id = ANY($2)`,
    [userId, groupIds]
  );

  return membershipRows.length > 0;
}
