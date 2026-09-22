import { describe, expect, it } from "vitest";
import {
  extractCvInBrowser,
  pdfItemsToLines,
} from "../src/lib/cv/extract-client";
import { cvSkillTerms, parseCvText } from "../src/lib/cv/profile";
import { approvedCvSchema } from "../src/lib/cv/schema";

const source = {
  fileName: "sample.pdf",
  pages: 2,
  importedAt: "2026-09-23T00:00:00.000Z",
};

describe("CV extraction and approval", () => {
  it("requires explicit approval and bounded structured content", () => {
    const profile = parseCvText(
      "Alex Example\nSoftware Engineer\nTechnical Skills\nLanguages TypeScript",
      source,
    );
    expect(
      approvedCvSchema.safeParse({ approved: true, baseRevision: 0, profile })
        .success,
    ).toBe(true);
    expect(
      approvedCvSchema.safeParse({ approved: false, baseRevision: 0, profile })
        .success,
    ).toBe(false);
    expect(
      approvedCvSchema.safeParse({
        approved: true,
        baseRevision: 0,
        profile: { ...profile, rawText: "x".repeat(150001) },
      }).success,
    ).toBe(false);
  });
  it("reads a plain-text CV without an upload request", async () => {
    const file = new File(
      [
        "Alex Example\nSoftware Engineer\nProfessional Summary\nBuilds reliable software.\nTechnical Skills\nLanguages TypeScript, Python",
      ],
      "cv.txt",
      { type: "text/plain" },
    );
    const statuses: string[] = [];
    const profile = await extractCvInBrowser(file, (status) =>
      statuses.push(status),
    );
    expect(profile.identity.name).toBe("Alex Example");
    expect(cvSkillTerms(profile)).toContain("TypeScript");
    expect(statuses).toEqual([
      "Reading text in this browser",
      "Organizing CV sections",
    ]);
  });
  it("reconstructs PDF rows in reading order", () => {
    const lines = pdfItemsToLines([
      { str: "Engineer", width: 35, transform: [1, 0, 0, 1, 60, 50] },
      { str: "Experience", width: 45, transform: [1, 0, 0, 1, 10, 30] },
      { str: "Software", width: 42, transform: [1, 0, 0, 1, 10, 50] },
    ]);
    expect(lines).toEqual(["Software Engineer", "Experience"]);
  });

  it("organizes identity, skills, work, education, projects, and research without losing source text", () => {
    const raw = `Alex Example
Software Engineer
alex@example.com | +94 77 123 4567 | Colombo, Sri Lanka
github.com/alex-example
Professional Summary
Builds reliable software for public services.
Technical Skills
Languages TypeScript, Python, Java
Frontend React, Next.js
Education
Example University 2022 – 2026
Bachelor of Science in IT
Work Experience
Example Labs Feb 2025 – Aug 2025
Software Engineer Intern Colombo
• Built a typed API
with reliable tests.
Selected Projects
Example Platform Mar 2026 – May 2026
TypeScript, PostgreSQL
• Delivered a web application.
Research
Document Analysis Jan 2024 – May 2025
• Extracted evidence from documents.
References
Available on request`;
    const parsed = parseCvText(raw, source);
    expect(parsed.identity.name).toBe("Alex Example");
    expect(parsed.identity.email).toBe("alex@example.com");
    expect(parsed.identity.links).toEqual(["github.com/alex-example"]);
    expect(parsed.summary).toContain("reliable software");
    expect(cvSkillTerms(parsed)).toContain("TypeScript");
    expect(parsed.sections.map((section) => section.title)).toEqual([
      "Education",
      "Work experience",
      "Selected projects",
      "Research",
      "References",
    ]);
    expect(parsed.sections[1].entries[0].bullets).toEqual([
      "Built a typed API with reliable tests.",
    ]);
    expect(parsed.rawText).toBe(raw);
  });
});
