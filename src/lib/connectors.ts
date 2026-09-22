import { XMLParser } from "fast-xml-parser";
import { z } from "zod";
import { plainText, safeUrl, techPattern } from "./matching";
import type { Job, Source } from "./types";
export type IncomingJob = Omit<
  Job,
  | "id"
  | "sourceName"
  | "firstSeenAt"
  | "lastSeenAt"
  | "status"
  | "active"
  | "matchedMonitors"
  | "reviewed"
> & { detailFetchFailed?: boolean };
type IncomingJobBase = Pick<
  IncomingJob,
  "sourceId" | "salary" | "employmentType" | "tags" | "publishedAt"
>;
const str = z.string().default("");
const id = z.union([z.string(), z.number()]).transform(String);
const remotive = z.object({
  jobs: z.array(
    z.object({
      id,
      title: str,
      company_name: str,
      candidate_required_location: str,
      job_type: str,
      salary: str,
      tags: z.array(z.string()).default([]),
      description: str,
      url: z.string(),
      publication_date: str,
    }),
  ),
});
const arbeitnow = z.object({
  data: z.array(
    z.object({
      slug: z.string(),
      title: str,
      company_name: str,
      location: str,
      remote: z.boolean(),
      job_types: z.array(z.string()).default([]),
      tags: z.array(z.string()).default([]),
      description: str,
      url: z.string(),
      created_at: z.number(),
    }),
  ),
});
const greenhouse = z.object({
  jobs: z.array(
    z.object({
      id,
      title: str,
      location: z.object({ name: str }),
      content: str,
      absolute_url: z.string(),
      departments: z.array(z.object({ name: str })).default([]),
    }),
  ),
});
const lever = z.array(
  z.object({
    id: z.string(),
    text: str,
    categories: z.object({ location: str, commitment: str, team: str }),
    description: str,
    descriptionPlain: str,
    descriptionBody: str,
    descriptionBodyPlain: str,
    opening: str,
    openingPlain: str,
    additional: str,
    additionalPlain: str,
    hostedUrl: z.string(),
    workplaceType: str,
    lists: z.array(z.object({ text: str, content: str })).default([]),
  }),
);
const rooster = z.object({
  body: z.object({
    data: z.array(
      z.object({
        id,
        title: str,
        description: str,
        company_name: str,
        subsidiary_company_name: z.string().nullable().default(null),
        job_type: str,
        location: str,
        department: str,
        tags: z.array(z.string()).default([]),
        created_at: str,
        remote: z.boolean().default(false),
        min_salary: z.number().nullable().default(null),
        max_salary: z.number().nullable().default(null),
        salary_frequency: z.string().nullable().default(null),
        salary_currency: z.string().nullable().default(null),
      }),
    ),
  }),
});
function absolutize(url: string, base: string) {
  try {
    return new URL(url, base).href;
  } catch {
    return "";
  }
}
function date(value: string | number): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
const htmlSourceKinds = [
  "itpro",
  "topjobs",
  "xpressjobs",
  "jobeka",
  "neojobs",
  "jobster",
];
const roosterSearchUrl = "https://api.rooster.jobs/jobSearch/jobs/search";
function metaDescription(payload: string) {
  return (
    payload.match(
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i,
    )?.[1] ||
    payload.match(
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i,
    )?.[1] ||
    ""
  );
}
function normalizeSearchableHtml(
  source: Source,
  payload: string,
  base: IncomingJobBase,
  brand: string,
) {
  const description = plainText(metaDescription(payload));
  if (!description || !techPattern.test(description)) return [];
  return [
    {
      ...base,
      externalId: `${source.kind}-${source.board || "home"}`,
      title: `${source.name} technology listings`,
      company: source.name,
      location: "Sri Lanka",
      remote: /remote/i.test(description),
      employmentType: "",
      tags: ["Sri Lanka", brand, "Technology"],
      description,
      url: sourceUrl(source),
    },
  ];
}
export function parseItproJobDetail(payload: string): {
  description: string;
  employmentType: string;
} | null {
  const article = payload.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1];
  if (!article) return null;
  const descriptionHtml = article.match(
    /<section\b(?=[^>]*\bid=["']job-description["'])[^>]*>([\s\S]*?)<\/section>/i,
  )?.[1];
  if (!descriptionHtml) return null;
  const description = plainText(descriptionHtml)
    .replace(/[\t ]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (!description) return null;
  const subrow = article.match(
    /<div\b(?=[^>]*\bid=["']job-details-subrow["'])[^>]*>([\s\S]*?)<\/div>/i,
  )?.[1];
  const employmentType =
    subrow
      ?.match(
        /<span\b[^>]*style=["'][^"']*white-space:\s*nowrap[^"']*["'][^>]*>\s*([^<]+)<\/span>/gi,
      )
      ?.map((span) => plainText(span))
      .find((text) =>
        /^(full.time|part.time|internship|contract|freelance|temporary)$/i.test(
          text,
        ),
      ) || "";
  return { description, employmentType };
}

export function parseTopJobsAdvertImageUrl(payload: string, pageUrl: string) {
  const candidates = Array.from(
    payload.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
  );
  for (const match of candidates) {
    const value = match[1].replace(/&amp;/g, "&");
    if (!/\.(?:png|jpe?g|webp)(?:\?|$)/i.test(value) || /_small\./i.test(value))
      continue;
    try {
      const url = new URL(value, pageUrl);
      if (
        url.protocol === "https:" &&
        /^(?:www\.)?topjobs\.lk$/i.test(url.hostname) &&
        url.pathname.startsWith("/logo/")
      )
        return url.href;
    } catch {
      // Ignore malformed image candidates from an external listing.
    }
  }
  return "";
}

function trustedItproJobUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "itpro.lk" &&
      /^\/job\/\d+\//.test(url.pathname)
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export async function fetchItproJobDetail(value: string) {
  const url = trustedItproJobUrl(value);
  if (!url) throw new Error("Invalid ITPro job URL");
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    redirect: "error",
    headers: {
      "User-Agent": "Jobradar/1.0 (job monitoring; public listings)",
      Accept: "text/html",
    },
    cache: "no-store",
  });
  if (
    !response.ok ||
    !response.headers.get("content-type")?.includes("text/html")
  )
    throw new Error("ITPro detail unavailable");
  const contentLength = Number(response.headers.get("content-length") || 0);
  if (contentLength > 1_000_000) throw new Error("ITPro detail too large");
  const html = await response.text();
  if (html.length > 1_000_000) throw new Error("ITPro detail too large");
  const detail = parseItproJobDetail(html);
  if (!detail) throw new Error("ITPro description unavailable");
  return detail;
}

async function enrichItproJobs(jobs: IncomingJob[]): Promise<IncomingJob[]> {
  let cursor = 0;
  const enriched = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const index = cursor++;
        const job = jobs[index];
        try {
          const detail = await fetchItproJobDetail(job.url);
          enriched[index] = {
            ...job,
            description: detail.description.slice(0, 60000),
            employmentType: detail.employmentType || job.employmentType,
          };
        } catch {
          enriched[index] = { ...job, detailFetchFailed: true };
        }
      }
    }),
  );
  return enriched;
}

