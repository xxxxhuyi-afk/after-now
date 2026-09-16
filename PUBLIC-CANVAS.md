# Public canvas setup

This update replaces the shared canvas passphrase with verified-email login. The old `IMAGE_CANVAS_PASSWORD` does not bypass login. Nothing is deployed by this update.

## 1. Supabase

Create a Supabase project. Run `supabase/canvas-quota.sql` in SQL Editor. This creates a private daily usage table and a service-role-only RPC. All generation reservations lock the same daily global row, then the user row, to prevent simultaneous requests exceeding limits across servers.

In Authentication enable Email login and **Confirm email**. Set Site URL to your actual site and allow your `/lab/image-canvas` URL. Configure custom SMTP for public signup: Supabase's built-in email delivery is restricted and is not suitable for arbitrary visitor emails. Test signup with an address outside your project team. Passwords are handled by Supabase Auth, never stored in the canvas database.

## 2. Vercel Production environment variables

Keep `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. Add:

- `SUPABASE_URL`: Project URL.
- `SUPABASE_ANON_KEY`: legacy anon API key (not service role).
- `SUPABASE_SERVICE_ROLE_KEY`: legacy service_role key. **Secret**, server-only; never upload it or use NEXT_PUBLIC_.
- `IMAGE_CANVAS_USER_DAILY_LIMIT`: `3`.
- `IMAGE_CANVAS_GLOBAL_DAILY_LIMIT`: `30`.

The 3-per-user / 30-global values are conservative experiment limits, not a guarantee that all 30 requests fit a provider's free allocation. Keep Cloudflare Workers Free if you want provider over-quota requests to stop rather than incur paid overages. Limits measure model-call attempts, including failed/timed-out calls because a timeout may still consume provider compute. Validation/auth failures do not count. Quota database failures block generation (fail closed).

Upload new app files and SQL/docs to the existing repository at their original paths, then redeploy after configuring variables. If auth/database are not connected, import/draft tools still work but image generation is disabled.

## 3. Verification before sharing

- Register and verify email; log in; refresh; generate an image.
- Session is an HttpOnly, Secure production, SameSite Strict cookie; expires after at most one hour. Log in again after expiry. No automatic token refresh or password recovery UI in this version.
- Log out and confirm generation is blocked. Old shared passphrase must not work.
- Set user cap to 1, redeploy, and try two requests. Only one may reach Cloudflare.
- Test simultaneous requests with two accounts and global cap 1 on a test project: only one reservation allowed.
- Restore 3 / 30 before sharing. Reset is at 00:00 UTC (08:00 China time).

Automated local route checks: `npm run build` then `node scripts/verify-canvas-auth.mjs`. This uses a local Supabase stub, no credentials or paid provider calls. Run the concurrency checks against the real SQL database after setup; the local test cannot prove database behavior.

## Limits and privacy

Daily account and global caps are persistent. This does not prevent people creating multiple verified accounts; add CAPTCHA and additional abuse controls for broader traffic. Default auth email limits and custom SMTP sending quotas also apply. This version has no CAPTCHA UI, password recovery, monthly cost cap, or admin dashboard. Existing usage rows remain in the database; configure a retention cleanup policy. No prompts/images are stored there, only date, account identifier and attempt counters. Account email/auth records remain in Supabase; imported images and local drafts remain in the visitor's browser. Generation descriptions go to Cloudflare. Do not advertise unrestricted public availability until email delivery and live quota checks pass.
