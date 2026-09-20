import { z } from "zod";
const keywords = z.array(z.string().trim().min(1).max(60)).max(20);
export const monitorSchema = z.object({
  name: z.string().trim().min(1).max(80),
  keywords: keywords.min(1),
  excludedKeywords: keywords.default([]),
  location: z.string().trim().max(120).default(""),
  remoteOnly: z.boolean().default(false),
  enabled: z.boolean().default(true),
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
      "devjobs",
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
        "devjobs",
        "greenhouse",
        "lever",
      ].includes(v.kind) ||
      v.board.length > 0,
    { message: "Enter the employer’s board identifier.", path: ["board"] },
  );
