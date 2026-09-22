import { describe, expect, it } from "vitest";
import { normalizeAdvertText } from "../src/lib/ocr/advert-text";

describe("advert OCR text", () => {
  it("cleans OCR spacing while preserving useful sections", () => {
    expect(
      normalizeAdvertText(
        "  FULL STACK DEVELOPER  \r\n\r\n\r\n Skills:   React   Next.js \n Experience: 2 years  ",
      ),
    ).toBe(
      "FULL STACK DEVELOPER\n\nSkills: React Next.js\nExperience: 2 years",
    );
  });

  it("bounds text stored in a private job record", () => {
    expect(normalizeAdvertText("a".repeat(40_000))).toHaveLength(30_000);
  });
});
