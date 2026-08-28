import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { db } from '../db/client.js';
import { applyGroupFilter } from '../middleware/groupFilter.js';

const SearchQuerySchema = z.object({
  q: z.string().default(''),
  limit: z.coerce.number().int().positive().max(100).default(25),
  offset: z.coerce.number().int().nonnegative().default(0),
});

const DuplicatesQuerySchema = z.object({
  summary: z.string().min(3, { message: 'Summary must be at least 3 characters long' }),
  limit: z.coerce.number().int().positive().max(50).default(5),
});

function stemWord(word: string): string {
  let w = word.toLowerCase().trim();
  if (w.length <= 3) return w;
  if (w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('ing')) return w.slice(0, -3);
  if (w.endsWith('ed')) return w.slice(0, -2);
  if (w.endsWith('es')) return w.slice(0, -2);
  if (w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1);
  if (w.endsWith('ly')) return w.slice(0, -2);
  if (w.endsWith('e')) return w.slice(0, -1);
  return w;
}

async function getOptionalUserId(request: FastifyRequest): Promise<string | null> {
  const token = request.cookies?.session;
  if (!token) return null;

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const sessionRes = await db.query(
    `SELECT user_id FROM sessions WHERE token_hash = $1 AND expires_at > NOW()`,
    [tokenHash]
  );

  return sessionRes.rows.length > 0 ? sessionRes.rows[0].user_id : null;
}

export async function searchRoutes(app: FastifyInstance) {
  // GET /api/v1/bugs/search — Full-Text Search
  app.get('/bugs/search', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = SearchQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid search parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { q, limit, offset } = parseResult.data;
    if (!q || q.trim() === '') {
      return reply.send({ bugs: [], total: 0 });
    }

    const userId = await getOptionalUserId(request);
    const { fragment: groupFilterFragment, param: groupParam } = applyGroupFilter(userId, 2);

    const params: any[] = [q.trim(), limit, offset];
    if (groupParam) {
      params.splice(1, 0, groupParam);
    }

    // Try PostgreSQL native full-text search with ts_rank and ts_headline
    try {
      const searchSql = `
        SELECT
          b.id,
          b.summary,
          b.description,
          b.status,
          b.priority,
          b.severity,
          b.product_id,
          b.component_id,
          b.version,
          b.target_milestone,
          b.reporter_id,
          b.assignee_id,
          b.created_at,
          b.updated_at,
          ts_rank(to_tsvector('english', coalesce(b.summary,'') || ' ' || coalesce(b.description,'')), websearch_to_tsquery('english', $1)) AS rank,
          ts_headline('english', b.summary, websearch_to_tsquery('english', $1), 'StartSel=<mark>, StopSel=</mark>, MaxWords=12') AS headline
        FROM bugs b
        WHERE to_tsvector('english', coalesce(b.summary,'') || ' ' || coalesce(b.description,'')) @@ websearch_to_tsquery('english', $1)
        ${groupFilterFragment}
        ORDER BY rank DESC, b.id DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `;

      const { rows } = await db.query(searchSql, params);

      const bugs = rows.map((r: any) => ({
        ...r,
        id: Number(r.id),
        product_id: Number(r.product_id),
        component_id: Number(r.component_id),
        rank: typeof r.rank === 'number' ? r.rank : parseFloat(r.rank || '0'),
        headline: r.headline || r.summary,
      }));

      return reply.send({ bugs, total: bugs.length });
    } catch (err: any) {
      // Fallback for mock/test environments with English stemming
      const fallbackGroup = applyGroupFilter(userId, 1);
      const { rows: allBugs } = await db.query(
        `SELECT b.* FROM bugs b WHERE 1=1 ${fallbackGroup.fragment}`,
        fallbackGroup.param ? [fallbackGroup.param] : []
      );

      const qRawWords = q.toLowerCase().split(/\s+/).filter(Boolean);
      const qStems = qRawWords.map(stemWord);

      const matchedAndScored = allBugs
        .map((b: any) => {
          const rawText = `${b.summary || ''} ${b.description || ''}`;
          const textWords = rawText.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
          const textStems = textWords.map(stemWord);

          let matchScore = 0;
          for (const qs of qStems) {
            const matches = textStems.filter(ts => ts === qs || (ts.length > 3 && qs.length > 3 && (ts.startsWith(qs) || qs.startsWith(ts))));
            matchScore += matches.length;
          }

          if (matchScore === 0) return null;

          // Build headline with <mark> tags
          let headline = b.summary || '';
          for (const qs of qStems) {
            const regex = new RegExp(`(\\b[a-zA-Z]*${qs}[a-zA-Z]*\\b)`, 'gi');
            headline = headline.replace(regex, '<mark>$1</mark>');
          }

          return {
            ...b,
            id: Number(b.id),
            product_id: Number(b.product_id),
            component_id: Number(b.component_id),
            rank: matchScore,
            headline,
          };
        })
        .filter(Boolean) as any[];

      matchedAndScored.sort((a, b) => b.rank - a.rank || b.id - a.id);
      const paginated = matchedAndScored.slice(offset, offset + limit);

      return reply.send({ bugs: paginated, total: matchedAndScored.length });
    }
  });

  // GET /api/v1/bugs/duplicates — Live Typeahead Duplicate Detection
  app.get('/bugs/duplicates', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = DuplicatesQuerySchema.safeParse(request.query);
    if (!parseResult.success) {
      return reply.code(400).send({
        error: 'VALIDATION_ERROR',
        message: 'Invalid duplicate query parameters',
        details: parseResult.error.flatten(),
      });
    }

    const { summary, limit } = parseResult.data;
    const userId = await getOptionalUserId(request);
    const { fragment: groupFilterFragment, param: groupParam } = applyGroupFilter(userId, 2);

    const params: any[] = [summary.trim(), limit];
    if (groupParam) {
      params.splice(1, 0, groupParam);
    }

    try {
      const sql = `
        SELECT
          b.id,
          b.summary,
          b.status,
          b.priority,
          similarity(b.summary, $1) AS score
        FROM bugs b
        WHERE similarity(b.summary, $1) > 0.28
        ${groupFilterFragment}
        ORDER BY score DESC, b.id DESC
        LIMIT $${params.length}
      `;

      const { rows } = await db.query(sql, params);

      const duplicates = rows.map((r: any) => ({
        id: Number(r.id),
        summary: r.summary,
        status: r.status,
        priority: r.priority,
        score: typeof r.score === 'number' ? r.score : parseFloat(r.score || '0'),
      }));

      return reply.send({ duplicates });
    } catch (err: any) {
      // Fallback if similarity() extension function is not configured
      const { rows: allBugs } = await db.query(`SELECT id, summary, status, priority FROM bugs`);
      const qWords = summary.toLowerCase().split(/\s+/).filter(Boolean);

      const duplicates = allBugs
        .map((b: any) => {
          const sLower = (b.summary || '').toLowerCase();
          let overlap = 0;
          for (const w of qWords) {
            if (sLower.includes(w)) overlap++;
          }
          const score = qWords.length > 0 ? overlap / qWords.length : 0;
          return {
            id: Number(b.id),
            summary: b.summary,
            status: b.status,
            priority: b.priority,
            score,
          };
        })
        .filter(b => b.score > 0.28)
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      return reply.send({ duplicates });
    }
  });
}
