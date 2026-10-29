import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { requestJson } from "./request";

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.url === "/unavailable") {
      response.writeHead(503).end('{"error":"unavailable"}');
    } else if (request.url === "/invalid") {
      response.end("invalid JSON");
    } else if (request.url === "/slow") {
      response.flushHeaders();
      // Headers succeed, but the body never finishes: the deadline must cover both.
      response.write('{"value":');
    } else {
      response.end('{"value":42}');
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Expected local TCP server");
  origin = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("bounded JSON requests", () => {
  it("returns a successful parsed response", async () => {
    await expect(requestJson(`${origin}/ok`)).resolves.toEqual({ value: 42 });
  });

  it("rejects HTTP errors instead of accepting error JSON as data", async () => {
    await expect(requestJson(`${origin}/unavailable`)).rejects.toThrow();
  });

  it("rejects invalid JSON instead of treating it as an empty result", async () => {
    await expect(requestJson(`${origin}/invalid`)).rejects.toThrow();
  });

  it("ends a request whose response body never finishes", async () => {
    await expect(requestJson(`${origin}/slow`, {}, 40)).rejects.toThrow();
    await expect(requestJson(`${origin}/ok`)).resolves.toEqual({ value: 42 });
  });

  it("honors caller cancellation", async () => {
    const controller = new AbortController();
    const result = requestJson(`${origin}/slow`, { signal: controller.signal });
    const rejection = expect(result).rejects.toThrow();
    controller.abort();
    await rejection;
  });
});
