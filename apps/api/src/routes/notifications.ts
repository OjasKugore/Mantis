import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/client.js';
import { authMiddleware } from '../middleware/auth.js';

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications
  app.get(
    '/notifications',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const query = request.query as { unread_only?: string };
      const unreadOnly = query?.unread_only === 'true';

      let sql = `SELECT id, user_id, type, payload, is_read, created_at
                 FROM notifications
                 WHERE user_id = $1`;
      const params: any[] = [user.id];

      if (unreadOnly) {
        sql += ` AND is_read = FALSE`;
      }

      sql += ` ORDER BY is_read ASC, created_at DESC LIMIT 50`;

      const { rows } = await db.query(sql, params);
      return reply.code(200).send(rows);
    }
  );

  // PATCH /notifications/read-all
  app.patch(
    '/notifications/read-all',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!;
      const result = await db.query(
        `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`,
        [user.id]
      );
      return reply.code(200).send({ message: 'All notifications marked as read', updated: result.rowCount });
    }
  );

  // PATCH /notifications/:id/read
  app.patch<{ Params: { id: string } }>(
    '/notifications/:id/read',
    { preHandler: [authMiddleware] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const user = request.user!;
      const notifId = Number(request.params.id);
      if (isNaN(notifId)) {
        return reply.code(400).send({ error: 'INVALID_ID', message: 'Notification ID must be numeric' });
      }

      const result = await db.query(
        `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id, is_read`,
        [notifId, user.id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'NOT_FOUND', message: 'Notification not found' });
      }

      return reply.code(200).send(result.rows[0]);
    }
  );
}
