import type { ExperienceLevel, Job, Monitor } from "./types";
export function containsKeyword(text: string, keyword: string) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9_])${escaped}($|[^a-z0-9_])`, "i").test(text);
}
export function matchesLocation(location: string, target: string) {
  if (!target) return true;
  if (location.toLowerCase().includes(target.toLowerCase())) return true;
  return (
    target.toLowerCase() === "sri lanka" &&
    /\b(colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala)\b/i.test(
      location,
    )
  );
}

const experienceSignals: Record<ExperienceLevel, string[]> = {
  internship: [
    "intern",
    "internship",
    "trainee",
    "apprentice",
    "apprenticeship",
    "placement",
  ],
  entry: [
    "junior",
    "jr",
    "jr.",
    "associate",
    "graduate",
    "entry level",
    "entry-level",
    "level 1",
    "level i",
  ],
  mid: ["mid level", "mid-level", "intermediate", "level 2", "level ii"],
  senior: [
    "senior",
    "sr",
    "sr.",
    "lead",
    "principal",
    "staff",
    "manager",
    "architect",
    "head",
    "director",
    "level 3",
    "level iii",
    "level 4",
    "level iv",
    "level 5",
  ],
};

export function experienceExclusions(experience: ExperienceLevel) {
  const incompatible: ExperienceLevel[] =
    experience === "internship"
      ? ["senior"]
      : experience === "entry"
        ? ["internship", "mid", "senior"]
        : experience === "mid"
          ? ["internship", "entry", "senior"]
          : ["internship", "entry", "mid"];
  return [...new Set(incompatible.flatMap((level) => experienceSignals[level]))];
}

export function detectExperience(text: string): ExperienceLevel | null {
  // A senior marker wins over a lower-level word in compound titles such as
  // "Senior Associate Engineer". The remaining order favors the clearest
  // early-career label before mid-level wording.
  for (const level of ["senior", "internship", "entry", "mid"] as const) {
    if (experienceSignals[level].some((signal) => containsKeyword(text, signal)))
      return level;
  }
  return null;
}

export function matchesExperience(
  text: string,
  preference?: ExperienceLevel,
) {
  if (!preference) return true;
  const detected = detectExperience(text);
  // Many source titles omit seniority. Keep those discoverable, while
  // rejecting every title that explicitly declares an incompatible stage.
  return detected === null || detected === preference;
}

export function matchesMonitor(
  job: Pick<
    Job,
    "title" | "company" | "description" | "tags" | "location" | "remote"
  >,
  monitor: Monitor,
  experience?: ExperienceLevel,
) {
  if (!monitor.enabled || (monitor.remoteOnly && !job.remote)) return false;
  const haystack = `${job.title} ${job.tags.join(" ")}`.toLowerCase();
  if (!matchesLocation(job.location, monitor.location)) return false;
  if (!matchesExperience(haystack, experience)) return false;
  if (monitor.excludedKeywords.some((k) => containsKeyword(haystack, k)))
    return false;
  return monitor.keywords.some((k) => containsKeyword(haystack, k));
}
export function safeUrl(value: string): string {
  try {
    const url = new URL(value);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}
export function plainText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (original, value: string) => {
      const point = value.toLowerCase().startsWith("x")
        ? parseInt(value.slice(1), 16)
        : Number(value);
      return point > 0 && point <= 0x10ffff
        ? String.fromCodePoint(point)
        : original;
    })
    .trim();
}
export const techPattern =
  /\b(software|engineer|developer|frontend|front.end|backend|back.end|full.stack|devops|sre|data|machine learning|cyber|security|IT|QA|quality assurance|cloud|platform|technical|product designer|UX|UI|systems|network|architect)\b/i;
