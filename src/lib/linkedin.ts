import type { Monitor } from "./types";

const LINKEDIN_JOBS_URL = "https://www.linkedin.com/jobs/search/";

export type LinkedInWorkplace = "any" | "on-site" | "remote" | "hybrid";
export type LinkedInExperience =
  | "any"
  | "internship"
  | "entry"
  | "associate"
  | "mid-senior"
  | "director"
  | "executive";
export type LinkedInJobType =
  | "any"
  | "full-time"
  | "part-time"
  | "contract"
  | "temporary"
  | "internship";
export type LinkedInDatePosted = "any" | "day" | "week" | "month";

const workplaceCodes: Record<Exclude<LinkedInWorkplace, "any">, string> = {
  "on-site": "1",
  remote: "2",
  hybrid: "3",
};
const experienceCodes: Record<Exclude<LinkedInExperience, "any">, string> = {
  internship: "1",
  entry: "2",
  associate: "3",
  "mid-senior": "4",
  director: "5",
  executive: "6",
};
const jobTypeCodes: Record<Exclude<LinkedInJobType, "any">, string> = {
  "full-time": "F",
  "part-time": "P",
  contract: "C",
  temporary: "T",
  internship: "I",
};
const datePostedCodes: Record<Exclude<LinkedInDatePosted, "any">, string> = {
  day: "r86400",
  week: "r604800",
  month: "r2592000",
};

function quoted(term: string) {
  const normalized = term.trim().replace(/\s+/g, " ");
  return normalized.includes(" ") ? `"${normalized}"` : normalized;
}

export function linkedInSearchTerms(monitor?: Monitor, query = "") {
  if (query.trim()) return query.trim().replace(/\s+/g, " ");
  if (!monitor) return "software engineer";

  const role = monitor.name.trim();
  const seen = new Set<string>();
  const terms = [role, ...monitor.keywords]
    .map((term) => term.trim().replace(/\s+/g, " "))
    .filter((term) => {
      if (!term) return false;
      const key = term.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);

  return terms.map(quoted).join(" OR ") || "software engineer";
}

export function linkedInJobsSearchUrl({
  monitor,
  query = "",
  location = "",
  remoteOnly,
  workplace = "any",
  experience = "any",
  jobType = "any",
  datePosted = "week",
}: {
  monitor?: Monitor;
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  workplace?: LinkedInWorkplace;
  experience?: LinkedInExperience;
  jobType?: LinkedInJobType;
  datePosted?: LinkedInDatePosted;
}) {
  const selectedWorkplace =
    workplace !== "any"
      ? workplace
      : remoteOnly || monitor?.remoteOnly
        ? "remote"
        : "any";
  const params = new URLSearchParams({
    keywords: linkedInSearchTerms(monitor, query),
    location:
      location.trim() ||
      monitor?.location.trim() ||
      (selectedWorkplace === "remote" ? "Worldwide" : "Sri Lanka"),
  });

  if (selectedWorkplace !== "any")
    params.set("f_WT", workplaceCodes[selectedWorkplace]);
  if (experience !== "any") params.set("f_E", experienceCodes[experience]);
  if (jobType !== "any") params.set("f_JT", jobTypeCodes[jobType]);
  if (datePosted !== "any") params.set("f_TPR", datePostedCodes[datePosted]);
  return `${LINKEDIN_JOBS_URL}?${params.toString()}`;
}
