import { z } from "zod";
const keywords = z.array(z.string().trim().min(1).max(60)).max(20);
const exclusions = z.array(z.string().trim().min(1).max(60)).max(64);
export const monitorSchema = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: keywords.min(1),
  excludedKeywords: exclusions.default([]),
  location: z.string().trim().max(120).default(""),
  remoteOnly: z.boolean().default(false),
  enabled: z.boolean().default(true),
});
const onboardingFields = {
  experience: z.enum(["internship", "entry", "mid", "senior", "other"]),
  roles: z.array(z.string().trim().min(2).max(60)).min(1).max(4),
  workModes: z.array(z.enum(["onsite", "hybrid", "remote"])).min(1).max(3),
};
export const onboardingSchema = z.object({
  ...onboardingFields,
  locations: z.array(z.string().trim().min(2).max(80)).min(1).max(6),
  monitors: z.array(monitorSchema).min(1).max(24),
});
export const ownerOnboardingSchema = z.object({
  ...onboardingFields,
  locations: z.array(z.string().trim().min(2).max(80)).min(1),
  monitors: z.array(monitorSchema).min(1),
});
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
