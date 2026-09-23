import { describe, expect, it } from "vitest";
import type { TypeSafeClient } from "@typesafe-ai/sdk";
import { parseCvText } from "../src/lib/cv/profile";
import {
  buildCvReviewEvidence,
  jobCvHash,
  reviewJobAgainstCv,
} from "../src/lib/intelligence/cv-review";
import {
  buildDeterministicFit,
  extractExperienceRequirement,
  parseDateRange,
} from "../src/lib/intelligence/cv-fit";

const cv = parseCvText(
  `Alex Example
Software Engineer
alex@example.com | +94 77 123 4567
Professional Summary
Builds reliable software.
Technical Skills
Languages TypeScript, Python
Work Experience
Example Labs 2023 – 2025
Built TypeScript APIs and tests.`,
  { fileName: "example.txt", pages: 1, importedAt: "2026-09-23T00:00:00.000Z" },
);
const job = {
  title: "TypeScript Software Engineer",
  company: "Example Co",
  description:
    "Must have TypeScript experience building APIs. Familiarity with Python preferred.",
  tags: ["TypeScript"],
  location: "Colombo",
};

describe("private CV job review", () => {
  it("selects bounded evidence without identity or contact details", () => {
    const evidence = buildCvReviewEvidence(job, cv);
    expect(evidence.skills.cvEvidence).toContain("TypeScript");
    expect(JSON.stringify(evidence)).not.toContain("alex@example.com");
    expect(JSON.stringify(evidence)).not.toContain("123 4567");
    expect(jobCvHash(job)).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps model labels attached to the supplied evidence", async () => {
    let sent: unknown;
    const client = {
      systemOne: async (input: unknown) => {
        sent = input;
        return {
          model: "test-jev",
          answers: Object.fromEntries(
            ["role", "careerLevel", "skills", "experience"].map((key) => [
              key,
              { type: "choice", choice: "supported", confidence: 0.9 },
            ]),
          ),
        };
      },
    } as unknown as TypeSafeClient;
    const result = await reviewJobAgainstCv(client, job, cv);
    expect(result.result.dimensions).toHaveLength(4);
    expect(result.result.overallScore).toBeGreaterThan(0);
    expect(result.result.matchedKeywords).toEqual(
      expect.arrayContaining(["TypeScript", "Python"]),
    );
    expect(result.result.missingRequirements).toEqual(expect.any(Array));
    expect(result.result.dimensions[2].verdict).toBe("supported");
    expect(JSON.stringify(sent)).not.toContain("alex@example.com");
    expect(JSON.stringify(sent)).not.toContain("123 4567");
    const sparse = await reviewJobAgainstCv(
      client,
      {
        ...job,
        title: "Full Stack Developer (1)",
        description: "Please refer to vacancy.",
      },
      cv,
    );
    expect(sparse.result.dimensions[2].verdict).toBe("supported");
    expect(sparse.result.dimensions[3].verdict).toBe("unclear");
  });

  it("treats general software engineering as compatible with evidenced full-stack work", () => {
    const fit = buildDeterministicFit(
      {
        title: ".NET Full-stack Developer / Software Engineer",
        description:
          "Must have 2+ years of experience with .NET, React, and SQL.",
        tags: ["Full Stack"],
      },
      parseCvText(
        `Alex Example
Software Engineer
Technical Skills
Frontend React, TypeScript
Backend & APIs Node.js, Express.js
Databases PostgreSQL
Work Experience
Example Labs Jan 2024 – Dec 2025
Software Developer
• Built React and Node.js products.`,
        {
          fileName: "fit.txt",
          pages: 1,
          importedAt: "2026-09-23T00:00:00.000Z",
        },
      ),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(fit.role.jobFamily).toBe("full_stack");
    expect(fit.role.match).toBe("compatible");
    expect(fit.experience.relevantMonths).toBe(24);
    expect(fit.experience.assessment).toBe("meets");
    expect(fit.experience.requirement?.evidence).toContain(".NET");
    expect(fit.skills.skills).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "React", status: "matched" }),
        expect.objectContaining({ name: ".NET", status: "missing" }),
      ]),
    );
  });

  it("merges overlapping professional ranges and checks stated education", () => {
    const fit = buildDeterministicFit(
      {
        title: "Software Engineer",
        description:
          "Bachelor's degree in Information Technology required. Minimum 1 year experience with TypeScript.",
        tags: [],
      },
      parseCvText(
        `Alex Example
Software Engineer
Technical Skills
Languages TypeScript
Education
Example University 2022 – 2026
Bachelor of Science in Information Technology
Work Experience
Example Labs Jan 2024 – Dec 2024
Software Developer
Freelance & Client Projects
Client Product Jun 2024 – Mar 2025
Freelance Software Engineer`,
        {
          fileName: "overlap.txt",
          pages: 1,
          importedAt: "2026-09-23T00:00:00.000Z",
        },
      ),
      new Date("2026-09-23T00:00:00.000Z"),
    );
    expect(fit.experience.totalMonths).toBe(15);
    expect(fit.education.assessment).toBe("meets");
  });

  it("parses inclusive ranges and explicit experience requirements", () => {
    expect(
      parseDateRange(
        "Engineer Feb 2025 – Aug 2025",
        new Date("2026-09-23T00:00:00.000Z"),
      ),
    ).toMatchObject({ openEnded: false });
    expect(
      extractExperienceRequirement(
        "Applicants need at least 2 years of professional experience.",
      ),
    ).toMatchObject({ minMonths: 24, maxMonths: null });
  });
});
