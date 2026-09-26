import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/lib/matching-repository.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "./sync",
                "**/sync",
                "./connectors",
                "**/connectors",
                "./intelligence/**",
                "**/intelligence/**",
                "@/components/**",
                "**/components/**",
                "@/app/**",
                "**/app/**",
              ],
              message:
                "Matching persistence accepts a query client; it must not depend on collection, intelligence orchestration, or presentation.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/actions/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "@/components/**",
                "**/components/**",
                "@/app/**",
                "**/app/**",
                "next",
                "next/**",
              ],
              message:
                "Action operations must remain independent of HTTP and presentation.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "artifacts/**",
    "next-env.d.ts",
    "tmp_source_pages/**",
  ]),
]);
