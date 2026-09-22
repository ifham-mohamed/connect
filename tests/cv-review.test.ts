import { describe, expect, it } from "vitest";
import type { TypeSafeClient } from "@typesafe-ai/sdk";
import { parseCvText } from "../src/lib/cv/profile";
import {
  buildCvReviewEvidence,
  jobCvHash,
  reviewJobAgainstCv,
} from "../src/lib/intelligence/cv-review";

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
            ["role", "skills", "experience"].map((key) => [
              key,
              { type: "choice", choice: "supported", confidence: 0.9 },
            ]),
          ),
        };
      },
    } as unknown as TypeSafeClient;
    const result = await reviewJobAgainstCv(client, job, cv);
    expect(result.result.dimensions).toHaveLength(3);
    expect(result.result.dimensions[1].verdict).toBe("supported");
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
    expect(sparse.result.dimensions[1].verdict).toBe("unclear");
    expect(sparse.result.dimensions[2].verdict).toBe("unclear");
  });
});
