import { NextRequest } from 'next/server';
import { logout } from '@/lib/auth';
import { checkOrigin, failure, json } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    checkOrigin(request);
    await logout();
    return json({ ok: true });
  } catch (error) {
    return failure(error);
  }
}
