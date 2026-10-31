# Security controls and operational notes

This document describes the controls implemented for the application and the remaining deployment prerequisites. It intentionally does not publish the private console path.

## Administrative access

- The admin entry is not linked from public application navigation.
- Admin OAuth uses an isolated Supabase client/storage key. The temporary browser OAuth session is cleared after exchanging it for a server-set cookie.
- The admin cookie is `HttpOnly; Secure; SameSite=Strict; Path=/`, has no `Domain` attribute, is not readable by application JavaScript, and expires after at most 10 minutes.
- Every admin API request validates the access token with Supabase Auth and re-checks the server-issued `app_metadata.is_admin` claim.
- The repository's Supabase local config now allows the production origin path pattern for OAuth return. The connected Auth redirect allowlist is managed outside SQL and could not be read or changed through the available Supabase connection; verify the production wildcard in Auth URL Configuration before enabling admin login.
- Mutating requests require a same-origin HTTPS Origin and JSON content type. Admin API responses are non-cacheable.
- Admin reads and writes run with the caller's JWT and remain subject to Supabase RLS. No service-role key is used in the browser or admin API.
- Admin request limits are enforced in PostgreSQL per authenticated admin: 90 reads/minute, 20 writes/minute and 5 session operations/minute. Counter tables live in a non-PostgREST `private` schema, have RLS, and are updated through SECURITY INVOKER functions.
- Private media uploads are limited in PostgreSQL to 10 uploads/minute per authenticated user; the counter is also stored in the non-exposed `private` schema.
- The session endpoint also applies a best-effort per-IP limit of 20 requests/minute per serverless instance. This is not a substitute for a distributed edge limit.

## Input and upload controls

- Admin mutations use an allowlist of actions, UUID validation, bounded text/array fields, HTTPS-only source/image URLs, and a 32 KB JSON body ceiling. PostgreSQL also enforces size/length constraints for feedback, profiles, notes, projects, checklists and automotive catalog rows (including a 10 MB project JSONB ceiling and 1 MB checklist JSONB ceiling).
- The application uses Supabase/PostgREST parameterized queries; no user-controlled SQL is assembled.
- The private `user-media` bucket accepts only WebP, is limited to 5 MB, and has owner-folder RLS policies that check the extension, MIME metadata and size. Direct SVG/PDF/JPEG/PNG uploads are rejected by the bucket policy.
- The normal product-label upload flow accepts JPEG/PNG/WebP, checks file signatures and dimensions, then decodes/re-encodes to WebP (removing metadata) before storage. This browser-side transform is defense in depth; Storage RLS validates declared MIME/extension/size, not the binary image decoder output itself.
- The Express runtime limits JSON bodies to 256 KB, chat prompts to 24,000 characters, chat streams to 12 requests/minute per IP, 8 concurrent streams globally and 2 per IP. Gemini stream duration is capped at 120 seconds.
- Gemini Live WebSockets require same-origin HTTPS (localhost HTTP only in local development), have a 128 KB frame ceiling, 600 messages/minute per connection, 2 connections/IP and 50 concurrent connections globally. Slow consumers are closed when buffered output exceeds 2 MB.
- Express in-memory limits are per process, not globally distributed. The Vercel project is configured as a Vite static app; `server.ts` is the local/self-hosted Express runtime, not the Vercel serverless runtime.

## Browser and transport protections

- HSTS, `nosniff`, frame denial, strict referrer policy, restrictive camera/microphone/geolocation permissions and COOP are configured globally.
- The admin entry has an enforced Content Security Policy, `no-store`, `no-referrer` and `X-Robots-Tag: noindex`.
- A site-wide CSP is currently Report-Only to collect compatibility signals before enforcing it across all existing features.

## Database and secrets

- `pg_net` was moved from the `public` schema to `extensions`; its `net.http_post` function remains available.
- The admin rate-limit table is protected by RLS. The admin stats function remains SECURITY INVOKER.
- Vercel runtime secrets (`GEMINI_API_KEY`, `CRON_SECRET`, `ADMIN_SECRET` and `VAPID_KEYS`) use the Secret/Sensitive visibility type; their values are not stored in source control.
- Supabase's leaked-password protection warning remains because this feature is not included in the connected Free plan. Enable it after upgrading to a plan that includes the feature.

## Vercel WAF and VPN/Tor handling

- Vercel's automatic DDoS mitigation is enabled by default on all plans. The project's current Vercel state reports `live=false` and its latest deployment is canceled; the WAF configuration API therefore returned “config not found” and no custom edge rate-limit rule could be staged against a live deployment. If the team is on Hobby, WAF rate limiting allows one rule per project; Pro allows 40.
- After the first successful deployment, stage a WAF rule for `/api/admin/*` at 60 requests per 60 seconds keyed by IP in Log mode, observe live traffic for at least 10 minutes, then publish a Challenge or 429 action if the observed traffic is compatible with normal use. JA4 Digest can be reviewed as an additional signal; using JA4 alone as a rate-limit key can group unrelated users with the same TLS fingerprint.
- Vercel documents 1,000,000 included allowed requests for WAF rate limiting on Hobby and Pro, then $0.50 per additional 1,000,000 allowed requests. Review usage before enabling it.
- VPN/Tor use is not a reliable proof of malicious intent. IP changes do not reset the database per-admin rate limit. JA4 can help correlate clients across changing IPs at the WAF, but it is not a unique identity and can group unrelated users. The database per-admin counter is the control that remains effective when a valid account changes IP. No third-party VPN/Tor reputation feed is configured; avoid blanket blocking of VPNs or Tor exits.

## Important limitation

A random URL is obscurity, not access control. The route and rewrite are present in the repository's deployment configuration, so anyone with repository access can read the path. The server-side authentication and RLS checks are the actual security boundary. For stronger secrecy, move the route mapping into Vercel-managed routing configuration outside the repository when a live deployment and routing-management workflow are available.
