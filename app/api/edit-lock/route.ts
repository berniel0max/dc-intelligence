import { cookies } from 'next/headers';
import { EDIT_COOKIE_NAME } from '@/src/lib/editAuth';

export async function POST() {
  const jar = await cookies();
  jar.delete(EDIT_COOKIE_NAME);
  return Response.json({ ok: true });
}
