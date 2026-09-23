import { createHash } from "node:crypto";
import type { Questions, TypeSafeClient } from "@typesafe-ai/sdk";
import { z } from "zod";
import type { CvProfile } from "../cv/profile";
import { plainText } from "../matching";
import { buildDeterministicFit, CV_FIT_RULE_VERSION } from "./cv-fit";

export const CV_REVIEW_VERSION = "cv-fit-v4";
const verdictSchema = z.enum(["supported", "partial", "not_shown", "unclear"]);
const answerSchema = z.object({
  type: z.literal("choice"),
  choice: verdictSchema,
  confidence: z.number().min(0).max(1),
});
const skillSchema = z.object({
  name: z.string().min(1).max(120),
  importance: z.enum(["required", "preferred"]),
  status: z.enum(["matched", "related", "missing"]),
  cvEvidence: z.array(z.string().max(160)).max(20),
  jobEvidence: z.array(z.string().max(300)).max(5),
});
export const cvReviewResultSchema = z.object({
  version: z.literal(CV_REVIEW_VERSION),
  overallScore: z.number().int().min(0).max(100).nullable(),
  analysisCompleteness: z.number().int().min(0).max(100),
  recommendation: z.enum([
    "strong",
    "good",
    "stretch",
    "not_aligned",
    "insufficient",
  ]),
  matchedKeywords: z.array(z.string().min(1).max(120)).max(100),
  missingRequirements: z.array(z.string().min(1).max(300)).max(80),
  strengths: z.array(z.string().min(1).max(300)).max(12),
  blockingGaps: z.array(z.string().min(1).max(300)).max(100),
  role: z.object({
    jobFamily: z.string(),
    candidateFamilies: z.array(z.string()).max(20),
    candidateRoles: z.array(z.string().max(500)).max(30),
    match: z.enum(["exact", "compatible", "adjacent", "mismatch", "unclear"]),
  }),
  careerLevel: z.object({
    candidate: z.string(),
    job: z.string(),
    assessment: z.enum(["meets", "exceeds", "below", "unclear", "not_stated"]),
  }),
  education: z.object({
    assessment: z.enum(["meets", "partial", "not_shown", "not_stated"]),
    jobEvidence: z.array(z.string().max(300)).max(10),
    cvEvidence: z.array(z.string().max(500)).max(20),
  }),
  experience: z.object({
    totalMonths: z.number().int().min(0),
    relevantMonths: z.number().int().min(0),
    assessment: z.enum(["meets", "exceeds", "below", "unclear", "not_stated"]),
    requirement: z
      .object({
        minMonths: z.number().int().min(0),
        maxMonths: z.number().int().min(0).nullable(),
        evidence: z.string().max(300),
      })
      .nullable(),
    entries: z
      .array(
        z.object({
          title: z.string().max(500),
          section: z.string().max(120),
          startMonth: z.string().nullable(),
          endMonth: z.string().nullable(),
          months: z.number().int().min(0).nullable(),
          relevant: z.boolean(),
          evidence: z.string().max(500),
        }),
      )
      .max(100),
  }),
  skills: z.object({
    items: z.array(skillSchema).max(100),
    additionalCvSkills: z.array(z.string().max(120)).max(500),
  }),
  dimensions: z
    .array(
      z.object({
        key: z.enum(["role", "careerLevel", "skills", "experience"]),
        verdict: verdictSchema,
        confidence: z.number().min(0).max(1),
        jobEvidence: z.array(z.string().max(300)).max(20),
        cvEvidence: z.array(z.string().max(500)).max(500),
      }),
    )
    .length(4),
});
export type CvReviewResult = z.infer<typeof cvReviewResultSchema>;

type ReviewJob = {
  title: string;
  company: string;
  description: string;
  tags: string[];
  location: string;
};

function compact(text: string, limit = 300) {
  return text
    .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d ()-]{7,}\d)/g, "[phone removed]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}
function clean(items: string[], limit: number, size = 300) {
  return Array.from(
    new Set(
      items
        .map((item) => compact(item, size))
        .filter((item) => item.length > 2),
    ),
  ).slice(0, limit);
}
function hasOngoingRole(cv?: CvProfile) {
  return Boolean(
    cv?.sections
      .filter((section) =>
        /work experience|freelance|client/i.test(section.title),
      )
      .some((section) =>
        section.entries.some((entry) =>
          /\b(present|current|now)\b/i.test(
            [entry.heading, ...entry.details].join(" "),
          ),
        ),
      ),
  );
}

export function jobCvHash(
  job: ReviewJob,
  cv?: CvProfile,
  referenceDate = new Date(),
) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        reviewVersion: CV_REVIEW_VERSION,
        ruleVersion: CV_FIT_RULE_VERSION,
        title: job.title,
        company: job.company,
        description: plainText(job.description).slice(0, 12000),
        tags: job.tags,
        location: job.location,
        asOfMonth: hasOngoingRole(cv)
          ? referenceDate.toISOString().slice(0, 7)
          : null,
      }),
    )
    .digest("hex");
}

