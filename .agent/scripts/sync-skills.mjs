import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root } from "./context-check.mjs";

export function syncSkills(directory = root, write = false) {
  const errors = [];
  const canonical = resolve(directory, ".agent/skills");
  const names = readdirSync(canonical, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  for (const name of names) {
    if (!/^[a-z0-9-]+$/.test(name))
      throw new Error(`Invalid skill name: ${name}`);
    const body = readFileSync(resolve(canonical, name, "SKILL.md"), "utf8");
    for (const adapter of [".agents", ".claude"]) {
      const target = resolve(directory, adapter, "skills", name, "SKILL.md");
      if (existsSync(target) && readFileSync(target, "utf8") === body) continue;
      if (write) {
        mkdirSync(resolve(directory, adapter, "skills", name), {
          recursive: true,
        });
        writeFileSync(target, body);
      } else
        errors.push(
          `Skill adapter differs: ${adapter}/skills/${name}/SKILL.md`,
        );
    }
  }
  for (const adapter of [".agents", ".claude"]) {
    const folder = resolve(directory, adapter, "skills");
    if (!existsSync(folder)) continue;
    for (const entry of readdirSync(folder, { withFileTypes: true }))
      if (entry.isDirectory() && !names.includes(entry.name))
        errors.push(
          `Unmanaged skill: ${adapter}/skills/${entry.name}; review manually, never automatically deleted`,
        );
  }
  return errors;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((a) => !["--write", "--check"].includes(a)))
    throw new Error(
      "Use --check (default) or --write to replace discovery copies from canonical skills",
    );
  const errors = syncSkills(root, args.includes("--write"));
  errors.forEach((e) => console.error(e));
  process.exitCode = errors.length ? 1 : 0;
}
