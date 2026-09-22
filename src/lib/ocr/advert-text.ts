export function normalizeAdvertText(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/[\t\u00a0]+/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => line || (index > 0 && lines[index - 1]))
    .join("\n")
    .trim()
    .slice(0, 30_000);
}

export function validAdvertImage(file: File) {
  return (
    file.type.startsWith("image/") && file.size > 0 && file.size <= 10_000_000
  );
}
