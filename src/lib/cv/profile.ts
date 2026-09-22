export type CvSkillGroup = { category: string; items: string[] };
export type CvEntry = { heading: string; details: string[]; bullets: string[] };
export type CvSection = { id: string; title: string; entries: CvEntry[] };
export type CvProfile = {
  identity: {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    links: string[];
  };
  summary: string;
  skills: CvSkillGroup[];
  sections: CvSection[];
  source: { fileName: string; pages: number; importedAt: string };
  rawText: string;
};

const headingAliases: Record<string, string> = {
  "professional summary": "Professional summary",
  summary: "Professional summary",
  profile: "Professional summary",
  "about me": "Professional summary",
  "technical skills": "Technical skills",
  skills: "Technical skills",
  "core skills": "Technical skills",
  "key skills": "Technical skills",
  education: "Education",
  qualifications: "Education",
  "work experience": "Work experience",
  "professional experience": "Work experience",
  experience: "Work experience",
  employment: "Work experience",
  "freelance & client projects": "Freelance & client projects",
  "selected projects": "Selected projects",
  projects: "Selected projects",
  research: "Research",
  publications: "Research",
  "activities & leadership": "Activities & leadership",
  leadership: "Activities & leadership",
  certifications: "Certifications",
  certificates: "Certifications",
  awards: "Awards",
  languages: "Languages",
  references: "References",
};
const dateMarker =
  /(?:\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}|\b20\d{2}\s*[–-]\s*(?:20\d{2}|Present|Current))/i;
const bulletMarker = /^[•●▪◦*-]\s+/;
const linkPattern =
  /(?:https?:\/\/)?(?:www\.)?(?:linkedin\.com\/in\/|github\.com\/|[a-z0-9-]+\.(?:dev|io|com|net)\b)[^\s|,]*/gi;
const emailPattern = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i;
const phonePattern = /(?:\+?\d[\d ()-]{7,}\d)/;

function normalizeLines(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function sectionTitle(line: string) {
  const normalized = line
    .toLowerCase()
    .replace(/[:.]+$/, "")
    .trim();
  return headingAliases[normalized] || null;
}

function splitSkills(lines: string[]): CvSkillGroup[] {
  const groups: CvSkillGroup[] = [];
  const categories = [
    "Languages",
    "Frontend",
    "Backend & APIs",
    "Backend",
    "Databases & ORMs",
    "Databases",
    "Cloud & DevOps",
    "Architecture & Quality",
    "Testing & Automation",
    "AI-Assisted Engineering",
    "Frameworks",
    "Tools",
    "Other",
  ];
  for (const line of lines) {
    const category = categories.find((item) =>
      line.toLowerCase().startsWith(`${item.toLowerCase()} `),
    );
    const name = category || "Other";
    const values = (category ? line.slice(category.length) : line).trim();
    if (!values) continue;
    const items = values
      .split(/,(?![^()]*\))/)
      .map((value) => value.trim())
      .filter(Boolean);
    const existing = groups.find((group) => group.category === name);
    if (existing) existing.items.push(...items);
    else groups.push({ category: name, items });
  }
  return groups;
}

function parseEntries(lines: string[]): CvEntry[] {
  const entries: CvEntry[] = [];
  let current: CvEntry | null = null;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (bulletMarker.test(line)) {
      if (!current) {
        current = { heading: "Details", details: [], bullets: [] };
        entries.push(current);
      }
      current.bullets.push(line.replace(bulletMarker, "").trim());
      continue;
    }
    const likelyHeading =
      !current ||
      dateMarker.test(line) ||
      (current.bullets.length > 0 &&
        index + 1 < lines.length &&
        !bulletMarker.test(lines[index + 1]) &&
        /^[A-Z]/.test(line) &&
        line.length < 100 &&
        !/[,;.!?]$/.test(line));
    if (likelyHeading) {
      current = { heading: line, details: [], bullets: [] };
      entries.push(current);
    } else if (current?.bullets.length) {
      current.bullets[current.bullets.length - 1] += ` ${line}`;
    } else current?.details.push(line);
  }
  return entries;
}

export function parseCvText(
  rawText: string,
  source: CvProfile["source"],
): CvProfile {
  const lines = normalizeLines(rawText);
  const chunks: { title: string; lines: string[] }[] = [];
  const header: string[] = [];
  let current: { title: string; lines: string[] } | null = null;
  for (const line of lines) {
    const title = sectionTitle(line);
    if (title) {
      current = { title, lines: [] };
      chunks.push(current);
    } else if (current) current.lines.push(line);
    else header.push(line);
  }
  const headerText = header.join(" | ");
  const headerLinks = headerText.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, " ");
  const identity = {
    name: header[0] || "",
    headline: header[1] || "",
    email: headerText.match(emailPattern)?.[0] || "",
    phone: headerText.match(phonePattern)?.[0]?.trim() || "",
    location:
      header
        .find((line) =>
          /\b(?:Sri Lanka|Colombo|Qatar|Remote|United Kingdom|United States)\b/i.test(
            line,
          ),
        )
        ?.split("|")
        .at(-1)
        ?.trim() || "",
    links: Array.from(new Set(headerLinks.match(linkPattern) || [])),
  };
  const summary = chunks
    .filter((chunk) => chunk.title === "Professional summary")
    .flatMap((chunk) => chunk.lines)
    .join(" ")
    .trim();
  const skills = chunks
    .filter((chunk) => chunk.title === "Technical skills")
    .flatMap((chunk) => splitSkills(chunk.lines));
  const sections = chunks
    .filter(
      (chunk) =>
        !["Professional summary", "Technical skills"].includes(chunk.title),
    )
    .map((chunk, index) => ({
      id: `${chunk.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
      title: chunk.title,
      entries:
        chunk.title === "Activities & leadership"
          ? [
              {
                heading: "Activities and leadership",
                details: chunk.lines,
                bullets: [],
              },
            ]
          : parseEntries(chunk.lines),
    }));
  return { identity, summary, skills, sections, source, rawText };
}

export function cvSkillTerms(profile: CvProfile): string[] {
  return Array.from(
    new Set(
      profile.skills
        .flatMap((group) => group.items)
        .map((item) => item.trim())
        .filter((item) => item.length >= 2),
    ),
  );
}
