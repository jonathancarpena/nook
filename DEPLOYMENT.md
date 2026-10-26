# Deploy this event

Repository: [jonathancarpena/nook](https://github.com/jonathancarpena/nook)

Supabase project: `mdlypckjtgxlcdpdkcvq`

Project URL: `https://mdlypckjtgxlcdpdkcvq.supabase.co`

This guide prepares the actual tournament database and website. A project URL alone does not grant database administration or hosting access. Enter credentials only in the provider dashboards; do not put them in GitHub or chat.

## 1. Initialize the database

1. Open [this project's SQL Editor](https://supabase.com/dashboard/project/mdlypckjtgxlcdpdkcvq/sql/new).
2. Open [the migration on GitHub](https://github.com/jonathancarpena/nook/blob/main/supabase/migrations/202610260001_tournament.sql). Use **Copy raw file** to copy the entire SQL file.
3. Paste it into the SQL Editor and click **Run**. Apply it once to the new project. Success creates the private tournament tables, normalized projections, transaction function, access policies, and public revision notifications.
4. If it reports an error, stop and share the error message without credentials. Do not repeatedly run the complete migration against an already initialized database.

## 2. Create the host login

1. Open [Authentication → Users](https://supabase.com/dashboard/project/mdlypckjtgxlcdpdkcvq/auth/users).
2. Choose **Add user → Create new user**. Set the host email and a strong password, and mark the email confirmed. This avoids depending on an invitation email or SMTP setup.
3. Keep the password private. Later, sign into the deployed website at `/login` with this email/password.
4. Disable public sign-ups in Authentication settings. Guests register through `/join` and do not need Supabase accounts.

## 3. Import the GitHub repository into Vercel

1. Sign into [Vercel](https://vercel.com) with GitHub.
2. Select **Add New → Project**, import **jonathancarpena/nook**, and use the existing repository's `main` branch.
3. Select **Next.js**, leave the root directory as the repository root, and select **Node.js 24**.
4. Before deploying, expand **Environment Variables** and enter the values below. Apply them to Production and Preview if you want both to work.

| Name                            | Value                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------- |
| `APP_BACKEND`                   | `supabase`                                                                             |
| `NEXT_PUBLIC_SUPABASE_URL`      | `https://mdlypckjtgxlcdpdkcvq.supabase.co`                                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The legacy **anon** key from this Supabase project's API settings                      |
| `SUPABASE_SERVICE_ROLE_KEY`     | The legacy **service_role** key from API settings; mark sensitive and keep server-only |
| `HOST_EMAILS`                   | The exact confirmed host email created in step 2                                       |
| `GUEST_TOKEN_SECRET`            | A cryptographically random value of at least 32 characters; mark sensitive             |
| `ENABLE_DEMO`                   | `true` for the authenticated rehearsal; use `false` for the live event if not needed   |

Find the API keys in [this project's API settings](https://supabase.com/dashboard/project/mdlypckjtgxlcdpdkcvq/settings/api), under the legacy **anon / service_role** keys section. The code expects those key types. The service-role key must never use a `NEXT_PUBLIC_` name.

Generate a separate production guest-token secret privately in your terminal:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Copy that output directly into Vercel's `GUEST_TOKEN_SECRET` field. Do not send it in chat or commit it. Do not copy the local SQLite authentication configuration into Vercel.

5. Click **Deploy**. Vercel will run `npm ci` and `npm run build`.
6. Once Vercel reports a successful deployment, open its assigned HTTPS URL. Optionally set `NEXT_PUBLIC_SITE_URL` to that exact origin in Vercel and redeploy. Without this optional value, QR codes use the origin currently open in the browser; they do not hardcode localhost.
7. Share the public website URL so the deployment can be checked. Do not share credentials.

## 4. Rehearse before using the live event

- Open `/login`, sign in as the allowlisted host, and open `/demo`.
- Seed fictional contestants and run all four rounds with a separate `/display?mode=demo` tab. Demo is isolated and requires host authentication.
- Check the actual `/join` flow from a phone, ensure the assigned card survives refresh, and confirm the projector updates after explicit host reveals.
- Test sound and fullscreen with a user gesture on the projector browser.
- Reset only your live test registrations before opening registration for the party.
- Follow [README.md](README.md) for the operating guide, recovery, backups, and further configuration.

Deployment and database initialization are not complete until these steps succeed and their behavior is verified against the actual hosted application.
