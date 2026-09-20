import type { Job, Monitor } from "./types";
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
export function matchesMonitor(
  job: Pick<
    Job,
    "title" | "company" | "description" | "tags" | "location" | "remote"
  >,
  monitor: Monitor,
) {
  if (!monitor.enabled || (monitor.remoteOnly && !job.remote)) return false;
  const haystack = `${job.title} ${job.tags.join(" ")}`.toLowerCase();
  if (!matchesLocation(job.location, monitor.location)) return false;
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
