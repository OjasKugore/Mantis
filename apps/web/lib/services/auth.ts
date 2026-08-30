import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '../db/client';
import { verifyUserToken, COOKIE_NAME } from './session-token';

export interface UserSession {
  id: string;
  email: string;
  display_name: string;
  username: string;
  is_admin: boolean;
  avatar_url?: string;
}

export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = cookies();
    const sessionId =
      cookieStore.get('sessionId')?.value ||
      cookieStore.get('session')?.value ||
      cookieStore.get('mantis_session')?.value;

    // 1. Try DB session lookup (works when DB is persistent / warm in-memory)
    if (sessionId) {
      try {
        const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');

        const { rows } = await db.query(
          `SELECT u.id, u.email, u.display_name, u.username, u.is_admin, u.avatar_url
           FROM sessions s
           JOIN users u ON u.id = s.user_id
           WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.is_enabled = TRUE`,
          [tokenHash]
        );

        if (rows.length > 0) {
          return rows[0];
        }
      } catch {
        // DB unavailable or session not found — fall through to signed cookie
      }
    }

    // 2. Fallback: verify the signed user token cookie (survives Vercel cold starts)
    const userTokenRaw = cookieStore.get(COOKIE_NAME)?.value;
    if (userTokenRaw) {
      const payload = verifyUserToken(userTokenRaw);
      if (payload) {
        const { exp: _exp, ...user } = payload;
        return user;
      }
    }

    return null;
  } catch {
    return null;
  }
}

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
  const { rows: bugRows } = await db.query(
    `SELECT id FROM bugs WHERE id = $1`,
    [bugId]
  );
  if (bugRows.length === 0) {
    return false;
  }

  const { rows: groupRows } = await db.query(
    `SELECT group_id FROM bug_group_map WHERE bug_id = $1`,
    [bugId]
  );

  if (groupRows.length === 0) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const groupIds = groupRows.map((r: any) => r.group_id);
  const { rows: userGroups } = await db.query(
    `SELECT group_id FROM user_group_map WHERE user_id = $1`,
    [userId]
  );
  const userGroupSet = new Set(userGroups.map((r: any) => r.group_id));
  return groupIds.some((gid: string) => userGroupSet.has(gid));
}
