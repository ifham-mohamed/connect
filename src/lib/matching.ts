import type { ExperienceLevel, Job, Monitor, WorkMode } from "./types";
export function normalizeMatchPhrase(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[-\u2010-\u2015]+/g, " ")
    .replace(/\bfull\s*stack\b/gi, "full stack")
    .replace(/\bfront\s*end\b/gi, "frontend")
    .replace(/\bback\s*end\b/gi, "backend")
    .replace(/\s+/g, " ")
    .trim();
}
export function containsKeyword(text: string, keyword: string) {
  const normalizedKeyword = normalizeMatchPhrase(keyword);
  if (!normalizedKeyword) return false;
  const escaped = normalizedKeyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9_])${escaped}($|[^a-z0-9_])`, "i").test(
    normalizeMatchPhrase(text),
  );
}
export function matchesLocation(location: string, target: string) {
  if (!target) return true;
  if (location.toLowerCase().includes(target.toLowerCase())) return true;
  return (
    target.toLowerCase() === "sri lanka" &&
    /\b(sri lanka|western province|central province|southern province|northern province|eastern province|north western province|north central province|uva province|sabaragamuwa province|colombo|kandy|galle|jaffna|gampaha|negombo|matara|kurunegala|anuradhapura|polonnaruwa|badulla|ratnapura|trincomalee|batticaloa|kalutara|hambantota|kilinochchi|mannar|mullaitivu|vavuniya|puttalam|matale|nuwara eliya|kegalle|monaragala|ampara)\b/i.test(
      location,
    )
  );
}

export const experienceSignals: Readonly<
  Record<ExperienceLevel, readonly string[]>
> = {
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
  other: [],
};

export function experienceExclusions(experience: ExperienceLevel) {
  const incompatible: ExperienceLevel[] =
    experience === "internship"
      ? ["entry", "mid", "senior"]
      : experience === "entry"
        ? ["internship", "mid", "senior"]
        : experience === "mid"
          ? ["internship", "entry", "senior"]
          : experience === "senior"
            ? ["internship", "entry", "mid"]
            : ["internship", "entry", "mid", "senior"];
  return [
    ...new Set(incompatible.flatMap((level) => experienceSignals[level])),
  ];
}

export function detectExperience(text: string): ExperienceLevel {
  // A senior marker wins over a lower-level word in compound titles such as
  // "Senior Associate Engineer". The remaining order favors the clearest
  // internship label before entry and mid-level wording.
  for (const level of ["senior", "internship"] as const) {
    if (
      experienceSignals[level].some((signal) => containsKeyword(text, signal))
    )
      return level;
  }
  const numberedLevel = detectNumberedLevel(text);
  if (numberedLevel) return numberedLevel;
  for (const level of ["entry", "mid"] as const) {
    if (
      experienceSignals[level].some((signal) => containsKeyword(text, signal))
    )
      return level;
  }
  return "other";
}

function detectNumberedLevel(text: string): ExperienceLevel | null {
  const role = "(?:engineer|developer|analyst|specialist|designer|consultant)";
  const marker = (number: string, roman: string) =>
    new RegExp(
      `(?:\\(\\s*(?:${number}|${roman})\\s*\\)|\\b(?:level|grade|l)\\s*[-:]?\\s*(?:${number}|${roman})\\b|\\b${role}\\s+(?:${number}|${roman})\\b)`,
      "i",
    ).test(text);
  if (marker("3", "iii")) return "senior";
  if (marker("2", "ii")) return "mid";
  if (marker("1", "i")) return "entry";
  return null;
}

export function matchesWorkModes(
  job: Pick<Job, "title" | "tags" | "location" | "remote">,
  modes?: WorkMode[],
) {
  if (!modes?.length) return true;
  return modes.includes(detectWorkMode(job));
}

export function detectWorkMode(
  job: Pick<Job, "title" | "tags" | "location" | "remote">,
): WorkMode {
  const text = `${job.title} ${job.tags.join(" ")} ${job.location}`;
  return job.remote ||
    containsKeyword(text, "remote") ||
    containsKeyword(text, "worldwide")
    ? "remote"
    : containsKeyword(text, "hybrid")
      ? "hybrid"
      : "onsite";
}

export function detectExperienceSignals(text: string) {
  return Object.fromEntries(
    Object.entries(experienceSignals).map(([level, signals]) => [
      level,
      signals.filter((signal) => containsKeyword(text, signal)),
    ]),
  ) as Record<ExperienceLevel, string[]>;
}

export function matchesExperience(text: string, preference?: ExperienceLevel) {
  if (!preference) return true;
  const detected = detectExperience(text);
  return (
    detected === preference ||
    (detected === "other" && ["entry", "mid", "senior"].includes(preference))
  );
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
  if (!matchesWorkModes(job, monitor.workModes)) return false;
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
