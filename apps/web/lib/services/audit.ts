import { db } from '../db/client';

export interface ActivityRecord {
  bugId: number | bigint;
  whoId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  comment?: string;
}

export async function recordActivity(database: any, record: ActivityRecord): Promise<void> {
  const executor = database || db;
  await executor.query(
    `INSERT INTO bugs_activity (bug_id, who_id, field, old_value, new_value, comment)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      record.bugId,
      record.whoId,
      record.field,
      record.oldValue,
      record.newValue,
      record.comment ?? null,
    ]
  );
}
