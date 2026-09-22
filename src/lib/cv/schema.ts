import { z } from "zod";

const short = z.string().trim().max(500);
export const cvProfileSchema = z.object({
  identity: z.object({
    name: short,
    headline: short,
    email: z.string().trim().max(320),
    phone: short,
    location: short,
    links: z.array(z.string().trim().max(1000)).max(30),
  }),
  summary: z.string().trim().max(10000),
  skills: z
    .array(
      z.object({
        category: short,
        items: z.array(short).max(100),
      }),
    )
    .max(40),
  sections: z
    .array(
      z.object({
        id: short,
        title: short,
        entries: z
          .array(
            z.object({
              heading: short,
              details: z.array(z.string().max(2000)).max(30),
              bullets: z.array(z.string().max(2000)).max(80),
            }),
          )
          .max(100),
      }),
    )
    .max(40),
  source: z.object({
    fileName: z.string().trim().max(255),
    pages: z.number().int().min(1).max(20),
    importedAt: z.string().datetime(),
  }),
  rawText: z.string().max(150000),
});

export const approvedCvSchema = z.object({
  approved: z.literal(true),
  baseRevision: z.number().int().min(0),
  profile: cvProfileSchema,
});
