# Security controls and operational notes

This document describes the controls implemented for the application and the remaining deployment prerequisites. It intentionally does not publish the private console path.

## Administrative access

- The admin entry is not linked from public application navigation. Its 512-bit random path is stored only in the Vercel Sensitive environment variable `ADMIN_ENTRY_PATH`; it is not committed to source, route config, client bundles, or public navigation. Vercel Routing Middleware compares the request path server-side and rewrites only an exact match. The internal admin HTML document returns 404 when requested directly.
- Admin OAuth uses an isolated Supabase client/storage key. The temporary browser OAuth session is cleared after exchanging it for a server-set cookie.
- The admin cookie is `HttpOnly; Secure; SameSite=Strict; Path=/`, has no `Domain` attribute, is not readable by application JavaScript, and expires after at most 10 minutes. PostgreSQL also enforces a non-sliding 10-minute maximum from first use, so copying the cookie cannot extend its lifetime.
- Every admin API request validates the access token with Supabase Auth, re-checks the server-issued `app_metadata.is_admin` claim, validates the JWT `session_id` against `auth.sessions`, and checks HMAC fingerprints of the trusted Vercel client IP and user-agent. An IP or user-agent change revokes that Supabase session and requires a new sign-in. Only keyed hashes are stored; raw IPs and user-agent strings are not persisted.
- The repository's Supabase local config now allows the production origin path pattern for OAuth return. The connected Auth redirect allowlist is managed outside SQL and could not be read or changed through the available Supabase connection; verify the production wildcard in Auth URL Configuration before enabling admin login.
- Mutating requests require a same-origin HTTPS Origin and JSON content type. Admin API responses are non-cacheable.
- Admin reads and writes run with the caller's JWT and remain subject to Supabase RLS. No service-role key is used in the browser or admin API.
- Admin request limits are enforced in PostgreSQL per authenticated admin: 90 reads/minute, 20 writes/minute and 5 session operations/minute. Counter tables live in a non-PostgREST `private` schema, have RLS with no client policies or table privileges, and are updated through public SECURITY INVOKER wrappers that call narrowly scoped private SECURITY DEFINER functions. Admin authorization is rechecked against `auth.users.raw_app_meta_data` in the database.
- The session endpoint also applies a best-effort per-IP limit of 20 requests/minute per serverless instance. This is not a substitute for a distributed edge limit.

## Input and upload controls

- Admin mutations use an allowlist of actions, UUID validation, bounded text/array fields, HTTPS-only source/image URLs, and a 32 KB JSON body ceiling. PostgreSQL also enforces size/length constraints for feedback, profiles, notes, projects, checklists and automotive catalog rows (including a 10 MB project JSONB ceiling and 1 MB checklist JSONB ceiling).
- The application uses Supabase/PostgREST parameterized queries; no user-controlled SQL is assembled.
- Push subscription endpoints are constrained in PostgreSQL to HTTPS Web Push provider hosts, with bounded endpoint/key/user-agent lengths. The Edge Function send path repeats the host and key validation before making outbound requests, preventing user-controlled subscription rows from becoming an SSRF primitive.
- Each authenticated user is limited to twenty push devices and ten subscription writes per minute; push-test sends are limited to five per minute. These counters are private database rows, not client-editable state.
- Global push broadcasts require a live Supabase admin session, matching the original Supabase Auth IP and user-agent, and have a separate database limit of three broadcasts per administrator per hour; the internal session-check RPC is executable only by `service_role`.
- The private `user-media` bucket is empty and has no application upload path. All client Storage policies for that bucket have been removed, so authenticated users cannot upload arbitrary bytes directly. The bucket remains private and limited to WebP/5 MB for a future server-side upload pipeline.
- There is currently no product-label upload flow in the repository: product images are HTTPS URLs, while editor media is stored locally in IndexedDB. If uploads are added later, they must pass server-side magic-byte validation, decoding/re-encoding, dimension/pixel limits and malware scanning before Storage writes; client MIME metadata is not trusted.
- The Express runtime limits JSON bodies to 256 KB, chat prompts to 24,000 characters, chat streams to 12 requests/minute per IP, 8 concurrent streams globally and 2 per IP. Gemini stream duration is capped at 120 seconds, output at 2,048 tokens, and automatic continuation is disabled. The SDK request is aborted on timeout/disconnect to release local resources; this does not guarantee cancellation of provider-side generation or billing.
- Gemini Live WebSockets require same-origin HTTPS (localhost HTTP only in local development), have a 128 KB frame ceiling, 600 messages/minute per connection, 2 connections/IP and 50 concurrent connections globally. Connection setup is capped at 20 seconds, session lifetime at 30 minutes, and slow consumers are closed when buffered output exceeds 2 MB.
- Express in-memory limits are per process, not globally distributed. The Vercel project is configured as a Vite static app; `server.ts` is the local/self-hosted Express runtime, not the Vercel serverless runtime.

