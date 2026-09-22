import { z } from "zod";
const keywords = z.array(z.string().trim().min(1).max(60)).max(20);
const exclusions = z.array(z.string().trim().min(1).max(60)).max(64);
const workMode = z.enum(["onsite", "hybrid", "remote"]);
export const monitorSchema = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: keywords.min(1),
  excludedKeywords: exclusions.default([]),
  location: z.string().trim().max(120).default(""),
  remoteOnly: z.boolean().default(false),
  workModes: z.array(workMode).min(1).max(3).optional(),
  enabled: z.boolean().default(true),
});
const onboardingFields = {
  experience: z.enum(["internship", "entry", "mid", "senior", "other"]),
  roles: z.array(z.string().trim().min(2).max(60)).min(1).max(4),
  workModes: z.array(workMode).min(1).max(3),
  locationWorkModes: z.array(z.object({
    location: z.string().trim().min(2).max(80),
    workModes: z.array(workMode).min(1).max(3),
  })).optional(),
};
function validLocationModes(value: {
  locations: string[];
  locationWorkModes?: Array<{ location: string; workModes: string[] }>;
}) {
  if (!value.locationWorkModes) return true;
  const configured = new Set(value.locationWorkModes.map((item) => item.location));
  return configured.size === value.locations.length && value.locations.every((location) => configured.has(location)) && value.locationWorkModes.every((item) => item.location !== "Worldwide" || (item.workModes.length === 1 && item.workModes[0] === "remote"));
}
export const onboardingSchema = z.object({
  ...onboardingFields,
  locations: z.array(z.string().trim().min(2).max(80)).min(1).max(6),
  monitors: z.array(monitorSchema).min(1).max(24),
}).refine(validLocationModes, { message: "Choose valid work arrangements for every country.", path: ["locationWorkModes"] });
export const ownerOnboardingSchema = z.object({
  ...onboardingFields,
  locations: z.array(z.string().trim().min(2).max(80)).min(1),
  monitors: z.array(monitorSchema).min(1),
}).refine(validLocationModes, { message: "Choose valid work arrangements for every country.", path: ["locationWorkModes"] });
export const sourceSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    kind: z.enum([
      "itpro",
      "topjobs",
      "xpressjobs",
      "jobeka",
      "rooster",
      "neojobs",
      "jobster",
      "remotive",
      "arbeitnow",
      "greenhouse",
      "lever",
    ]),
    board: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{0,100}$/)
      .default(""),
  })
  .refine(
    (v) =>
      ![
        "topjobs",
        "xpressjobs",
        "jobeka",
        "greenhouse",
        "lever",
      ].includes(v.kind) ||
      v.board.length > 0,
    { message: "Enter the employer’s board identifier.", path: ["board"] },
  );