export function buildCvReviewEvidence(
  job: ReviewJob,
  cv: CvProfile,
  referenceDate = new Date(),
) {
  const fit = buildDeterministicFit(job, cv, referenceDate);
  const matched = fit.skills.skills
    .filter((item) => item.status === "matched")
    .map((item) => item.name);
  const missing = fit.skills.skills
    .filter(
      (item) => item.status === "missing" && item.importance === "required",
    )
    .map((item) => item.jobEvidence[0] || item.name);
  return {
    fit,
    role: {
      jobEvidence: clean([job.title], 4),
      cvEvidence: clean(fit.role.candidateRoles, 20, 500),
    },
    careerLevel: {
      jobEvidence: clean([job.title], 4),
      cvEvidence: clean(
        [cv.identity.headline, ...fit.role.candidateRoles],
        20,
        500,
      ),
    },
    skills: {
      jobEvidence: clean(
        fit.skills.skills.flatMap((item) => item.jobEvidence),
        20,
      ),
      cvEvidence: clean(
        cv.skills.flatMap((group) => group.items),
        100,
        160,
      ),
    },
    experience: {
      jobEvidence: clean(
        [fit.experience.requirement?.evidence || ""].filter(Boolean),
        10,
      ),
      cvEvidence: clean(
        fit.experience.entries.map((entry) => entry.evidence),
        30,
        500,
      ),
    },
    insights: {
      matchedKeywords: matched,
      missingRequirements: missing.slice(0, 80),
    },
  } as const;
}

function levelAssessment(candidate: string, job: string) {
  if (job === "other") return "not_stated" as const;
  if (candidate === "other") return "unclear" as const;
  const rank: Record<string, number> = {
    internship: 0,
    entry: 1,
    mid: 2,
    senior: 3,
  };
  if (rank[candidate] > rank[job]) return "exceeds" as const;
  if (rank[candidate] < rank[job]) return "below" as const;
  return "meets" as const;
}

function scoreReview(
  roleMatch: string,
  career: ReturnType<typeof levelAssessment>,
  skills: ReturnType<typeof buildDeterministicFit>["skills"]["skills"],
  experience: ReturnType<typeof buildDeterministicFit>["experience"],
  education: ReturnType<typeof buildDeterministicFit>["education"],
) {
  const components: { weight: number; value: number; evaluable: boolean }[] =
    [];
  components.push({
    weight: 20,
    value:
      roleMatch === "exact" || roleMatch === "compatible"
        ? 1
        : roleMatch === "adjacent"
          ? 0.5
          : 0,
    evaluable: roleMatch !== "unclear",
  });
  components.push({
    weight: 15,
    value:
      career === "meets" || career === "exceeds"
        ? 1
        : career === "below"
          ? 0
          : 0.5,
    evaluable: career !== "not_stated" && career !== "unclear",
  });
  const required = skills.filter((item) => item.importance === "required");
  const preferred = skills.filter((item) => item.importance === "preferred");
  const coverage = (items: typeof skills) =>
    items.length
      ? items.reduce(
          (sum, item) =>
            sum +
            (item.status === "matched"
              ? 1
              : item.status === "related"
                ? 0.5
                : 0),
          0,
        ) / items.length
      : 0;
  components.push({
    weight: 25,
    value: coverage(required),
    evaluable: required.length > 0,
  });
  components.push({
    weight: 5,
    value: coverage(preferred),
    evaluable: preferred.length > 0,
  });
  components.push({
    weight: 25,
    value:
      experience.assessment === "meets" || experience.assessment === "exceeds"
        ? 1
        : experience.assessment === "below"
          ? 0
          : 0.5,
    evaluable: experience.assessment !== "not_stated",
  });
  components.push({
    weight: 10,
    value:
      education.assessment === "meets"
        ? 1
        : education.assessment === "partial"
          ? 0.5
          : 0,
    evaluable: education.assessment !== "not_stated",
  });
  const evaluable = components.filter((item) => item.evaluable);
  const denominator = evaluable.reduce((sum, item) => sum + item.weight, 0);
  const completeness = Math.round(denominator);
  const score =
    completeness < 50 || !denominator
      ? null
      : Math.round(
          (evaluable.reduce((sum, item) => sum + item.weight * item.value, 0) /
            denominator) *
            100,
        );
  return { score, completeness };
}

