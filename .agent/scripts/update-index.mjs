import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import ts from "typescript";
import { format, resolveConfig } from "prettier";
import { root, hash, sourceHash } from "./context-check.mjs";
import { subsystems } from "./subsystems.mjs";

export function buildIndex(
  directory = root,
  git = (...args) => execFileSync("git", args, { cwd: directory }).toString(),
) {
  const paths = [
    ...new Set(
      git("ls-files", "--cached", "--others", "--exclude-standard", "-z").split(
        "\0",
      ),
    ),
  ]
    .filter(
      (p) =>
        /^(src|tests|scripts|db|docs)\//.test(p) ||
        /^\.agent\/(scripts|context|schemas|skills|evals|plugins)\//.test(p) ||
        /^\.agent\/capabilities\.json$/.test(p) ||
        /^\.(?:claude|codex|github|githooks)\//.test(p) ||
        /^(\.mcp\.json|package(-lock)?\.json|tsconfig\.json|eslint\.config\.mjs|AGENTS\.md|CLAUDE\.md|docs\/agent-workflow\.md)$/.test(
          p,
        ),
    )
    .filter((p) => existsSync(resolve(directory, p)))
    .sort();
  const config = ts.readConfigFile(
    resolve(directory, "tsconfig.json"),
    ts.sys.readFile,
  );
  if (config.error)
    throw new Error(
      ts.flattenDiagnosticMessageText(config.error.messageText, "\n"),
    );
  const options = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    directory,
  ).options;
  const sources = paths.map((path) => ({
    path,
    subsystem: path.split("/").slice(0, 2).join("/"),
    sha256: sourceHash(resolve(directory, path)),
  }));
  const symbols = [];
  const imports = [];
  for (const path of paths.filter((p) => /\.[cm]?[jt]sx?$/.test(p))) {
    const absolute = resolve(directory, path);
    const content = readFileSync(absolute, "utf8");
    const ast = ts.createSourceFile(
      path,
      content,
      ts.ScriptTarget.Latest,
      true,
    );
    for (const statement of ast.statements) {
      if (
        !statement.modifiers?.some(
          (m) => m.kind === ts.SyntaxKind.ExportKeyword,
        )
      )
        continue;
      const names = ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.map((d) => d.name.getText(ast))
        : statement.name
          ? [statement.name.getText(ast)]
          : [];
      for (const name of names)
        symbols.push({
          path,
          name,
          line:
            ast.getLineAndCharacterOfPosition(statement.getStart(ast)).line + 1,
        });
    }
    for (const imported of ts.preProcessFile(content, true, true)
      .importedFiles) {
      const found = ts.resolveModuleName(
        imported.fileName,
        absolute,
        options,
        ts.sys,
      ).resolvedModule;
      const local =
        found && !found.isExternalLibraryImport
          ? relative(directory, found.resolvedFileName).replaceAll("\\", "/")
          : null;
      imports.push({
        from: path,
        specifier: imported.fileName,
        to: local && paths.includes(local) ? local : null,
      });
    }
  }
  const map = {
    schema_version: 1,
    base_commit: git("rev-parse", "HEAD").trim(),
    sources,
    packages: {
      jobradar: {
        root: ".",
        entrypoints: ["src/app/layout.tsx", "src/components/dashboard.tsx"],
        tests: "tests",
      },
    },
    subsystems,
  };
  const provenance = {
    schema_version: 1,
    base_commit: map.base_commit,
    source_hash: hash(JSON.stringify(sources)),
    generator: ".agent/scripts/update-index.mjs",
  };
  const pkg = JSON.parse(
    readFileSync(resolve(directory, "package.json"), "utf8"),
  );
  return {
    "repo-map.json": map,
    "symbols.json": {
      provenance,
      scope:
        "Top-level named exports; inspect source for re-exports and anonymous defaults",
      symbols,
    },
    "dependencies.json": {
      provenance,
      packages: { ...pkg.dependencies, ...pkg.devDependencies },
      imports,
    },
    "ownership.json": {
      provenance,
      meaning: "Module responsibility, not people or CODEOWNERS authorization",
      boundaries: [
        {
          path: "src/app/api",
          responsibility: "HTTP contracts and access control",
        },
        {
          path: "src/lib/actions",
          responsibility: "Application writes and operation transactions",
        },
        {
          path: "src/lib/matching-repository.ts",
          responsibility: "Matching SQL with caller-owned query client",
        },
        {
          path: "src/components/dashboard",
          responsibility: "Typed presentation and forms",
        },
        {
          path: ".agent",
          responsibility: "Development context and verification",
        },
      ],
    },
  };
}

export function checkIndex(directory = root) {
  const expected = buildIndex(directory);
  return Object.entries(expected).flatMap(([name, value]) => {
    const path = resolve(directory, ".agent/index", name);
    try {
      // A commit changes HEAD without changing these sources. Retain recorded
      // baseline metadata but judge freshness by content, not self-referential HEAD.
      const contentOnly = (object) =>
        JSON.stringify(object, (key, value) =>
          key === "base_commit" ? undefined : value,
        );
      return contentOnly(JSON.parse(readFileSync(path, "utf8"))) ===
        contentOnly(value)
        ? []
        : [`Stale index: ${name}`];
    } catch {
      return [`Missing or invalid index: ${name}`];
    }
  });
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2);
  if (args.length > 1 || args.some((a) => !["--write", "--check"].includes(a)))
    throw new Error(
      "Use --check (default) or --write after reviewing source changes",
    );
  if (args.includes("--write")) {
    for (const [name, value] of Object.entries(buildIndex()))
      writeFileSync(
        resolve(root, ".agent/index", name),
        await format(JSON.stringify(value), {
          ...(await resolveConfig(root)),
          parser: "json",
        }),
      );
    console.log(
      "Index refreshed; review generated diff. This is not verification evidence.",
    );
  } else {
    const errors = checkIndex();
    errors.forEach((error) => console.error(error));
    process.exitCode = errors.length ? 1 : 0;
  }
}
