export function backend(): 'local' | 'supabase' {
  if (process.env.APP_BACKEND === 'local' && !process.env.VERCEL) return 'local';
  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
    return 'supabase';
  if (process.env.VERCEL || process.env.APP_BACKEND === 'supabase')
    throw new Error('Supabase is not configured. See README.md.');
  return 'local';
}
export function demoEnabled() {
  return process.env.NODE_ENV !== 'production' || process.env.ENABLE_DEMO === 'true';
}
export function guestSecret() {
  const value = process.env.GUEST_TOKEN_SECRET;
  if (!value || value.length < 32)
    throw new Error(
      'Set GUEST_TOKEN_SECRET to at least 32 random characters. Run npm run setup:local for local development.',
    );
  return value;
}
