# Jobradar security review

## Scaling update (2026-09-23)

Focused reads retain the existing account visibility predicates and owner-only source and run boundaries. Job descriptions remain behind the authorized ID endpoint. Cursor inputs, source and monitor IDs, search terms, locations, work modes, and limits are schema validated; limits cannot exceed 50. Revision ETags contain only numeric resource versions.

Scheduled writes require a constant-time Bearer-secret comparison and POST. PostgreSQL leases use fixed SQL and generated UUIDs. Conditional response headers are stored as opaque text and are only sent back to their original fixed source URL. The workspace AI budget blocks requests before provider access, and provider credit or rate failures pause local AI calls. Daily retention removes old operational rows while preserving personal data and critical security events.

Reviewed: 2026-09-23

Scope: browser rendering, authentication, sessions, authorization, private candidate data, AI review usage, source ingestion, database access, scheduled collection, input validation, logging, and deployment configuration. This is an application review, not an independent penetration test.

## Protected assets

- Account credentials and authenticated sessions
- Per-user CV profiles, saved jobs, notes, applications, monitors, and reviews
- Owner-only source, collection, and JEV rollout controls
- Database and third-party API credentials

## Implemented controls

### Browser and XSS boundaries

- A per-request CSP nonce limits executable scripts to trusted application code.
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, and `frame-ancestors 'none'` reduce script injection, base-tag injection, form exfiltration, and clickjacking.
- React text rendering remains the default for external listing and user content. The only raw script is the static theme bootstrap and it receives the request nonce.
- External job and image links are restricted to HTTP(S) protocols before rendering.
- MIME sniffing, framing, referrer, opener, resource, permissions, and production HSTS headers are enabled.

### Authentication and sessions

- Passwords use salted scrypt hashes and comparison timing is equalized for unknown accounts.
- Session tokens contain 256 bits of randomness, are stored only as SHA-256 hashes, and use `HttpOnly`, `SameSite=Strict`, high-priority cookies. Production cookies require HTTPS.
- Sessions expire after seven days, can be individually revoked, are capped at the ten newest sessions per account, and are bound to a privacy-preserving browser-context hash. A device-context mismatch revokes the session.
- Network changes are reported but do not automatically revoke a session because legitimate mobile and corporate networks change frequently.
- Login throttling applies to both the account identifier and a keyed network hash.
- Authentication throttling returns a five-minute retry window and is enforced in PostgreSQL across application instances.
- Member CV-to-job analysis uses an atomic daily allowance. The default is five per Sri Lanka calendar day, failed calls release their reservation, cached reviews are free, and owners are unlimited.
- Only the workspace owner can change the member AI allowance in Workspace settings.
- All authenticated mutations pass a persistent, per-user, per-route fixed-window limit. Manual source collection has an additional limit of three runs per fifteen minutes.

### Authorization and tenant isolation

- Every mutation requires a same-origin request and an authenticated user.
- Production same-origin checks fail closed if `APP_URL` is missing or invalid.
- Owner operations require the owner role.
- Monitor, CV, saved-job, application, note, and review queries are scoped by user ID.
- Member job reads require a matching enabled monitor or existing personal state.
- Denied role, origin, job-read, and job-write attempts are recorded.

### Input, database, and fetch boundaries

- Structured inputs use Zod allowlists and bounded field lengths.
- Sensitive JSON endpoints verify content type and enforce actual byte length while reading the stream, including chunked requests without `Content-Length`. Oversized streams are cancelled before the full payload is buffered.
- Owner onboarding is capped at 100 locations and 500 monitors to prevent database and CPU exhaustion.
- SQL values use PostgreSQL parameters. Dynamic SQL fragments are selected by server-controlled branches.
- Server fetches for job-detail enrichment restrict protocols and source hostnames, reject redirects, enforce timeouts, check content types, and cap response sizes.
- CV and vacancy-image parsing runs in the browser; only user-reviewed structured text is saved.
- Private API responses are `no-store`. Approved CV and extracted vacancy text writes use the same authorization, origin, bounded-body, and rate-limit path as other mutations.

### Security reporting

- Security events record the account, event type, severity, route, time, and keyed device/network hashes.
- Raw IP addresses, full user-agent strings, canvas data, installed fonts, and other invasive fingerprint material are not stored.
- Owners see warning and critical workspace events. Members see events related to their account.
- Users can inspect and revoke active sessions in Workspace settings.

## Findings closed in this review

| Finding                                                                           | Risk                                                                                              | Resolution                                                                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Vacancy-image context accepted `request.json()` directly                          | An authenticated browser could send an unbounded body and bypass common write auditing/throttling | Routed through `authorizeWrite`, streamed JSON limits, schema validation, generic errors, and persistent throttling |
| CV and onboarding writes buffered text before applying their effective size limit | A chunked oversized request could consume excess memory before rejection                          | Both now use the shared streaming body reader with endpoint-specific byte caps                                      |
| Authenticated writes had endpoint-specific or no request throttling               | Repeated writes could amplify database, collector, or provider work across instances              | Added PostgreSQL-backed route limits and a stricter manual-sync budget with standard 429 responses                  |
| Production origin fallback trusted the request URL when `APP_URL` was absent      | A misconfigured deployment could evaluate same-origin against attacker-controlled host data       | Production now fails closed; the request-origin fallback is development-only                                        |
| Forwarded IP headers were always accepted                                         | A direct client could spoof network attribution unless the proxy overwrote the header             | Headers are ignored by default and require explicit `TRUST_PROXY_HEADERS=true` deployment configuration             |
| Private API cache behavior depended on individual handlers                        | A future private route could omit its own cache header                                            | All `/api/*` responses now receive `Cache-Control: no-store` from application configuration                         |

## Residual risks and recommended production work

1. Add MFA or passkeys, verified email ownership, recovery codes, and a secure password-reset flow before public multi-tenant deployment.
2. Put coarse denial-of-service protection at the CDN or reverse-proxy edge. Database-backed limits are consistent across application instances but still spend application and database capacity before rejecting a request.
3. Configure the reverse proxy to overwrite forwarded-IP headers before enabling `TRUST_PROXY_HEADERS`. Until enabled, network identifiers remain unavailable rather than accepting spoofable attribution.
4. Remove CSP `style-src 'unsafe-inline'` after migrating React style attributes to classes or nonced styles. Script execution is already nonce-restricted.
5. Send critical events to an external append-only alert destination. Database administrators can alter events stored in the application database.
6. Encrypt database backups, rotate database/JEV/cron/audit secrets, use least-privilege database roles, and test restoration regularly.
7. Add automated dependency and container scanning in CI, then patch high-severity advisories under a defined service-level target.
8. Move 90-day security-event and expired-rate-counter retention from opportunistic login cleanup to a scheduled maintenance job for installations with infrequent logins.
9. Commission an independent penetration test before exposing owner controls or private candidate data to untrusted public traffic.
