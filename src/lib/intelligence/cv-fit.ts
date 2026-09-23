import type { CvProfile } from "../cv/profile";
import { containsKeyword, detectExperience, plainText } from "../matching";

export const CV_FIT_RULE_VERSION = "cv-fit-rules-2026-09-23.1";

export type RoleFamily =
  | "software"
  | "full_stack"
  | "frontend"
  | "backend"
  | "mobile"
  | "qa"
  | "devops"
  | "data"
  | "security"
  | "design"
  | "product"
  | "support"
  | "other";
export type FitLevel = "internship" | "entry" | "mid" | "senior" | "other";

export type ExperienceEntry = {
  title: string;
  section: string;
  startMonth: string | null;
  endMonth: string | null;
  months: number | null;
  relevant: boolean;
  evidence: string;
};

export type SkillFit = {
  name: string;
  importance: "required" | "preferred";
  status: "matched" | "related" | "missing";
  cvEvidence: string[];
  jobEvidence: string[];
};

const MONTHS: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
};

const SKILLS: Record<string, string[]> = {
  ".NET": [".net", "dotnet", "asp.net", "asp net"],
  "C#": ["c#", "c sharp"],
  TypeScript: ["typescript", "type script"],
  JavaScript: ["javascript", "java script", "ecmascript"],
  Java: ["java"],
  Python: ["python"],
  PHP: ["php"],
  React: ["react", "react.js", "reactjs"],
  "React Native": ["react native", "react-native"],
  "Next.js": ["next.js", "nextjs", "next js"],
  Angular: ["angular", "angular.js", "angularjs"],
  Vue: ["vue", "vue.js", "vuejs"],
  "Node.js": ["node.js", "nodejs", "node js"],
  Express: ["express", "express.js", "expressjs"],
  Laravel: ["laravel"],
  FastAPI: ["fastapi", "fast api"],
  Spring: ["spring", "spring boot", "springboot"],
  SQL: ["sql"],
  PostgreSQL: ["postgresql", "postgres", "postgre sql"],
  MySQL: ["mysql", "my sql"],
  MongoDB: ["mongodb", "mongo db"],
  Prisma: ["prisma"],
  AWS: ["aws", "amazon web services"],
  Azure: ["azure", "microsoft azure"],
  GCP: ["gcp", "google cloud", "google cloud platform"],
  Docker: ["docker", "containerization", "containerisation"],
  Kubernetes: ["kubernetes", "k8s"],
  Terraform: ["terraform", "infrastructure as code", "iac"],
  Git: ["git", "github", "gitlab", "bitbucket"],
  "CI/CD": ["ci/cd", "continuous integration", "continuous delivery"],
  REST: ["rest", "rest api", "restful"],
  GraphQL: ["graphql", "graph ql"],
  HTML: ["html", "html5"],
  CSS: ["css", "css3"],
  Tailwind: ["tailwind", "tailwind css"],
  Selenium: ["selenium", "webdriver", "web driver"],
  Playwright: ["playwright"],
  Cypress: ["cypress"],
  Agile: ["agile", "scrum", "agile/scrum", "agile scrum"],
  Go: ["golang", "go language"],
  Ruby: ["ruby"],
  Rails: ["ruby on rails", "rails"],
  Kotlin: ["kotlin"],
  Swift: ["swift"],
  Flutter: ["flutter"],
  Dart: ["dart"],
  "C++": ["c++", "cpp"],
  C: ["c language"],
  Redis: ["redis"],
  Kafka: ["kafka", "apache kafka"],
  RabbitMQ: ["rabbitmq", "rabbit mq"],
  DynamoDB: ["dynamodb", "dynamo db"],
  Firebase: ["firebase"],
  Oracle: ["oracle database", "oracle db"],
  Jest: ["jest"],
  Vitest: ["vitest"],
  JUnit: ["junit"],
  PHPUnit: ["phpunit"],
  Maven: ["maven"],
  Gradle: ["gradle"],
  Linux: ["linux"],
  Nginx: ["nginx"],
  GitHub: ["github"],
  GitLab: ["gitlab"],
  Jenkins: ["jenkins"],
  "Machine Learning": ["machine learning", "ml"],
  "Artificial Intelligence": ["artificial intelligence", "ai"],
  Figma: ["figma"],
  Jira: ["jira"],
};

const RELATED: Record<string, string[]> = {
  ".NET": ["C#"],
  "C#": [".NET"],
  JavaScript: ["TypeScript"],
  TypeScript: ["JavaScript"],
  SQL: ["PostgreSQL", "MySQL"],
  PostgreSQL: ["SQL"],
  MySQL: ["SQL"],
  AWS: ["GCP", "Azure"],
  GCP: ["AWS", "Azure"],
  Azure: ["AWS", "GCP"],
};

