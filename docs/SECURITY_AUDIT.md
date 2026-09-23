# Jobradar security review

Reviewed: 2026-09-23

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
- Sessions expire after seven days, can be individually revoked, and are bound to a privacy-preserving browser-context hash. A device-context mismatch revokes the session.
- Network changes are reported but do not automatically revoke a session because legitimate mobile and corporate networks change frequently.
- Login throttling applies to both the account identifier and a keyed network hash.

### Authorization and tenant isolation

- Every mutation requires a same-origin request and an authenticated user.
- Owner operations require the owner role.
- Monitor, CV, saved-job, application, note, and review queries are scoped by user ID.
- Member job reads require a matching enabled monitor or existing personal state.
- Denied role, origin, job-read, and job-write attempts are recorded.

### Input, database, and fetch boundaries

- Structured inputs use Zod allowlists and bounded field lengths.
- Sensitive JSON endpoints verify content type and actual byte length, including chunked requests without `Content-Length`.
- Owner onboarding is capped at 100 locations and 500 monitors to prevent database and CPU exhaustion.
- SQL values use PostgreSQL parameters. Dynamic SQL fragments are selected by server-controlled branches.
- Server fetches for job-detail enrichment restrict protocols and source hostnames, reject redirects, enforce timeouts, check content types, and cap response sizes.
- CV and vacancy-image parsing runs in the browser; only user-reviewed structured text is saved.

### Security reporting

- Security events record the account, event type, severity, route, time, and keyed device/network hashes.
- Raw IP addresses, full user-agent strings, canvas data, installed fonts, and other invasive fingerprint material are not stored.
- Owners see warning and critical workspace events. Members see events related to their account.
- Users can inspect and revoke active sessions in Workspace settings.

## Residual risks and recommended production work

1. Add MFA or passkeys, verified email ownership, recovery codes, and a secure password-reset flow before public multi-tenant deployment.
2. Put distributed rate limiting at the edge. Database-backed limits protect one deployment but are less efficient during a large denial-of-service attack.
3. Configure the reverse proxy to overwrite forwarded-IP headers. Directly accepting client-supplied forwarding headers weakens network attribution, although stored values remain one-way hashes.
4. Remove CSP `style-src 'unsafe-inline'` after migrating React style attributes to classes or nonced styles. Script execution is already nonce-restricted.
5. Send critical events to an external append-only alert destination. Database administrators can alter events stored in the application database.
6. Encrypt database backups, rotate database/JEV/cron/audit secrets, use least-privilege database roles, and test restoration regularly.
7. Add automated dependency and container scanning in CI, then patch high-severity advisories under a defined service-level target.
8. Add retention automation for security events and document the retention period for users. The intended initial retention is 90 days.
9. Commission an independent penetration test before exposing owner controls or private candidate data to untrusted public traffic.
