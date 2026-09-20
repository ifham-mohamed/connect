import type { Monitor } from "./types";

const LINKEDIN_JOBS_URL = "https://www.linkedin.com/jobs/search/";

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
}: {
  monitor?: Monitor;
  query?: string;
  location?: string;
  remoteOnly?: boolean;
}) {
  const remote = remoteOnly ?? monitor?.remoteOnly ?? false;
  const params = new URLSearchParams({
    keywords: linkedInSearchTerms(monitor, query),
    location:
      location.trim() ||
      monitor?.location.trim() ||
      (remote ? "Worldwide" : "Sri Lanka"),
    f_TPR: "r604800",
  });

  if (remote) params.set("f_WT", "2");
  return `${LINKEDIN_JOBS_URL}?${params.toString()}`;
}