## Session anomaly controls

- The admin cookie is bound to the trusted Vercel client IP and user-agent using HMAC-SHA-256. A fingerprint change revokes the underlying Supabase Auth session; rapid VPN/Tor exit changes therefore cannot reset user-level database rate limits and will force reauthentication. The broadcast Edge Function independently checks the original IP/user-agent recorded in `auth.sessions`. A stable VPN or proxy cannot be classified reliably without an external IP-reputation feed; the system does not falsely claim to detect every VPN/Tor exit.
- Session fingerprints contain keyed hashes only, not raw IP addresses or user-agent values. Logout deletes the corresponding Supabase Auth session, and the server enforces an absolute 10-minute lifetime.

## Browser and transport protections

- HSTS, `nosniff`, frame denial, strict referrer policy, restrictive camera/microphone/geolocation permissions and COOP are configured globally.
- The admin entry has an enforced Content Security Policy, `no-store`, `no-referrer` and `X-Robots-Tag: noindex`.
- A site-wide CSP is currently Report-Only to collect compatibility signals before enforcing it across all existing features.

## Database and secrets

- `pg_net` was moved from the `public` schema to `extensions`; its `net.http_post` function remains available.
- Admin, upload and push-test rate-limit counters are in the non-exposed `private` schema with RLS enabled and no client table privileges or policies. Public SECURITY INVOKER RPC wrappers delegate only fixed actions to private SECURITY DEFINER functions with an empty `search_path`; admin checks read `auth.users.raw_app_meta_data` in PostgreSQL. The admin stats function remains SECURITY INVOKER.
- Vercel runtime secrets (`GEMINI_API_KEY`, `CRON_SECRET`, `VAPID_KEYS`, `ADMIN_ENTRY_PATH` and `ADMIN_SESSION_FINGERPRINT_SECRET`) use Secret/Sensitive visibility; their values are not stored in source control. `ADMIN_ENTRY_PATH` is a 512-bit random path and must never be copied into source files or logs.
- The full npm audit currently reports 10 low/moderate findings in the development/build dependency tree (2 low, 8 moderate; 0 high/critical). The production-only audit passes. npm's suggested automatic fix downgrades `vite-plugin-pwa` to 1.1.0, which predates Vite 8 peer support; the project uses 2.0.0. Do not force that downgrade without a compatible Workbox dependency update. The complete audit report is uploaded by CI.
- Supabase's leaked-password protection warning remains because this feature is not included in the connected Free plan. Enable it after upgrading to a plan that includes the feature.

## Vercel WAF and VPN/Tor handling

- Vercel's automatic DDoS mitigation is enabled by default on all plans. The project's current Vercel state reports `live=false` and its latest deployment is canceled; the WAF configuration API therefore returned “config not found” and no custom edge rate-limit rule could be staged against a live deployment. If the team is on Hobby, WAF rate limiting allows one rule per project; Pro allows 40.
- After the first successful deployment, stage a WAF rule for `/api/admin/*` at 60 requests per 60 seconds keyed by IP in Log mode, observe live traffic for at least 10 minutes, then publish a Challenge or 429 action if the observed traffic is compatible with normal use. JA4 Digest can be reviewed as an additional signal; using JA4 alone as a rate-limit key can group unrelated users with the same TLS fingerprint.
- Vercel documents 1,000,000 included allowed requests for WAF rate limiting on Hobby and Pro, then $0.50 per additional 1,000,000 allowed requests. Review usage before enabling it.
- VPN/Tor use is not a reliable proof of malicious intent. IP changes do not reset the database per-admin rate limit. JA4 can help correlate clients across changing IPs at the WAF, but it is not a unique identity and can group unrelated users. The database per-admin counter is the control that remains effective when a valid account changes IP, while session fingerprint mismatch forces reauthentication. No third-party VPN/Tor reputation feed is configured; avoid blanket blocking of VPNs or Tor exits.

## Important limitation

A random URL is only defense-in-depth, not access control. The path value is stored as a Vercel Sensitive environment variable and is not present in the repository; middleware fails closed when it is missing. Admin APIs still independently require a valid server-verified admin session and database authorization. The internal HTML and static bundles are not secrets, so no authorization decision relies on keeping frontend code undiscoverable.

## Deployment checklist

Before enabling the admin console in production:
1. Confirm the production OAuth redirect pattern in Supabase Auth URL Configuration.
2. Merge and deploy through the existing production-only Vercel workflow; do not disable the configured Preview skip step just to test.
3. After the first live deployment, configure and observe the `/api/admin/*` WAF rate-limit rule before switching it from Log to Challenge/429.
4. Review the CI dependency-audit artifact and remediate any high/critical production advisories.
5. Deploy the updated Supabase Edge Functions from this PR after merge; the database migrations are already applied to the connected project.
6. Upgrade the Supabase project if leaked-password protection is required, then enable it in Auth settings.
