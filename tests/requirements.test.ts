import { describe, expect, it } from "vitest";
import {
  extractRequirementCandidates,
  requirementDescriptionHash,
  requirementText,
} from "../src/lib/intelligence/requirements";

describe("evidence-backed requirements", () => {
  it("extracts only exact spans and keeps AND/OR wording from the source", () => {
    const text = requirementText(
      "<p>Must have React and TypeScript.</p><p>Experience with Python or Go is preferred.</p><p>Company benefits are included.</p>",
    );
    const found = extractRequirementCandidates(text);
    expect(found).toHaveLength(2);
    expect(found.map((item) => item.groupKind)).toEqual(["and", "or"]);
    for (const item of found)
      expect(text.slice(item.startOffset, item.endOffset)).toBe(item.evidence);
    expect(found.every((item) => !item.evidence.includes("benefits"))).toBe(
      true,
    );
    expect(requirementDescriptionHash(text)).toBe(
      requirementDescriptionHash(text),
    );
  });
});
