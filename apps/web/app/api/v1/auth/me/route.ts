import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/services/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not logged in' }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (err: any) {
    return NextResponse.json({ error: 'SERVER_ERROR', message: err.message }, { status: 500 });
  }
}