export async function reviewJobAgainstCv(
  client: TypeSafeClient,
  job: ReviewJob,
  cv: CvProfile,
) {
  const evidence = buildCvReviewEvidence(job, cv);
  const questions: Questions = {};
  for (const key of ["role", "careerLevel", "skills", "experience"] as const) {
    questions[key] = {
      type: "choice",
      instructions: `Assess ${key} alignment using only the supplied normalized facts and exact evidence. Equivalent role wording may be supported, but do not invent skills, dates, credentials, seniority, or employment. Not shown means the supplied CV does not demonstrate the requirement.`,
      criteria: {
        supported:
          "The candidate evidence explicitly supports or exceeds this part of the job",
        partial:
          "Related evidence exists, but an explicit part of the requirement is missing",
        not_shown:
          "The supplied CV evidence does not demonstrate this part of the job",
        unclear:
          "The job requirement or supplied evidence is too ambiguous to decide",
      },
    };
  }
  const response = await client.systemOne({
    state: {
      job: {
        title: compact(job.title, 240),
        company: compact(job.company, 160),
      },
      normalizedFacts: JSON.parse(
        JSON.stringify(evidence.fit, (_key, value) =>
          typeof value === "string" ? compact(value, 500) : value,
        ),
      ),
      exactEvidence: {
        role: evidence.role,
        careerLevel: evidence.careerLevel,
        skills: evidence.skills,
        experience: evidence.experience,
      },
    },
    questions,
  });
  const answers = z.record(z.string(), answerSchema).parse(response.answers);
  const career = levelAssessment(
    evidence.fit.careerLevel.candidate,
    evidence.fit.careerLevel.job,
  );
  const dimensions = (
    ["role", "careerLevel", "skills", "experience"] as const
  ).map((key) => {
    const answer = answers[key];
    if (!answer) throw new Error(`Missing JEV answer for ${key}.`);
    const snippets = evidence[key];
    let verdict = answer.choice;
    if (
      key === "role" &&
      ["exact", "compatible"].includes(evidence.fit.role.match)
    )
      verdict = "supported";
    if (key === "careerLevel" && (career === "meets" || career === "exceeds"))
      verdict = "supported";
    if (key === "careerLevel" && career === "below") verdict = "not_shown";
    if (
      key === "experience" &&
      ["meets", "exceeds"].includes(evidence.fit.experience.assessment)
    )
      verdict = "supported";
    if (key === "experience" && evidence.fit.experience.assessment === "below")
      verdict = "not_shown";
    if (
      !snippets.jobEvidence.length &&
      (key === "experience" || key === "skills")
    )
      verdict = "unclear";
    return {
      key,
      verdict,
      confidence: answer.confidence,
      jobEvidence: [...snippets.jobEvidence],
      cvEvidence: [...snippets.cvEvidence],
    };
  });
  const scored = scoreReview(
    evidence.fit.role.match,
    career,
    evidence.fit.skills.skills,
    evidence.fit.experience,
    evidence.fit.education,
  );
  const blockers: string[] = [];
  if (career === "below")
    blockers.push(
      `The listing asks for a ${evidence.fit.careerLevel.job}-level candidate, while the CV explicitly shows ${evidence.fit.careerLevel.candidate}-level direction.`,
    );
  if (
    evidence.fit.experience.assessment === "below" &&
    evidence.fit.experience.requirement
  )
    blockers.push(
      `The listing asks for at least ${Math.round(evidence.fit.experience.requirement.minMonths / 12)} years; ${evidence.fit.experience.relevantMonths} relevant months are demonstrated.`,
    );
  blockers.push(
    ...evidence.fit.skills.skills
      .filter(
        (item) => item.importance === "required" && item.status === "missing",
      )
      .map(
        (item) =>
          `${item.name} is requested but not demonstrated in the saved CV.`,
      ),
  );
  if (evidence.fit.education.assessment === "not_shown")
    blockers.push(
      "The listing states a formal qualification that is not demonstrated in the approved CV.",
    );
  let recommendation: CvReviewResult["recommendation"] = "insufficient";
  if (scored.score !== null) {
    recommendation =
      scored.score >= 80
        ? "strong"
        : scored.score >= 65
          ? "good"
          : scored.score >= 40
            ? "stretch"
            : "not_aligned";
    if (
      blockers.length &&
      (recommendation === "strong" || recommendation === "good")
    )
      recommendation = "stretch";
  }
  const strengths = [
    ...(["exact", "compatible"].includes(evidence.fit.role.match)
      ? ["Your role direction aligns with this opportunity."]
      : []),
    ...(evidence.fit.experience.assessment === "exceeds"
      ? ["Your relevant experience exceeds the stated range."]
      : evidence.fit.experience.assessment === "meets"
        ? ["Your dated relevant experience meets the stated requirement."]
        : []),
    ...(evidence.fit.education.assessment === "meets"
      ? ["Your saved education evidence supports the stated qualification."]
      : []),
    ...evidence.fit.skills.skills
      .filter((item) => item.status === "matched")
      .slice(0, 8)
      .map((item) => `${item.name} is demonstrated in your CV.`),
  ];
  return {
    model: response.model,
    usage: response.usage,
    result: cvReviewResultSchema.parse({
      version: CV_REVIEW_VERSION,
      overallScore: scored.score,
      analysisCompleteness: scored.completeness,
      recommendation,
      matchedKeywords: evidence.insights.matchedKeywords,
      missingRequirements: evidence.insights.missingRequirements,
      strengths,
      blockingGaps: blockers,
      role: evidence.fit.role,
      careerLevel: { ...evidence.fit.careerLevel, assessment: career },
      education: evidence.fit.education,
      experience: evidence.fit.experience,
      skills: {
        items: evidence.fit.skills.skills,
        additionalCvSkills: evidence.fit.skills.additionalCvSkills,
      },
      dimensions,
    }),
  };
}
