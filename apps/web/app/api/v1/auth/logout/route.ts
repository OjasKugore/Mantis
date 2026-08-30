import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from '@/lib/db/client';
import { COOKIE_NAME } from '@/lib/services/session-token';

export async function POST() {
  try {
    const cookieStore = cookies();
    const sessionId = cookieStore.get('sessionId')?.value || cookieStore.get('mantis_session')?.value;

    if (sessionId) {
      const tokenHash = crypto.createHash('sha256').update(sessionId).digest('hex');
      await db.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]).catch(() => {});
    }

    const response = NextResponse.json({ message: 'Logged out successfully' });
    response.cookies.delete('sessionId');
    response.cookies.delete('session');
    response.cookies.delete('mantis_session');
    response.cookies.delete(COOKIE_NAME);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
