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
>;
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
    descriptionPlain: str,
    hostedUrl: z.string(),
    workplaceType: str,
    lists: z.array(z.object({ text: str, content: str })).default([]),
  }),
);
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
  "rooster",
  "neojobs",
  "jobster",
  "devjobs",
];
function metaDescription(payload: string) {
  return (
    payload.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)
      ?.[1] ||
    payload.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)/i)
      ?.[1] ||
    ""
  );
}
function collectBadges(block: string) {
  return Array.from(
    block.matchAll(/<span[^>]*class="[^"]*badge[^"]*"[^>]*>([\s\S]*?)<\/span>/gi),
  )
    .map((match) => plainText(match[1]).replace(/\s+/g, " ").trim())
    .filter(Boolean);
}
function normalizeDevJobs(
  source: Source,
  payload: string,
  base: IncomingJobBase,
) {
  return Array.from(
    payload.matchAll(
      /<a href="(https:\/\/devjobs\.lk\/dev-jobs\/client\/ads\/(\d+))" class="card-link">([\s\S]*?)<\/a>/gi,
    ),
  ).map((match) => {
    const block = match[3];
    const title = plainText(
      block.match(/<h5 class="card-title[^"]*">([\s\S]*?)(?:<img|<span|<\/h5>)/i)
        ?.[1] || "",
    ).replace(/\s+/g, " ");
    const company =
      plainText(
        block.match(/<p class="card-text mb-0">([\s\S]*?)<\/p>/i)?.[1] || "",
      ) ||
      plainText(block.match(/alt="([^"]+)"/i)?.[1] || "") ||
      "Company not listed";
    const badges = collectBadges(block);
    const salary = badges.find((tag) => /LKR|USD|\/monthly|salary/i.test(tag)) || "";
    const employmentType =
      badges.find((tag) => /full[-\s]?time|intern|contract|part[-\s]?time/i.test(tag)) ||
      "";
    const locationMatch = title.match(/\[\s*([^\]]+)\s*\]/);
    const location = locationMatch?.[1] || "Sri Lanka";
    const tags = badges
      .filter((tag) => tag !== salary && tag !== employmentType)
      .map((tag) => tag.replace(/^[^\p{L}\p{N}.#+]+/u, "").trim())
      .filter(Boolean)
      .slice(0, 12);
    return {
      ...base,
      externalId: `devjobs-${match[2]}`,
      title,
      company,
      location: `${location} · Sri Lanka`,
      remote: /remote/i.test(location),
      employmentType,
      salary,
      tags: ["Sri Lanka", "DevJobs", ...tags],
      description: `${title}\n${company}\n${badges.join("\n")}`,
      url: match[1],
    };
  });
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
    case "devjobs":
      return `https://devjobs.lk/${source.board || ""}`;
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
      if (typeof payload !== "string") throw new Error("Invalid XpressJobs page");
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
            block.match(/<h6 class="title[^"]*">([\s\S]*?)<\/h6>/i)?.[1] ||
              "",
          ) || "Untitled role";
        const company = plainText(
          block.match(/<strong class="text-primary">\s*([\s\S]*?)\s*<\/strong>/i)
            ?.[1] || "",
        );
        const location =
          plainText(
            block.match(/fa-map-marker[\s\S]*?<\/i>\s*([\s\S]*?)<\/p>/i)
              ?.[1] || "",
          ) || "Location not specified";
        const type = plainText(
          block.match(/fa-clock-o[\s\S]*?<\/i>\s*([\s\S]*?)<\/p>/i)?.[1] ||
            "",
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
      if (typeof payload !== "string") throw new Error("Invalid Rooster page");
      jobs = normalizeSearchableHtml(source, payload, base, "Rooster");
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
    case "devjobs": {
      if (typeof payload !== "string") throw new Error("Invalid DevJobs page");
      jobs = normalizeDevJobs(source, payload, base);
      break;
    }
    case "remotive":
      jobs = remotive
        .parse(payload)
        .jobs.map((j) => ({
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
      jobs = arbeitnow
        .parse(payload)
        .data.map((j) => ({
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
      jobs = greenhouse
        .parse(payload)
        .jobs.map((j) => ({
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
      jobs = lever
        .parse(payload)
        .map((j) => ({
          ...base,
          externalId: j.id,
          title: j.text,
          company: source.name,
          location: j.categories.location,
          remote: j.workplaceType === "remote",
          employmentType: j.categories.commitment,
          tags: [j.categories.team].filter(Boolean),
          description: `${j.descriptionPlain}\n\n${j.lists.map((l) => `${l.text}\n${plainText(l.content)}`).join("\n\n")}`,
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
  const response = await fetch(sourceUrl(source), {
    signal: AbortSignal.timeout(25000),
    redirect: "error",
    headers: {
      "User-Agent": "Jobradar/1.0 (job monitoring; public feeds)",
      Accept:
        htmlSourceKinds.includes(source.kind)
          ? "text/html,application/rss+xml"
          : "application/json",
    },
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
  return normalize(
    source,
    htmlSourceKinds.includes(source.kind)
      ? body
      : JSON.parse(body),
  );
}
