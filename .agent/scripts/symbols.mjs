import ts from "typescript";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { root, safePath } from "./context-check.mjs";

export function findSymbol(path, line, column, directory = root) {
  if (!/^(src|tests|scripts)\/.*\.[cm]?tsx?$/.test(path))
    throw new Error("Select a repository TypeScript source file");
  if (![line, column].every((n) => Number.isInteger(n) && n > 0))
    throw new Error("Line and column are one-based positive integers");
  const file = safePath(directory, path);
  const config = ts.readConfigFile(
    resolve(directory, "tsconfig.json"),
    ts.sys.readFile,
  );
  const parsed = ts.parseJsonConfigFileContent(
    config.config,
    ts.sys,
    directory,
  );
  const host = {
    getScriptFileNames: () => parsed.fileNames,
    getScriptVersion: () => "0",
    getScriptSnapshot: (p) => {
      const text = ts.sys.readFile(p);
      return text === undefined
        ? undefined
        : ts.ScriptSnapshot.fromString(text);
    },
    getCurrentDirectory: () => directory,
    getCompilationSettings: () => parsed.options,
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
  };
  const service = ts.createLanguageService(host);
  try {
    const source = service.getProgram()?.getSourceFile(file);
    if (!source || line > source.getLineStarts().length)
      throw new Error("Source position does not exist");
    const starts = source.getLineStarts();
    const position = starts[line - 1] + column - 1;
    if (position >= (starts[line] ?? source.text.length))
      throw new Error("Column lies outside the selected line");
    const display = (entry) => ({
      path: relative(directory, entry.fileName).replaceAll("\\", "/"),
      start: entry.textSpan.start,
      length: entry.textSpan.length,
    });
    return {
      engine: "TypeScript Language Service",
      definitions: (service.getDefinitionAtPosition(file, position) ?? []).map(
        display,
      ),
      references: (service.getReferencesAtPosition(file, position) ?? []).map(
        display,
      ),
    };
  } finally {
    service.dispose();
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(
      findSymbol(
        process.argv[2],
        Number(process.argv[3]),
        Number(process.argv[4]),
      ),
      null,
      2,
    ),
  );
