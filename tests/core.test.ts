import { describe, expect, it } from "vitest";
import {
  containsKeyword,
  matchesExperience,
  matchesLocation,
  matchesMonitor,
  matchesWorkModes,
  plainText,
  safeUrl,
} from "../src/lib/matching";
import { normalize, sourceUrl } from "../src/lib/connectors";
import {
  linkedInJobPostsSearchUrl,
  linkedInJobsSearchUrl,
  linkedInNetworkJobsSearchUrl,
  linkedInSearchTerms,
} from "../src/lib/linkedin";
import { monitorSchema, onboardingSchema, ownerOnboardingSchema, sourceSchema } from "../src/lib/validation";
import type { Monitor, Source } from "../src/lib/types";
const monitor: Monitor = {
  id: "m",
  name: "Engineering",
  keywords: ["React", "C++"],
  excludedKeywords: ["manager"],
  remoteOnly: true,
  location: "Sri Lanka",
  enabled: true,
  createdAt: "",
};
const source: Source = {
  id: "s",
  name: "Employer",
  kind: "itpro",
  board: "acme",
  enabled: true,
  intervalMinutes: 60,
  lastAttemptAt: null,
  lastSyncedAt: null,
  lastError: null,
  jobCount: 0,
};
describe("keyword matching", () => {
  it("keeps internship and entry roles in distinct career stages", () => {
    expect(matchesExperience("Senior Software Engineer", "entry")).toBe(false);
    expect(matchesExperience("Software Engineer Internship", "internship")).toBe(true);
    expect(matchesExperience("Software Engineer Internship", "entry")).toBe(false);
    expect(matchesExperience("Graduate Software Engineer", "entry")).toBe(true);
    expect(matchesExperience("Junior Software Engineer", "internship")).toBe(false);
    expect(
      matchesMonitor(
        { ...job, title: "Senior React engineer" },
        monitor,
        "entry",
      ),
    ).toBe(false);
  });
  it("applies the same compatibility rule to every career stage", () => {
    expect(matchesExperience("Intermediate Software Engineer", "mid")).toBe(
      true,
    );
    expect(matchesExperience("Graduate Software Engineer", "mid")).toBe(
      false,
    );
    expect(matchesExperience("Lead Software Engineer", "senior")).toBe(true);
    expect(matchesExperience("Level II Software Engineer", "senior")).toBe(
      false,
    );
    expect(matchesExperience("Software Engineer", "other")).toBe(true);
    expect(matchesExperience("Junior Software Engineer", "other")).toBe(false);
    expect(matchesExperience("Full Stack Developer (1)", "entry")).toBe(true);
    expect(matchesExperience("Full Stack Developer I", "entry")).toBe(true);
    expect(matchesExperience("Full Stack Developer (2)", "mid")).toBe(true);
    expect(matchesExperience("Full Stack Developer II", "mid")).toBe(true);
    expect(matchesExperience("Full Stack Developer (3)", "senior")).toBe(true);
    expect(matchesExperience("Full Stack Developer III", "senior")).toBe(true);
  });
  it("matches each monitor against its accepted work arrangements", () => {
    expect(matchesWorkModes({ ...job, remote: true }, ["remote"])).toBe(true);
    expect(matchesWorkModes({ ...job, remote: true }, ["onsite"])).toBe(false);
    expect(matchesWorkModes({ ...job, remote: false, location: "Colombo", tags: ["Hybrid"] }, ["hybrid"])).toBe(true);
    expect(matchesWorkModes({ ...job, remote: false, location: "Colombo", tags: [] }, ["onsite"])).toBe(true);
    expect(matchesWorkModes({ ...job, remote: false, location: "Worldwide", tags: [] }, ["remote"])).toBe(true);
  });
  it("recognizes known Sri Lankan cities without changing source location text", () => {
    expect(matchesLocation("Colombo", "Sri Lanka")).toBe(true);
    expect(matchesLocation("Western Province", "Sri Lanka")).toBe(true);
    expect(matchesLocation("Batticaloa", "Sri Lanka")).toBe(true);
    expect(matchesLocation("US only", "Sri Lanka")).toBe(false);
  });
  it("does not match short skills inside unrelated words", () => {
    expect(containsKeyword("Build delightful products", "UI")).toBe(false);
    expect(containsKeyword("UI engineer", "UI")).toBe(true);
    expect(containsKeyword("C++ engineer", "C++")).toBe(true);
    expect(containsKeyword("Next.js developer", "Next.js")).toBe(true);
  });
  const job = {
    title: "React engineer",
    company: "Acme",
    description: "Build software",
    tags: ["React"],
    location: "Colombo, Sri Lanka",
    remote: true,
  };
  it("matches any keyword, case-insensitively, including literal punctuation", () => {
    expect(matchesMonitor(job, monitor)).toBe(true);
    expect(
      matchesMonitor({ ...job, title: "C++ engineer", tags: [] }, monitor),
    ).toBe(true);
  });
  it("honors exclusion, enabled state, remote restriction and location together", () => {
    expect(matchesMonitor({ ...job, title: "React manager" }, monitor)).toBe(
      false,
    );
    expect(matchesMonitor({ ...job, remote: false }, monitor)).toBe(false);
    expect(matchesMonitor({ ...job, location: "US only" }, monitor)).toBe(
      false,
    );
    expect(matchesMonitor(job, { ...monitor, enabled: false })).toBe(false);
  });
});
describe("LinkedIn job discovery", () => {
  it("builds a monitor-led search with location, recency, and remote filters", () => {
    const url = new URL(linkedInJobsSearchUrl({ monitor }));

    expect(url.origin).toBe("https://www.linkedin.com");
    expect(url.pathname).toBe("/jobs/search/");
    expect(url.searchParams.get("keywords")).toBe("Engineering OR React OR C++");
    expect(url.searchParams.get("location")).toBe("Sri Lanka");
    expect(url.searchParams.get("f_TPR")).toBe("r604800");
    expect(url.searchParams.get("f_WT")).toBe("2");
  });
  it("uses an explicit position search and removes duplicate monitor terms", () => {
    expect(linkedInSearchTerms(monitor, "  Product   Engineer ")).toBe(
      "Product Engineer",
    );
    expect(
      linkedInSearchTerms({
        ...monitor,
        name: "React",
        keywords: ["react", "TypeScript"],
      }),
    ).toBe("React OR TypeScript");
  });
  it("maps the discovery filters to LinkedIn search parameters", () => {
    const url = new URL(
      linkedInJobsSearchUrl({
        monitor,
        query: "Frontend Engineer",
        location: "Colombo",
        workplace: "hybrid",
        experience: "entry",
        jobType: "full-time",
        datePosted: "day",
        sort: "recent",
        distance: "50",
        easyApply: true,
        underTenApplicants: true,
      }),
    );

    expect(url.searchParams.get("keywords")).toBe("Frontend Engineer");
    expect(url.searchParams.get("location")).toBe("Colombo");
    expect(url.searchParams.get("f_WT")).toBe("3");
    expect(url.searchParams.get("f_E")).toBe("2,3");
    expect(url.searchParams.get("f_JT")).toBe("F");
    expect(url.searchParams.get("f_TPR")).toBe("r86400");
    expect(url.searchParams.get("sortBy")).toBe("DD");
    expect(url.searchParams.get("distance")).toBe("50");
    expect(url.searchParams.get("f_AL")).toBe("true");
    expect(url.searchParams.get("f_EA")).toBe("true");
    const hybrid = new URL(linkedInJobsSearchUrl({ monitor: { ...monitor, remoteOnly: false, workModes: ["hybrid"] } }));
    expect(hybrid.searchParams.get("f_WT")).toBe("3");
  });
  it("builds supported network-job and job-post discovery searches", () => {
    const networkUrl = new URL(
      linkedInNetworkJobsSearchUrl({ monitor, location: "Colombo" }),
    );
    const postsUrl = new URL(
      linkedInJobPostsSearchUrl({
        monitor,
        audience: "qatar",
        firstDegreeOnly: true,
      }),
    );

    expect(networkUrl.pathname).toBe("/jobs/search/");
    expect(networkUrl.searchParams.get("keywords")).toBe(
      "Engineering jobs in my network",
    );
    expect(postsUrl.pathname).toBe("/search/results/content/");
    expect(postsUrl.searchParams.get("keywords")).toContain("Engineering");
    expect(postsUrl.searchParams.get("keywords")).toContain("hiring OR vacancy");
    expect(postsUrl.searchParams.get("keywords")).toContain("Qatar OR Doha");
    expect(postsUrl.searchParams.get("network")).toBe('["F"]');
    expect(postsUrl.searchParams.get("sortBy")).toBe("date_posted");
  });
  it("builds distinct Sri Lankan and global member-post searches", () => {
    const sriLanka = new URL(
      linkedInJobPostsSearchUrl({ monitor, audience: "sri-lanka" }),
    );
    const global = new URL(
      linkedInJobPostsSearchUrl({ monitor, audience: "global" }),
    );

    expect(sriLanka.pathname).toBe("/search/results/content/");
    expect(sriLanka.searchParams.get("keywords")).toContain("Western Province");
    expect(global.searchParams.get("keywords")).toContain("remote OR worldwide");
    expect(global.searchParams.has("network")).toBe(false);
  });
  it("keeps a geographic monitor label out of the position query", () => {
    const url = new URL(
      linkedInJobsSearchUrl({
        monitor: {
          ...monitor,
          name: "Software Engineering · Qatar",
          location: "Qatar",
        },
      }),
    );

    expect(url.searchParams.get("keywords")).toContain("Software Engineering");
    expect(url.searchParams.get("keywords")).not.toContain("· Qatar");
    expect(url.searchParams.get("location")).toBe("Qatar");
  });
});
describe("source normalization and trust boundaries", () => {
  it("keeps feed publication timezone and source URL with Sri Lankan location", () => {
    const feed = `<rss><channel><item><title>Software Engineer</title><guid>42</guid><link>https://itpro.lk/job/42/</link><pubDate>Sun, 20 Sep 2026 14:21:54 +0530</pubDate><content:encoded><![CDATA[<strong>Company:</strong> Acme<br><strong>Location:</strong> Colombo<br><strong>Job Type:</strong> Full-time<br><p>Build software.</p>]]></content:encoded></item></channel></rss>`;
    const [job] = normalize(source, feed);
    expect(job.company).toBe("Acme");
    expect(job.location).toBe("Colombo · Sri Lanka");
    expect(job.publishedAt).toBe("2026-09-20T08:51:54.000Z");
    expect(job.remote).toBe(false);
    expect(job.url).toBe("https://itpro.lk/job/42/");
  });
  it("does not invent publication dates from employer updated dates", () => {
    const [job] = normalize(
      { ...source, kind: "greenhouse" },
      {
        jobs: [
          {
            id: 12,
            title: "Backend engineer",
            location: { name: "Colombo" },
            absolute_url: "https://boards.greenhouse.io/acme/jobs/12",
            updated_at: "2026-01-01",
          },
        ],
      },
    );
    expect(job.publishedAt).toBeNull();
  });
  it("preserves Remotive attribution, salary and location restrictions", () => {
    const [job] = normalize(
      { ...source, kind: "remotive" },
      {
        jobs: [
          {
            id: 7,
            title: "Software engineer",
            company_name: "Acme",
            candidate_required_location: "US only",
            url: "https://remotive.com/remote-jobs/7",
            salary: "$100,000",
            publication_date: "2026-09-01T12:00:00",
          },
        ],
      },
    );
    expect(job.location).toBe("US only");
    expect(job.url).toContain("remotive.com");
    expect(job.salary).toBe("$100,000");
    expect(job.remote).toBe(true);
  });
  it("rejects unsafe links, XML entities, invalid payloads and arbitrary hosts", () => {
    expect(safeUrl("javascript:alert(1)")).toBe("");
    expect(safeUrl("https://example.com/job")).toBe("https://example.com/job");
    expect(() =>
      normalize(source, "<!DOCTYPE rss><rss><channel/></rss>"),
    ).toThrow();
    expect(() =>
      normalize({ ...source, kind: "remotive" }, { unexpected: [] }),
    ).toThrow();
    expect(() =>
      sourceUrl({ ...source, kind: "lever", board: "../../localhost" }),
    ).toThrow();
  });
  it("renders untrusted descriptions as text", () => {
    expect(
      plainText("<script>alert(1)</script><p>Hello &amp; welcome</p>"),
    ).toBe("Hello & welcome");
  });
  it("validates monitor and connector configuration", () => {
    expect(monitorSchema.safeParse({ name: " ", keywords: [] }).success).toBe(
      false,
    );
    expect(
      sourceSchema.safeParse({ name: "Acme", kind: "lever", board: "" })
        .success,
    ).toBe(false);
    expect(
      sourceSchema.safeParse({
        name: "Acme",
        kind: "lever",
        board: "acme-team",
      }).success,
    ).toBe(true);
    expect(
      onboardingSchema.safeParse({
        experience: "entry",
        roles: ["Software Engineer"],
        locations: ["Sri Lanka"],
        workModes: ["hybrid", "remote"],
        monitors: [
          {
            name: "Entry software · Sri Lanka",
            keywords: ["junior software engineer"],
            excludedKeywords: ["senior"],
            location: "Sri Lanka",
            remoteOnly: false,
            workModes: ["onsite", "hybrid", "remote"],
            enabled: true,
          },
        ],
      }).success,
    ).toBe(true);
    const manyLocations = Array.from({ length: 30 }, (_, index) => `Country ${index}`);
    const ownerPayload = {
      experience: "entry" as const,
      roles: ["Software Engineer"],
      locations: manyLocations,
      workModes: ["hybrid" as const],
      monitors: [{ name: "Global software", keywords: ["software engineer"], excludedKeywords: ["senior"], location: "", remoteOnly: false, enabled: true }],
    };
    expect(onboardingSchema.safeParse(ownerPayload).success).toBe(false);
    expect(ownerOnboardingSchema.safeParse(ownerPayload).success).toBe(true);
    expect(ownerOnboardingSchema.safeParse({ ...ownerPayload, locations: ["Worldwide"], locationWorkModes: [{ location: "Worldwide", workModes: ["onsite"] }] }).success).toBe(false);
    expect(onboardingSchema.safeParse({
      experience: "entry",
      roles: ["Software Engineer"],
      locations: ["Sri Lanka"],
      workModes: ["hybrid"],
      monitors: [{ name: "Entry software", keywords: ["software engineer"], excludedKeywords: Array.from({ length: 30 }, (_, index) => `excluded ${index}`), location: "Sri Lanka", remoteOnly: false, enabled: true }],
    }).success).toBe(true);
  });
});
