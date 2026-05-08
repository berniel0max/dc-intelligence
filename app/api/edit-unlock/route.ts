import { cookies } from 'next/headers';
import { EDIT_COOKIE_NAME, editLockEnabled, editSessionToken } from '@/src/lib/editAuth';

export async function GET() {
  return Response.json({ lockEnabled: editLockEnabled() });
}

export async function POST(request: Request) {
  const envSecret = process.env.EDIT_ACCESS_SECRET?.trim();
  if (!envSecret) {
    return Response.json(
      { error: 'Edit lock is not enabled (set EDIT_ACCESS_SECRET).' },
      { status: 503 },
    );
  }

  let body: { secret?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.secret !== envSecret) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const token = editSessionToken(envSecret);
  const jar = await cookies();
  jar.set(EDIT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return Response.json({ ok: true });
}
