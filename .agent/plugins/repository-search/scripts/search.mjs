import { DatabaseSync } from "node:sqlite";
import { readdirSync, readFileSync, realpathSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = process.cwd();

export function searchDocuments(query, directory = root) {
  if (typeof query !== "string" || !query.trim() || query.length > 500)
    throw new Error("Provide a search query of 1–500 characters");
  const database = new DatabaseSync(":memory:");
  try {
    database.exec(
      "CREATE VIRTUAL TABLE documents USING fts5(path UNINDEXED, body)",
    );
    const insert = database.prepare(
      "INSERT INTO documents(path,body) VALUES (?,?)",
    );
    for (const folder of ["docs", ".agent/context"]) {
      if (!existsSync(resolve(directory, folder))) continue;
      for (const file of readdirSync(resolve(directory, folder), {
        recursive: true,
      })) {
        if (!file.endsWith(".md")) continue;
        const path = resolve(directory, folder, file);
        const rel = relative(realpathSync(directory), realpathSync(path));
        if (rel.startsWith(".."))
          throw new Error("Search source escapes repository");
        const body = readFileSync(path, "utf8");
        if (Buffer.byteLength(body) > 1000000) continue;
        insert.run(`${folder}/${file.replaceAll("\\", "/")}`, body);
      }
    }
    // Literal terms, not executable FTS syntax. Every invocation reads current files.
    const terms = query.match(/[\p{L}\p{N}_-]+/gu) ?? [];
    if (!terms.length) return [];
    const expression = terms.map((term) => '"' + term + '"').join(" OR ");
    return database
      .prepare(
        "SELECT path, snippet(documents,1,'[',']','…',30) AS excerpt, rank FROM documents WHERE documents MATCH ? ORDER BY rank LIMIT 12",
      )
      .all(expression);
  } finally {
    database.close();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(searchDocuments(process.argv.slice(2).join(" ")), null, 2),
  );
