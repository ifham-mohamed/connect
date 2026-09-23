export class RequestBodyError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 413 | 415,
  ) {
    super(message);
  }
}

export async function readJsonBody(request: Request, maxBytes: number) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("application/json"))
    throw new RequestBodyError("Content-Type must be application/json.", 415);
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes)
    throw new RequestBodyError("Request is too large.", 413);
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes)
    throw new RequestBodyError("Request is too large.", 413);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new RequestBodyError("Request body must be valid JSON.", 400);
  }
}