function normalize(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function aliasesFor(value: string) {
  const direct = Object.entries(SKILLS).find(
    ([canonical, aliases]) =>
      normalize(canonical) === normalize(value) ||
      aliases.some((alias) => normalize(alias) === normalize(value)),
  );
  return direct
    ? { canonical: direct[0], aliases: direct[1] }
    : { canonical: value, aliases: [value] };
}

function mentions(text: string, values: string[]) {
  return values.some((value) => containsKeyword(text, value));
}

function evidenceSentences(text: string) {
  return (
    plainText(text)
      .replace(/\.NET/gi, "§NET")
      .replace(/Node\.js/gi, "Node§js")
      .replace(/Next\.js/gi, "Next§js")
      .replace(/React\.js/gi, "React§js")
      .match(/[^\n.!?]+[.!?]?/g) || []
  ).map((sentence) => sentence.replace(/§/g, "."));
}

export function detectRoleFamily(text: string): RoleFamily {
  const value = normalize(text);
  if (/\b(full stack|fullstack)\b/.test(value)) return "full_stack";
  if (/\b(frontend|front end|ui developer|react developer)\b/.test(value))
    return "frontend";
  if (/\b(backend|back end|api developer)\b/.test(value)) return "backend";
  if (/\b(mobile|android|ios|flutter|react native)\b/.test(value))
    return "mobile";
  if (/\b(qa|quality assurance|test automation|sdet|tester)\b/.test(value))
    return "qa";
  if (
    /\b(devops|site reliability|sre|cloud engineer|platform engineer)\b/.test(
      value,
    )
  )
    return "devops";
  if (
    /\b(data scientist|data engineer|machine learning|ml engineer|ai engineer|analyst)\b/.test(
      value,
    )
  )
    return "data";
  if (/\b(cyber|security engineer|security analyst|soc analyst)\b/.test(value))
    return "security";
  if (/\b(ux|ui designer|product designer)\b/.test(value)) return "design";
  if (/\b(product manager|product owner)\b/.test(value)) return "product";
  if (/\b(support|help desk|service desk)\b/.test(value)) return "support";
  if (/\b(software|developer|engineer|programmer|application)\b/.test(value))
    return "software";
  return "other";
}

export function roleCompatibility(candidate: RoleFamily, job: RoleFamily) {
  if (candidate === "other" || job === "other") return "unclear" as const;
  if (candidate === job) return "exact" as const;
  const software = new Set<RoleFamily>([
    "software",
    "full_stack",
    "frontend",
    "backend",
    "mobile",
  ]);
  if (software.has(candidate) && software.has(job)) {
    if (candidate === "software" || job === "software")
      return "compatible" as const;
    if (
      candidate === "full_stack" ||
      job === "full_stack" ||
      (candidate === "frontend" && job === "backend") ||
      (candidate === "backend" && job === "frontend")
    )
      return "adjacent" as const;
  }
  return "mismatch" as const;
}

function monthIndex(year: number, month: number) {
  return year * 12 + month;
}
function monthLabel(index: number) {
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

function parseDateToken(token: string, end: boolean) {
  const trimmed = token.trim();
  if (/^(present|current|now)$/i.test(trimmed)) return null;
  const monthYear = trimmed.match(/^([A-Za-z]+)\s+(20\d{2}|19\d{2})$/);
  if (monthYear) {
    const month = MONTHS[monthYear[1].toLowerCase()];
    if (month !== undefined) return monthIndex(Number(monthYear[2]), month);
  }
  const year = trimmed.match(/^(20\d{2}|19\d{2})$/);
  return year ? monthIndex(Number(year[1]), end ? 11 : 0) : undefined;
}

export function parseDateRange(text: string, referenceDate = new Date()) {
  const token = "(?:[A-Za-z]+\\s+)?(?:19|20)\\d{2}";
  const match = text.match(
    new RegExp(
      `(${token})\\s*(?:–|—|-)\\s*(${token}|Present|Current|Now)`,
      "i",
    ),
  );
  if (!match) return null;
  const start = parseDateToken(match[1], false);
  const openEnded = /^(present|current|now)$/i.test(match[2].trim());
  const reference = monthIndex(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
  );
  const parsedEnd = openEnded ? reference : parseDateToken(match[2], true);
  if (start == null || parsedEnd == null || start > reference) return null;
  const end = Math.min(parsedEnd, reference);
  if (end < start) return null;
  return { start, end, openEnded };
}

function mergedMonths(ranges: { start: number; end: number }[]) {
  if (!ranges.length) return 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end + 1)
      previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged.reduce((sum, range) => sum + range.end - range.start + 1, 0);
}

function cvRoles(cv: CvProfile) {
  const roles = [cv.identity.headline];
  for (const section of cv.sections.filter((item) =>
    /work experience|freelance|client/i.test(item.title),
  ))
    for (const entry of section.entries)
      roles.push(...entry.details, entry.heading);
  return roles.filter((item) =>
    /engineer|developer|analyst|designer|manager|intern|devops|qa|architect/i.test(
      item,
    ),
  );
}

export function extractExperienceRequirement(text: string) {
  const sentences = evidenceSentences(text);
  for (const sentence of sentences) {
    if (!/experience|experienced|background|track record/i.test(sentence))
      continue;
    const range = sentence.match(
      /(?:minimum\s+of\s+|minimum\s+|at\s+least\s+)?(\d{1,2})\s*(?:-|–|—|to)\s*(\d{1,2})\s*(?:\+\s*)?(?:years?|yrs?)/i,
    );
    if (range)
      return {
        minMonths: Number(range[1]) * 12,
        maxMonths: Number(range[2]) * 12,
        evidence: sentence.trim().slice(0, 300),
      };
    const minimum = sentence.match(
      /(?:minimum\s+of\s+|minimum\s+|at\s+least\s+)?(\d{1,2})\s*(\+)?\s*(?:years?|yrs?)/i,
    );
    if (minimum)
      return {
        minMonths: Number(minimum[1]) * 12,
        maxMonths:
          minimum[2] || /minimum|at least/i.test(sentence)
            ? null
            : Number(minimum[1]) * 12,
        evidence: sentence.trim().slice(0, 300),
      };
  }
  return null;
}

export function buildExperienceProfile(
  cv: CvProfile,
  jobText: string,
  jobFamily: RoleFamily,
  jobSkills: string[],
  referenceDate = new Date(),
) {
  const entries: ExperienceEntry[] = [];
  const ranges: { start: number; end: number; relevant: boolean }[] = [];
  let hasOpenEndedRole = false;
  for (const section of cv.sections.filter((item) =>
    /work experience|freelance|client/i.test(item.title),
  )) {
    for (const entry of section.entries) {
      const evidence = [entry.heading, ...entry.details, ...entry.bullets].join(
        " · ",
      );
      const range = parseDateRange(evidence, referenceDate);
      const compatible = roleCompatibility(
        detectRoleFamily(evidence),
        jobFamily,
      );
      const matchingSkills = jobSkills.filter((skill) =>
        mentions(evidence, aliasesFor(skill).aliases),
      ).length;
      const relevant =
        ["exact", "compatible", "adjacent"].includes(compatible) ||
        matchingSkills >= 2;
      if (range) {
        ranges.push({ start: range.start, end: range.end, relevant });
        hasOpenEndedRole ||= range.openEnded;
      }
      entries.push({
        title: entry.details[0] || entry.heading,
        section: section.title,
        startMonth: range ? monthLabel(range.start) : null,
        endMonth: range ? monthLabel(range.end) : null,
        months: range ? range.end - range.start + 1 : null,
        relevant,
        evidence: evidence.replace(/\s+/g, " ").trim().slice(0, 500),
      });
    }
  }
  const requirement = extractExperienceRequirement(jobText);
  const totalMonths = mergedMonths(ranges);
  const relevantMonths = mergedMonths(ranges.filter((range) => range.relevant));
  const assessment = !requirement
    ? "not_stated"
    : relevantMonths < requirement.minMonths
      ? "below"
      : requirement.maxMonths !== null && relevantMonths > requirement.maxMonths
        ? "exceeds"
        : "meets";
  return {
    entries,
    totalMonths,
    relevantMonths,
    requirement,
    assessment,
    hasOpenEndedRole,
  } as const;
}

function evidenceSentence(text: string, values: string[]) {
  const sentences = evidenceSentences(text);
  return (
    sentences
      .find((sentence) => mentions(sentence, values))
      ?.trim()
      .slice(0, 300) || ""
  );
}

function compareEducation(jobText: string, cv: CvProfile) {
  const sentence = evidenceSentences(jobText).find((item) =>
    /\b(bachelor|master|degree|diploma|bsc|msc|computer science|software engineering|information technology)\b/i.test(
      item,
    ),
  );
  if (!sentence)
    return {
      assessment: "not_stated" as const,
      jobEvidence: [] as string[],
      cvEvidence: [] as string[],
    };
  const cvEvidence = cv.sections
    .filter((section) =>
      /education|qualification|certification/i.test(section.title),
    )
    .flatMap((section) =>
      section.entries.map((entry) =>
        [entry.heading, ...entry.details].join(" · "),
      ),
    )
    .filter(Boolean);
  const jobDegree = /\b(master|msc)\b/i.test(sentence)
    ? "master"
    : /\b(bachelor|bsc|degree)\b/i.test(sentence)
      ? "bachelor"
      : "qualification";
  const cvText = cvEvidence.join(" ");
  const hasDegree =
    jobDegree === "master"
      ? /\b(master|msc)\b/i.test(cvText)
      : jobDegree === "bachelor"
        ? /\b(bachelor|bsc|degree|master|msc)\b/i.test(cvText)
        : cvEvidence.length > 0;
  const fieldRequested =
    /computer science|software engineering|information technology|\bIT\b/i.test(
      sentence,
    );
  const fieldShown =
    /computer science|software engineering|information technology|\bIT\b/i.test(
      cvText,
    );
  return {
    assessment:
      hasDegree && (!fieldRequested || fieldShown)
        ? ("meets" as const)
        : cvEvidence.length
          ? ("partial" as const)
          : ("not_shown" as const),
    jobEvidence: [sentence.trim().slice(0, 300)],
    cvEvidence: cvEvidence.map((item) => item.slice(0, 500)),
  };
}

export function compareSkills(jobText: string, cv: CvProfile) {
  const fullJobText = plainText(jobText);
  const cvItems = cv.skills.flatMap((group) => group.items).filter(Boolean);
  const cvCanonical = new Map<string, string[]>();
  for (const item of cvItems) {
    const canonical = aliasesFor(item).canonical;
    cvCanonical.set(canonical, [...(cvCanonical.get(canonical) || []), item]);
  }
  const found = new Map<string, string[]>();
  for (const [canonical, aliases] of Object.entries(SKILLS))
    if (mentions(fullJobText, aliases)) found.set(canonical, aliases);
  for (const item of cvItems) {
    const skill = aliasesFor(item);
    if (mentions(fullJobText, skill.aliases))
      found.set(skill.canonical, skill.aliases);
  }
  const skills: SkillFit[] = Array.from(found.entries()).map(
    ([name, aliases]) => {
      const sentence = evidenceSentence(fullJobText, aliases);
      const direct = cvCanonical.get(name) || [];
      const related = (RELATED[name] || []).flatMap(
        (item) => cvCanonical.get(item) || [],
      );
      return {
        name,
        importance: /preferred|nice to have|bonus|advantage|plus/i.test(
          sentence,
        )
          ? "preferred"
          : "required",
        status: direct.length
          ? "matched"
          : related.length
            ? "related"
            : "missing",
        cvEvidence: direct.length ? direct : related,
        jobEvidence: sentence ? [sentence] : [name],
      };
    },
  );
  const connected = new Set(
    skills.flatMap((item) =>
      item.cvEvidence.map((skill) => aliasesFor(skill).canonical),
    ),
  );
  return {
    skills,
    additionalCvSkills: cvItems.filter(
      (item) => !connected.has(aliasesFor(item).canonical),
    ),
  };
}

export function buildDeterministicFit(
  job: { title: string; description: string; tags: string[] },
  cv: CvProfile,
  referenceDate = new Date(),
) {
  const jobText = `${job.title}\n${job.tags.join(" ")}\n${plainText(job.description)}`;
  const skills = compareSkills(jobText, cv);
  const jobFamily = detectRoleFamily(job.title);
  const candidateRoles = cvRoles(cv);
  const candidateFamilies = Array.from(
    new Set(
      candidateRoles
        .map(detectRoleFamily)
        .filter((family) => family !== "other"),
    ),
  );
  let roleMatch: ReturnType<typeof roleCompatibility> = "unclear";
  const order = {
    exact: 4,
    compatible: 3,
    adjacent: 2,
    unclear: 1,
    mismatch: 0,
  } as const;
  for (const family of candidateFamilies) {
    const current = roleCompatibility(family, jobFamily);
    if (order[current] > order[roleMatch]) roleMatch = current;
  }
  const cvSkillNames = cv.skills
    .flatMap((group) => group.items)
    .map((item) => aliasesFor(item).canonical);
  const hasFrontend = [
    "React",
    "Next.js",
    "Angular",
    "Vue",
    "HTML",
    "CSS",
  ].some((name) => cvSkillNames.includes(name));
  const hasBackend = [
    "Node.js",
    "Express",
    "Laravel",
    "FastAPI",
    "Spring",
    ".NET",
    "Java",
    "Python",
    "PHP",
  ].some((name) => cvSkillNames.includes(name));
  if (
    jobFamily === "full_stack" &&
    candidateFamilies.includes("software") &&
    hasFrontend &&
    hasBackend
  )
    roleMatch = "compatible";
  const experience = buildExperienceProfile(
    cv,
    jobText,
    jobFamily,
    skills.skills.map((item) => item.name),
    referenceDate,
  );
  return {
    role: { jobFamily, candidateFamilies, candidateRoles, match: roleMatch },
    careerLevel: {
      candidate: detectExperience(cv.identity.headline) as FitLevel,
      job: detectExperience(job.title) as FitLevel,
    },
    experience,
    skills,
    education: compareEducation(jobText, cv),
  };
}
