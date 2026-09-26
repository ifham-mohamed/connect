# Security context

Read [the security authority](../../docs/security/security-audit.md) and inspect current auth, security, request-body and rate-limit modules. Historical audit observations are not current verification.

Preserve owner/member isolation, job-access checks before personal mutations, denied-access auditing and rate limits. Never place credentials, candidate documents, private images, sessions or conversation transcripts in shared context or indices.

Development checks do not load `.env`, invoke workers, migrate databases, collect sources, evaluate live JEV services or deploy. Release work requires an explicit task and authorization appropriate to its effects.
