import { createHash } from "node:crypto";
import type { Questions, TypeSafeClient } from "@typesafe-ai/sdk";
import { z } from "zod";
import type { CvProfile } from "../cv/profile";
import { containsKeyword } from "../matching";
import { extractRequirementCandidates, requirementText } from "./requirements";

export const CV_REVIEW_VERSION = "cv-fit-v3";
const verdictSchema = z.enum(["supported", "partial", "not_shown", "unclear"]);
const answerSchema = z.object({
  type: z.literal("choice"),
  choice: verdictSchema,
  confidence: z.number().min(0).max(1),
});
export const cvReviewResultSchema = z.object({
  version: z.literal(CV_REVIEW_VERSION),
  overallScore: z.number().int().min(0).max(100),
  matchedKeywords: z.array(z.string().min(1).max(120)).max(12),
  missingRequirements: z.array(z.string().min(1).max(300)).max(6),
  dimensions: z
    .array(
      z.object({
        key: z.enum(["role", "skills", "experience"]),
        verdict: verdictSchema,
        confidence: z.number().min(0).max(1),
        jobEvidence: z.array(z.string().max(300)).max(6),
        cvEvidence: z.array(z.string().max(300)).max(8),
      }),
    )
    .length(3),
});
export type CvReviewResult = z.infer<typeof cvReviewResultSchema>;
type ReviewJob = {
  title: string;
  company: string;
  description: string;
  tags: string[];
  location: string;
};
const stopWords = new Set([
  "and",
  "the",
  "for",
  "with",
  "from",
  "your",
  "our",
  "job",
  "role",
  "senior",
  "junior",
  "experience",
  "required",
  "skills",
  "using",
  "work",
  "team",
]);

function terms(text: string) {
  return Array.from(
    new Set(
      (text.toLowerCase().match(/[a-z][a-z0-9+#.-]{2,}/g) || []).filter(
        (word) => !stopWords.has(word),
      ),
    ),
  );
}
function overlap(left: string, right: string) {
  const rightTerms = new Set(terms(right));
  return terms(left).filter((word) => rightTerms.has(word)).length;
}
function compact(text: string, limit = 300) {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, "[phone removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function cleanEvidence(items: string[], limit: number) {
  return Array.from(
    new Set(
      items
        .map((item) => compact(item))
        .filter((item) => item.length > 2 && !/^[-–—•]+$/.test(item)),
    ),
  ).slice(0, limit);
}

function evidenceCoverage(
  dimensions: {
    key: "role" | "skills" | "experience";
    verdict: z.infer<typeof verdictSchema>;
    confidence: number;
  }[],
) {
  const weights = { role: 0.3, skills: 0.4, experience: 0.3 } as const;
  const values = {
    supported: 100,
    partial: 62,
    not_shown: 18,
    unclear: 42,
  } as const;
  return Math.round(
    dimensions.reduce(
      (total, item) =>
        total +
        values[item.verdict] *
          weights[item.key] *
          (0.85 + Math.min(1, Math.max(0, item.confidence)) * 0.15),
      0,
    ),
  );
}

export function jobCvHash(job: ReviewJob) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        reviewVersion: CV_REVIEW_VERSION,
        title: job.title,
        company: job.company,
        description: requirementText(job.description),
        tags: job.tags,
        location: job.location,
      }),
    )
    .digest("hex");
}

