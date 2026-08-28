import { FastifyRequest, FastifyReply } from 'fastify';
import crypto from 'crypto';
import { db } from '../db/client.js';
import type { AuthenticatedUser } from '@bugzilla/shared';

export type { AuthenticatedUser };

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
  }
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.session;
  if (!token) {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Missing session cookie' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { rows } = await db.query(
    `SELECT u.id, u.email, u.display_name, u.username, u.is_admin, s.expires_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > $2 AND u.is_enabled = TRUE`,
    [tokenHash, new Date()]
  );

  if (rows.length === 0) {
    return reply.code(401).send({ error: 'UNAUTHORIZED', message: 'Invalid or expired session' });
  }

  request.user = {
    id: rows[0].id,
    email: rows[0].email,
    display_name: rows[0].display_name,
    username: rows[0].username,
    is_admin: rows[0].is_admin,
  };
}
