# Known limitations

Prior application verification is historical; consult task evidence and rerun checks for current changes.

Static import impact analysis cannot prove affected-test completeness: dynamic imports, SQL, environment configuration and runtime routing need manual review. Run the full existing test suite for application changes.

Previous browser checks covered isolated demo desktop/mobile interactions, not live private CV or image-review data. PGlite checks do not certify production PostgreSQL operation.