export function buildCvReviewEvidence(job: ReviewJob, cv: CvProfile) {
  const jobText = requirementText(job.description);
  const requirements = cleanEvidence(
    extractRequirementCandidates(jobText, 8).map((item) => item.evidence),
    8,
  );
  const jobEvidence = cleanEvidence([compact(job.title), ...requirements], 7);
  const titleHasSkill =
    /\b(?:React|Angular|Vue|TypeScript|JavaScript|Python|Java|C\+\+|C#|\.NET|Node\.js|SQL|AWS|Azure|Docker|Kubernetes)\b/i.test(
      job.title,
    );
  const skills = cv.skills
    .flatMap((group) => group.items)
    .map((item) => compact(item, 120));
  const matchedSkills = cleanEvidence(
    Array.from(
      new Set(
        skills.filter(
          (skill) =>
            skill.length >= 2 &&
            containsKeyword(
              `${job.title} ${job.tags.join(" ")} ${jobText}`,
              skill,
            ),
        ),
      ),
    ),
    12,
  );
  const entries = cv.sections
    .filter((section) =>
      /experience|project|research|education|certification/i.test(
        section.title,
      ),
    )
    .flatMap((section) =>
      section.entries.map((entry) =>
        compact(
          [
            entry.heading,
            ...entry.details.slice(0, 2),
            ...entry.bullets.slice(0, 2),
          ].join(" · "),
        ),
      ),
    )
    .filter(Boolean);
  const ranked = entries
    .map((entry) => ({
      entry,
      score: overlap(entry, `${job.title} ${jobText.slice(0, 1400)}`),
    }))
    .sort((a, b) => b.score - a.score);
  const relevantEntries = ranked
    .filter((item) => item.score > 0)
    .slice(0, 5)
    .map((item) => item.entry);
  const roleEvidence = cleanEvidence(
    [
      compact(cv.identity.headline),
      ...ranked
        .filter((item) => item.score > 0)
        .slice(0, 3)
        .map((item) => item.entry),
    ],
    4,
  );
  const cvText = cleanEvidence(
    [cv.identity.headline, ...skills, ...entries],
    skills.length + entries.length + 1,
  ).join(" ");
  const missingRequirements = requirements
    .filter((requirement) => overlap(requirement, cvText) === 0)
    .slice(0, 6);
  return {
    role: {
      jobEvidence: jobEvidence.slice(0, 2),
      cvEvidence: roleEvidence.slice(0, 4),
    },
    skills: {
      jobEvidence: [
        ...(titleHasSkill ? [compact(job.title)] : []),
        ...requirements,
      ].slice(0, 6),
      cvEvidence: matchedSkills,
    },
    experience: {
      jobEvidence: requirements,
      cvEvidence: relevantEntries,
    },
    insights: {
      matchedKeywords: matchedSkills,
      missingRequirements,
    },
  } as const;
}

export async function reviewJobAgainstCv(
  client: TypeSafeClient,
  job: ReviewJob,
  cv: CvProfile,
) {
  const evidence = buildCvReviewEvidence(job, cv);
  const questions: Questions = {};
  for (const key of ["role", "skills", "experience"] as const) {
    questions[key] = {
      type: "choice",
      instructions: `Assess ${key} alignment using only the supplied job and candidate evidence. "Not shown" means this CV excerpt does not show evidence, not that the person lacks the ability. Do not infer credentials or employment history.`,
      criteria: {
        supported:
          "The candidate evidence explicitly supports the job evidence for this dimension",
        partial:
          "Some relevant evidence exists, but the requirement is only partly supported",
        not_shown:
          "The supplied CV evidence does not show support for this dimension",
        unclear: "The job evidence or comparison is too ambiguous to decide",
      },
    };
  }
  const response = await client.systemOne({
    state: {
      job: {
        title: compact(job.title, 240),
        company: compact(job.company, 160),
      },
      evidence,
    },
    questions,
  });
  const answers = z.record(z.string(), answerSchema).parse(response.answers);
  const dimensions = (["role", "skills", "experience"] as const).map((key) => {
    const answer = answers[key];
    if (!answer) throw new Error(`Missing JEV answer for ${key}.`);
    const snippets = evidence[key];
    return {
      key,
      verdict:
        snippets.jobEvidence.length === 0
          ? ("unclear" as const)
          : snippets.cvEvidence.length === 0 && answer.choice !== "unclear"
            ? ("not_shown" as const)
            : answer.choice,
      confidence: answer.confidence,
      jobEvidence: cleanEvidence([...snippets.jobEvidence], 6),
      cvEvidence: cleanEvidence([...snippets.cvEvidence], 8),
    };
  });
  return {
    model: response.model,
    usage: response.usage,
    result: cvReviewResultSchema.parse({
      version: CV_REVIEW_VERSION,
      overallScore: evidenceCoverage(dimensions),
      matchedKeywords: evidence.insights.matchedKeywords,
      missingRequirements: evidence.insights.missingRequirements,
      dimensions,
    }),
  };
}
