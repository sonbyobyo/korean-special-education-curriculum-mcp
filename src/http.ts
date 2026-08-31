import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { createMcpHandler, type McpServer } from "@modelcontextprotocol/server";

const MCP_PATH = "/mcp";
const HEALTH_PATH = "/healthz";

interface RateLimitEntry {
  count: number;
  windowStartedAt: number;
}

class FixedWindowRateLimiter {
  private readonly entries = new Map<string, RateLimitEntry>();

  constructor(
    private readonly maxRequests: number,
    private readonly windowMs = 60_000
  ) {}

  allows(key: string, now = Date.now()): boolean {
    const existing = this.entries.get(key);
    if (!existing || now - existing.windowStartedAt >= this.windowMs) {
      this.entries.set(key, { count: 1, windowStartedAt: now });
      return true;
    }
    if (existing.count >= this.maxRequests) return false;
    existing.count += 1;
    return true;
  }
}

function rateLimitPerMinute(): number {
  const configured = Number(process.env.MCP_RATE_LIMIT_PER_MINUTE ?? "120");
  if (!Number.isInteger(configured) || configured < 1 || configured > 10_000) {
    throw new Error("MCP_RATE_LIMIT_PER_MINUTE must be an integer between 1 and 10000.");
  }
  return configured;
}

function clientKey(request: IncomingMessage): string {
  const forwarded = request.headers["x-forwarded-for"];
  const candidate = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return candidate?.split(",", 1)[0]?.trim() || request.socket.remoteAddress || "unknown";
}

function requestUrl(request: IncomingMessage): URL {
  const host = request.headers.host ?? "localhost";
  return new URL(request.url ?? "/", `http://${host}`);
}

function requestHeaders(request: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "undefined") continue;
    if (Array.isArray(value)) {
      for (const item of value) headers.append(name, item);
    } else {
      headers.set(name, value);
    }
  }
  return headers;
}

function toWebRequest(request: IncomingMessage): Request {
  const method = request.method ?? "GET";
  const body = method === "GET" || method === "HEAD" ? undefined : Readable.toWeb(request);
  const init = {
    method,
    headers: requestHeaders(request),
    // `Readable.toWeb` exposes Node's stream declaration while Request expects
    // the compatible DOM declaration. They are the same runtime Web Stream.
    body: body as unknown as BodyInit | undefined,
    // Node requires this when a ReadableStream is used for a request body.
    duplex: "half"
  };
  return new Request(requestUrl(request), init as RequestInit);
}

function sendResponse(response: ServerResponse, result: Response): void {
  response.statusCode = result.status;
  response.statusMessage = result.statusText;
  result.headers.forEach((value, name) => response.setHeader(name, value));

  if (!result.body) {
    response.end();
    return;
  }

  Readable.fromWeb(result.body as unknown as NodeReadableStream)
    .on("error", (error: Error) => response.destroy(error))
    .pipe(response);
}

export interface HttpServerOptions {
  port?: number;
  host?: string;
}

/**
 * Starts a stateless Streamable HTTP endpoint suitable for remote MCP clients.
 * The handler also accepts the legacy stateless protocol for broad client compatibility.
 */
export async function startHttpServer(
  createMcpServer: () => McpServer,
  options: HttpServerOptions = {}
): Promise<void> {
  const handler = createMcpHandler(createMcpServer, {
    legacy: "stateless",
    onerror: (error) => process.stderr.write(`[mcp:http] ${error.message}\n`)
  });
  const port = options.port ?? Number(process.env.PORT ?? "8080");
  const host = options.host ?? process.env.HOST ?? "0.0.0.0";
  const rateLimiter = new FixedWindowRateLimiter(rateLimitPerMinute());

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535; received ${String(port)}.`);
  }

  const server = createHttpServer((request, response) => {
    void (async () => {
      const pathname = requestUrl(request).pathname;
      if (request.method === "GET" && pathname === HEALTH_PATH) {
        response.writeHead(200, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ status: "ok" }));
        return;
      }
      if (pathname !== MCP_PATH) {
        response.writeHead(404, { "content-type": "application/json; charset=utf-8" });
        response.end(JSON.stringify({ error: "Not found. Use /mcp." }));
        return;
      }
      if (!rateLimiter.allows(clientKey(request))) {
        response.writeHead(429, {
          "content-type": "application/json; charset=utf-8",
          "retry-after": "60"
        });
        response.end(JSON.stringify({ error: "Too many requests. Retry in one minute." }));
        return;
      }

      try {
        sendResponse(response, await handler.fetch(toWebRequest(request)));
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unexpected server error";
        process.stderr.write(`[mcp:http] ${message}\n`);
        if (!response.headersSent) {
          response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
        }
        response.end(JSON.stringify({ error: "Internal server error" }));
      }
    })();
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
  process.stderr.write(`[mcp:http] listening on http://${host}:${port}${MCP_PATH}\n`);

  let shuttingDown = false;
  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    void handler.close().finally(() => server.close());
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
