import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  readCapabilities,
  allowedTools,
  callCapability,
} from "./capabilities.mjs";
import { recordActivity } from "./lifecycle.mjs";

export function createMcpHandler(
  role,
  registry,
  fetcher = fetch,
  observe = () => {},
) {
  allowedTools(role, registry);
  let initialized = false;
  return async (request) => {
    if (
      !request ||
      request.jsonrpc !== "2.0" ||
      typeof request.method !== "string"
    )
      return {
        jsonrpc: "2.0",
        id: request?.id ?? null,
        error: { code: -32600, message: "Invalid request" },
      };
    if (request.id === undefined) return null;
    const reply = (result) => ({ jsonrpc: "2.0", id: request.id, result });
    if (request.method === "initialize") {
      initialized = true;
      return reply({
        protocolVersion: "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: {
          name: "jobradar-readonly-capabilities",
          version: "1.0.0",
        },
      });
    }
    if (!initialized)
      return {
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32002, message: "Initialize first" },
      };
    if (request.method === "ping") return reply({});
    if (request.method === "tools/list")
      return reply({ tools: allowedTools(role, registry) });
    if (request.method === "tools/call") {
      const started = Date.now();
      const name = request.params?.name;
      const tool = [
        "read_official_docs",
        "repository_summary",
        "read_issue",
      ].includes(name)
        ? name
        : "unknown";
      try {
        const value = await callCapability(
          role,
          name,
          request.params?.arguments ?? {},
          registry,
          fetcher,
        );
        observe("capability_called", {
          role,
          tool,
          passed: true,
          duration_ms: Date.now() - started,
        });
        return reply({
          content: [{ type: "text", text: JSON.stringify(value) }],
        });
      } catch {
        observe("capability_called", {
          role,
          tool,
          passed: false,
          duration_ms: Date.now() - started,
        });
        return reply({
          isError: true,
          content: [
            {
              type: "text",
              text: "Capability call failed: check role, configuration, arguments and upstream availability. No write was attempted.",
            },
          ],
        });
      }
    }
    return {
      jsonrpc: "2.0",
      id: request.id,
      error: { code: -32601, message: "Method not found" },
    };
  };
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const role = process.argv[2] ?? "implementer";
  const handler = createMcpHandler(
    role,
    readCapabilities(),
    fetch,
    recordActivity,
  );
  let buffer = "";
  let queue = Promise.resolve();
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (chunk) => {
    buffer += chunk;
    if (Buffer.byteLength(buffer) > 1000000) {
      process.stderr.write("MCP input exceeds limit\n");
      process.exitCode = 1;
      process.stdin.destroy();
      return;
    }
    let at;
    while ((at = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, at);
      buffer = buffer.slice(at + 1);
      queue = queue.then(async () => {
        let response;
        try {
          response = await handler(JSON.parse(line));
        } catch {
          response = {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          };
        }
        if (response) process.stdout.write(JSON.stringify(response) + "\n");
      });
    }
  });
}
