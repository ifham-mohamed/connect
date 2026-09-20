import type { Monitor } from "./types";

const LINKEDIN_JOBS_URL = "https://www.linkedin.com/jobs/search/";
const LINKEDIN_POSTS_URL = "https://www.linkedin.com/search/results/content/";

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
export type LinkedInSort = "relevant" | "recent";
export type LinkedInDistance = "0" | "10" | "25" | "50" | "100";

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

function monitorPosition(monitor?: Monitor) {
  return monitor?.name.split("·")[0].trim() || "software engineer";
}

export function linkedInSearchTerms(monitor?: Monitor, query = "") {
  if (query.trim()) return query.trim().replace(/\s+/g, " ");
  if (!monitor) return "software engineer";

  const role = monitorPosition(monitor);
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
  sort = "relevant",
  distance = "25",
  easyApply = false,
  underTenApplicants = false,
}: {
  monitor?: Monitor;
  query?: string;
  location?: string;
  remoteOnly?: boolean;
  workplace?: LinkedInWorkplace;
  experience?: LinkedInExperience;
  jobType?: LinkedInJobType;
  datePosted?: LinkedInDatePosted;
  sort?: LinkedInSort;
  distance?: LinkedInDistance;
  easyApply?: boolean;
  underTenApplicants?: boolean;
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
  if (sort === "recent") params.set("sortBy", "DD");
  if (distance !== "0") params.set("distance", distance);
  if (easyApply) params.set("f_AL", "true");
  if (underTenApplicants) params.set("f_EA", "true");
  return `${LINKEDIN_JOBS_URL}?${params.toString()}`;
}

export function linkedInNetworkJobsSearchUrl(
  options: Parameters<typeof linkedInJobsSearchUrl>[0],
) {
  const role =
    options.query?.trim() || monitorPosition(options.monitor);
  return linkedInJobsSearchUrl({
    ...options,
    query: `${role} jobs in my network`,
  });
}

export function linkedInJobPostsSearchUrl({
  monitor,
  query = "",
  location = "",
}: Pick<
  Parameters<typeof linkedInJobsSearchUrl>[0],
  "monitor" | "query" | "location"
>) {
  const role = query.trim() || monitorPosition(monitor);
  const targetLocation = location.trim() || monitor?.location.trim();
  const keywords = [
    role,
    "hiring OR vacancy OR opportunity OR \"job opening\"",
    targetLocation,
  ]
    .filter(Boolean)
    .join(" ");
  return `${LINKEDIN_POSTS_URL}?${new URLSearchParams({ keywords }).toString()}`;
}
