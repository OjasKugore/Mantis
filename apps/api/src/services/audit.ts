import { PoolClient, Pool } from 'pg';

export interface AuditRecordOptions {
  bugId: bigint | number;
  whoId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  comment?: string | null;
}

export async function recordActivity(
  client: PoolClient | Pool | any,
  opts: AuditRecordOptions
): Promise<void> {
  await client.query(
    `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      opts.bugId,
      opts.whoId,
      opts.field,
      opts.oldValue ?? null,
      opts.newValue ?? null,
      opts.comment ?? null,
    ]
  );
}