async function enrichTopJobs(jobs: IncomingJob[]): Promise<IncomingJob[]> {
  let cursor = 0;
  const enriched = [...jobs];
  await Promise.all(
    Array.from({ length: Math.min(4, jobs.length) }, async () => {
      while (cursor < jobs.length) {
        const index = cursor++;
        const job = jobs[index];
        try {
          const url = new URL(job.url);
          if (
            url.protocol !== "https:" ||
            !/^(?:www\.)?topjobs\.lk$/i.test(url.hostname) ||
            url.pathname !== "/employer/JobAdvertismentServlet"
          )
            throw new Error("Invalid TopJobs detail URL");
          const response = await fetch(url, {
            signal: AbortSignal.timeout(8000),
            redirect: "error",
            headers: {
              "User-Agent": "Jobradar/1.0 (job monitoring; public listings)",
              Accept: "text/html",
            },
            cache: "no-store",
          });
          if (
            !response.ok ||
            !response.headers.get("content-type")?.includes("text/html")
          )
            throw new Error("TopJobs detail unavailable");
          const contentLength = Number(
            response.headers.get("content-length") || 0,
          );
          if (contentLength > 1_000_000)
            throw new Error("TopJobs detail too large");
          const html = await response.text();
          if (html.length > 1_000_000)
            throw new Error("TopJobs detail too large");
          enriched[index] = {
            ...job,
            sourceImageUrl: parseTopJobsAdvertImageUrl(html, url.href),
          };
        } catch {
          enriched[index] = { ...job, detailFetchFailed: true };
        }
      }
    }),
  );
  return enriched;
}
export function sourceUrl(source: Pick<Source, "kind" | "board">) {
  if (!/^[a-zA-Z0-9_-]{0,100}$/.test(source.board))
    throw new Error("Invalid board identifier");
  switch (source.kind) {
    case "itpro":
      if (source.board === "software-engineering")
        return "https://itpro.lk/jobs/software-engineering/";
      return "https://itpro.lk/rss/all/";
    case "topjobs":
      return `https://www.topjobs.lk/applicant/vacancybyfunctionalarea.jsp?FA=${source.board || "SDQ"}`;
    case "xpressjobs":
      return `https://xpress.jobs/Jobs/sector/${source.board || "it"}`;
    case "jobeka":
      return `https://jobeka.lk/browse/category/${source.board || "IT-Software-and-Design"}`;
    case "rooster":
      return "https://rooster.jobs/";
    case "neojobs":
      return "https://www.neojobs.lk/jobs";
    case "jobster":
      return "https://www.jobster.lk/jobs";
    case "remotive":
      return "https://remotive.com/api/remote-jobs";
    case "arbeitnow":
      return "https://www.arbeitnow.com/api/job-board-api";
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${source.board}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${source.board}?mode=json`;
  }
}
export function normalize(source: Source, payload: unknown): IncomingJob[] {
  const base = {
    sourceId: source.id,
    salary: "",
    employmentType: "",
    tags: [] as string[],
    publishedAt: null as string | null,
  };
  let jobs: IncomingJob[];
  switch (source.kind) {
    case "itpro": {
      if (typeof payload !== "string" || /<!ENTITY/i.test(payload))
        throw new Error("Invalid feed");
      if (/<!DOCTYPE/i.test(payload) && source.board !== "software-engineering")
        throw new Error("Invalid feed");
      if (!payload.trimStart().startsWith("<rss")) {
        jobs = Array.from(
          payload.matchAll(
            /<article class="job-card" id="([^"]+)"[\s\S]*?<a href="([^"]+)"[\s\S]*?<h2 class="jc-title">\s*([\s\S]*?)\s*<\/h2>[\s\S]*?<span class="jc-company">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<span class="la">\s*([\s\S]*?)\s*<\/span>[\s\S]*?<time[^>]*datetime="([^"]+)"/gi,
          ),
        ).map((match) => {
          const title = plainText(match[3]);
          const company = plainText(match[4]);
          const location = plainText(match[5]);
          const publishedAt = date(match[6]);
          return {
            ...base,
            externalId: `itpro-${match[1]}`,
            title,
            company,
            location: `${location || "Location not listed"} · Sri Lanka`,
            remote: /remote/i.test(location),
            employmentType: "",
            description: `${title}\n${company}\n${location}`,
            url: match[2],
            publishedAt,
            tags: ["Sri Lanka", "Software Engineering"],
          };
        });
        break;
      }
      const parsed = new XMLParser({
        ignoreAttributes: true,
        processEntities: false,
      }).parse(payload);
      if (!parsed?.rss?.channel) throw new Error("Unexpected RSS format");
      const items = parsed.rss.channel.item || [];
      jobs = (Array.isArray(items) ? items : [items]).map(
        (item: Record<string, string>) => {
          const content = plainText(String(item["content:encoded"] || ""));
          const field = (name: string) =>
            content.match(new RegExp(`${name}:([^\\n]*)`))?.[1].trim() || "";
          const location = field("Location");
          return {
            ...base,
            externalId: String(item.guid || item.link),
            title: plainText(String(item.title || "")),
            company: field("Company") || "Company not listed",
            location: `${location || "Location not listed"} · Sri Lanka`,
            remote: /remote/i.test(location),
            employmentType: field("Job Type"),
            description: content,
            url: String(item.link || ""),
            publishedAt: date(String(item.pubDate || "")),
            tags: ["Sri Lanka"],
          };
        },
      );
      break;
    }
    case "topjobs": {
      if (typeof payload !== "string") throw new Error("Invalid TopJobs page");
      jobs = Array.from(
        payload.matchAll(
          /<tr id="tr(\d+)" onclick="createAlert\('([^']+)','([^']+)','([^']+)','([^']+)'[\s\S]*?<td[^>]*align="center">\s*(\d+)[\s\S]*?<h2><span>([\s\S]*?)<\/span><\/h2>\s*<h1>([\s\S]*?)<\/h1>[\s\S]*?<td width="35%">([\s\S]*?)<\/td>[\s\S]*?<td width="12%"[^>]*>\s*([\s\S]*?)<\/td>[\s\S]*?<td width="12%"[^>]*>\s*([\s\S]*?)<\/td>[\s\S]*?<td width="8%"[^>]*>\s*([\s\S]*?)<\/td>/gi,
        ),
      ).map((match) => {
        const title = plainText(match[7]);
        const company = plainText(match[8]);
        const summary = plainText(match[9]);
        const openingDate = plainText(match[10]);
        const location = plainText(match[12]);
        const jc = match[4];
        const ac = match[3];
        const ec = match[5];
        return {
          ...base,
          externalId: `topjobs-${jc}`,
          title,
          company,
          location: `${location || "Location not listed"} · Sri Lanka`,
          remote: /remote|work from home|wfh/i.test(`${title} ${summary}`),
          employmentType: "",
          description: `${summary}\nOpening date: ${openingDate}`,
          url: `https://www.topjobs.lk/employer/JobAdvertismentServlet?rid=${match[2]}&ac=${ac}&jc=${jc}&ec=${ec}&pg=applicant/vacancybyfunctionalarea.jsp`,
          publishedAt: date(openingDate),
          tags: ["Sri Lanka", "TopJobs"],
        };
      });
      break;
    }
    case "xpressjobs": {
      if (typeof payload !== "string")
        throw new Error("Invalid XpressJobs page");
      jobs = normalizeSearchableHtml(source, payload, base, "XpressJobs");
      break;
    }
    case "jobeka": {
      if (typeof payload !== "string") throw new Error("Invalid JobEka page");
      jobs = Array.from(
        payload.matchAll(
          /<a href="([^"]+)" class="job-list top-line">([\s\S]*?)<\/a>/gi,
        ),
      ).map((match) => {
        const block = match[2];
        const title =
          plainText(
            block.match(/<h6 class="title[^"]*">([\s\S]*?)<\/h6>/i)?.[1] || "",
          ) || "Untitled role";
        const company = plainText(
          block.match(
            /<strong class="text-primary">\s*([\s\S]*?)\s*<\/strong>/i,
          )?.[1] || "",
        );
        const location =
          plainText(
            block.match(/fa-map-marker[\s\S]*?<\/i>\s*([\s\S]*?)<\/p>/i)?.[1] ||
              "",
          ) || "Location not specified";
        const type = plainText(
          block.match(/fa-clock-o[\s\S]*?<\/i>\s*([\s\S]*?)<\/p>/i)?.[1] || "",
        );
        const url = absolutize(match[1], "https://jobeka.lk");
        return {
          ...base,
          externalId: `jobeka-${url.split("/").pop() || title}`,
          title,
          company: company || "Company not listed",
          location: `${location} · Sri Lanka`,
          remote: /remote|worldwide/i.test(location),
          employmentType: type === "Not specified" ? "" : type,
          description: `${title}\n${company}\n${location}`,
          url,
          tags: ["Sri Lanka", "JobEka"],
        };
      });
      break;
    }
    case "rooster": {
      jobs = rooster.parse(payload).body.data.map((job) => {
        const salaryParts = [
          job.salary_currency,
          job.min_salary,
          job.max_salary ? `– ${job.max_salary}` : "",
          job.salary_frequency ? `/ ${job.salary_frequency}` : "",
        ].filter((value) => value !== null && value !== "");
        return {
          ...base,
          externalId: `rooster-${job.id}`,
          title: job.title,
          company:
            job.subsidiary_company_name || job.company_name || "Company not listed",
          location: job.location || "Location not specified",
          remote: job.remote || /remote|work from home|wfh/i.test(job.location),
          employmentType: job.job_type,
          salary: salaryParts.join(" "),
          tags: [job.department, ...job.tags, "Rooster"].filter(Boolean),
          description: plainText(job.description),
          url: `https://rooster.jobs/jobs/${job.id}`,
          publishedAt: date(
            job.created_at && !/[zZ]|[+-]\d{2}:\d{2}$/.test(job.created_at)
              ? `${job.created_at.replace(" ", "T")}Z`
              : job.created_at,
          ),
        };
      });
      break;
    }
    case "neojobs": {
      if (typeof payload !== "string") throw new Error("Invalid Neo Jobs page");
      jobs = normalizeSearchableHtml(source, payload, base, "Neo Jobs");
      break;
    }
    case "jobster": {
      if (typeof payload !== "string") throw new Error("Invalid Jobster page");
      jobs = normalizeSearchableHtml(source, payload, base, "Jobster");
      break;
    }
    case "remotive":
      jobs = remotive.parse(payload).jobs.map((j) => ({
        ...base,
        externalId: j.id,
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Location not specified",
        remote: true,
        employmentType: j.job_type.replaceAll("_", "-"),
        salary: j.salary,
        tags: j.tags,
        description: plainText(j.description),
        url: j.url,
        publishedAt: date(
          j.publication_date &&
            !/[zZ]|[+-]\d{2}:\d{2}$/.test(j.publication_date)
            ? `${j.publication_date}Z`
            : j.publication_date,
        ),
      }));
      break;
    case "arbeitnow":
      jobs = arbeitnow.parse(payload).data.map((j) => ({
        ...base,
        externalId: j.slug,
        title: j.title,
        company: j.company_name,
        location: j.location,
        remote: j.remote,
        employmentType: j.job_types.join(", "),
        tags: j.tags,
        description: plainText(j.description),
        url: j.url,
        publishedAt: date(j.created_at * 1000),
      }));
      break;
    case "greenhouse":
      jobs = greenhouse.parse(payload).jobs.map((j) => ({
        ...base,
        externalId: j.id,
        title: j.title,
        company: source.name,
        location: j.location.name,
        remote: /remote/i.test(j.location.name),
        tags: j.departments.map((d) => d.name),
        description: plainText(plainText(j.content)),
        url: j.absolute_url,
      }));
      break;
    case "lever":
      jobs = lever.parse(payload).map((j) => ({
        ...base,
        externalId: j.id,
        title: j.text,
        company: source.name,
        location: j.categories.location,
        remote: j.workplaceType === "remote",
        employmentType: j.categories.commitment,
        tags: [j.categories.team].filter(Boolean),
        description: [
          j.descriptionBodyPlain ||
            j.descriptionPlain ||
            j.descriptionBody ||
            j.description,
          j.openingPlain || j.opening,
          ...j.lists.map((l) => `${l.text}\n${plainText(l.content)}`),
          j.additionalPlain || j.additional,
        ]
          .map((section) => plainText(section).trim())
          .filter(Boolean)
          .filter((section, index, sections) => sections.indexOf(section) === index)
          .join("\n\n"),
        url: j.hostedUrl,
      }));
      break;
  }
  return jobs
    .filter(
      (j) =>
        j.title &&
        safeUrl(j.url) &&
        techPattern.test(`${j.title} ${j.tags.join(" ")}`),
    )
    .map((j) => ({
      ...j,
      url: safeUrl(j.url),
      description: j.description.slice(0, 60000),
    }));
}
export async function collect(source: Source): Promise<IncomingJob[]> {
  const response = await fetch(
    source.kind === "rooster" ? roosterSearchUrl : sourceUrl(source),
    {
    method: source.kind === "rooster" ? "POST" : "GET",
    signal: AbortSignal.timeout(25000),
    redirect: "error",
    headers: {
      "User-Agent": "Jobradar/1.0 (job monitoring; public feeds)",
      ...(source.kind === "rooster"
        ? { "Content-Type": "application/json" }
        : {}),
      Accept: htmlSourceKinds.includes(source.kind)
        ? "text/html,application/rss+xml"
        : "application/json",
    },
    body:
      source.kind === "rooster"
        ? JSON.stringify({
            query: [
              "software",
              "developer",
              "engineer",
              "data",
              "IT",
              "technology",
            ],
            limit: 1000,
            page: 1,
            filters: { country: "Sri Lanka" },
          })
        : undefined,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Source returned an empty response");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > 12_000_000) {
      await reader.cancel();
      throw new Error("Feed exceeds the 12 MB size limit");
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  const jobs = normalize(
    source,
    htmlSourceKinds.includes(source.kind) ? body : JSON.parse(body),
  );
  if (source.kind === "itpro" && source.board === "software-engineering")
    return enrichItproJobs(jobs);
  if (source.kind === "topjobs") return enrichTopJobs(jobs);
  return jobs;
}
