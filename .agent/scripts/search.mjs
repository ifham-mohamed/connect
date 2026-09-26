import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { root } from "./context-check.mjs";
import { searchDocuments as search } from "../plugins/repository-search/scripts/search.mjs";
export const searchDocuments = (query, directory = root) =>
  search(query, directory);
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(searchDocuments(process.argv.slice(2).join(" ")), null, 2),
  );
