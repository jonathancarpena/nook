import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('.local', { recursive: true, mode: 0o700 });
if (existsSync('.env.local')) {
  console.log('.env.local already exists; preserved it. See .env.example for required variables.');
  process.exit(0);
}
const password = randomBytes(18).toString('base64url'),
  salt = randomBytes(16).toString('hex');
writeFileSync(
  '.env.local',
  `APP_BACKEND=local\nLOCAL_HOST_PASSWORD_HASH=${salt}:${scryptSync(password, salt, 64).toString('hex')}\nLOCAL_SESSION_SECRET=${randomBytes(32).toString('hex')}\nGUEST_TOKEN_SECRET=${randomBytes(32).toString('hex')}\nENABLE_DEMO=true\n`,
  { mode: 0o600, flag: 'wx' },
);
writeFileSync('.local/host-password.txt', password + '\n', { mode: 0o600, flag: 'wx' });
console.log(
  'Local environment configured. Your host password is in .local/host-password.txt. Do not commit or share this file.',
);
