# Source references and integration decisions

## Request and write efficiency

The collector stores each source response `ETag` and `Last-Modified` value. Later GET requests send conditional validators when available. A `304 Not Modified` response records a successful lightweight run without reparsing the feed, rewriting jobs, rebuilding matches, or queueing JEV. Normalized jobs also carry a stable content hash, so only new or materially changed listings enter the write, match, and intelligence path. Run-to-job links are inserted in one batch.

Each scheduled invocation atomically leases one due source for 12 minutes. A failed process cannot permanently block the source, and concurrent triggers cannot claim the same source. HTTP validation is an optimization; feeds that omit validators continue through content hashing.

## Source trust and security

Every source is untrusted input. Server collectors use fixed allowlisted hosts, reject redirects, apply timeouts and response-size limits, validate source-specific structures, convert HTML to plain text, and retain only HTTP(S) destination URLs. Employer board identifiers cannot supply a host or protocol. Collection failures preserve prior records and never relax validation.

TopJobs vacancy images and user-selected source images are processed in the signed-in user’s browser. Fetching an image contacts the original publisher from that browser. The image bytes are not uploaded to Jobradar or JEV; only text the user reviews and explicitly saves is stored through the authenticated, bounded, rate-limited image-context endpoint.

Reviewed on 20 September 2026. The platform prioritizes documented feeds and direct employer APIs over fragile page scraping. Availability and policies can change.

| Primary reference                                                                                       | Implementation decision                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ITPro.lk RSS documentation](https://itpro.lk/rss/)                                                     | ITPro explicitly describes using its feeds in alerts and job dashboards. Use `https://itpro.lk/rss/all/`, retaining the listing URL, company, location, type, and timezone-aware publication date. |
| [ITPro.lk developer API](https://itpro.lk/developer/)                                                   | A supported API also exists. The RSS feed was selected because its listing URLs and human-readable locations avoid numeric-location lookups.                                                       |
| [Remotive API documentation and terms](https://github.com/remotive-com/remote-jobs-api)                 | Fetch at most every six hours, label Remotive as the source, retain its URL and location restrictions, and do not gate its listings behind signup. Public data is delayed by 24 hours.             |
| [Lever Postings API](https://github.com/lever/postings-api)                                             | Each source targets a specific employer’s board slug. Store the hosted posting URL; do not invent a publication timestamp when it is absent.                                                       |
| [Dijital Team public careers board](https://jobs.lever.co/dijital-team-pty-ltd)                         | A concrete employer source for Sri Lankan technology roles. It is an integration example, not an endorsement or a guarantee of eligibility.                                                        |
| [Greenhouse Job Board API](https://docs.greenhouse.io/job-board.html)                                   | Public GET endpoints do not require authentication. Fetch one employer board with content; do not confuse its update timestamp with publication.                                                   |
| [Arbeitnow job board API](https://www.arbeitnow.com/blog/job-board-api)                                 | Optional source for recent European jobs. The first page is a bounded recent feed, not a complete archive.                                                                                         |
| [LinkedIn Jobs search help](https://www.linkedin.com/help/linkedin/answer/a511260)                      | Build monitor-led links into LinkedIn’s own search using role keywords and location preferences. Keep LinkedIn results in LinkedIn rather than presenting them as collected Jobradar records.      |
| [LinkedIn Job Posting API](https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview) | The documented API is restricted to approved partners and is designed for posting jobs, not public job discovery. Do not use it as a search collector or add an unsupported LinkedIn crawler.      |
| [Next.js installation](https://nextjs.org/docs/app/getting-started/installation)                        | App Router with TypeScript and a current Node LTS runtime. Exact installed versions are pinned in `package-lock.json`.                                                                             |
| [Neon connection pooling](https://neon.com/docs/connect/connection-pooling)                             | Consider pooled web connections when scaling, but preserve session semantics for the collector’s PostgreSQL advisory lock.                                                                         |

Live smoke checks during development successfully normalized **17 ITPro.lk tech jobs, 15 Remotive tech jobs, and 19 Dijital Team tech jobs**. These counts are a point-in-time test result, not fixed dashboard values or a completeness claim. Test output contained real source URLs and preserved missing publication dates as null.

LinkedIn is represented as a monitor-powered discovery search, not a connected collector. A monitor supplies the default position, included keywords, location, and remote preference. The discovery panel can refine those defaults with an explicit position or keyword phrase, location, work arrangement, experience level, job type, and posting date. LinkedIn results remain on LinkedIn, and no unsupported crawler is included. Obtain suitable licensed search/feed access before importing LinkedIn listings. This release does not copy listings onward to other job aggregators.

The LinkedIn panel also links to the supported **In my network** job search and to LinkedIn’s member-post search for hiring, vacancy, opportunity, and job-opening language. LinkedIn does not expose “posts reacted to by my connections” as a dependable search filter, so Jobradar does not claim to monitor that private engagement signal.

Additional discovery controls cover result order, location radius, Easy Apply, and roles with fewer than ten applicants. The seeded monitor set includes focused early-career searches for Sri Lanka and Qatar plus a remote React/full-stack search for worldwide listings.

Member-post discovery is presented separately from job listings. It provides Sri Lanka, Qatar first-degree-network, and global searches using regional hiring language. LinkedIn controls the final Post results and may expose additional **Posted by** and **Content type** filters after the search opens.
