import { describe, expect, it } from "vitest";
import { getWorkerRoute } from "./worker-router.js";

describe("getWorkerRoute", () => {
  it("keeps health public without exposing the token", () => {
    expect(getWorkerRoute(new URL("https://example.workers.dev/health"), "secret")).toBe("health");
  });

  it("keeps the read-only public-domain proxy independent from the private MCP token", () => {
    expect(getWorkerRoute(new URL("https://example.workers.dev/public-domain/search?q=Austen"), undefined))
      .toBe("public-domain");
    expect(getWorkerRoute(new URL("https://example.workers.dev/public-domain/text"), "secret"))
      .toBe("public-domain");
  });

  it("accepts only the exact private MCP path", () => {
    expect(getWorkerRoute(new URL("https://example.workers.dev/mcp/secret"), "secret")).toBe("mcp");
    expect(getWorkerRoute(new URL("https://example.workers.dev/mcp/wrong"), "secret")).toBe("not-found");
    expect(getWorkerRoute(new URL("https://example.workers.dev/mcp"), "secret")).toBe("not-found");
  });

  it("routes only exact private source paths", () => {
    expect(getWorkerRoute(new URL("https://example.workers.dev/source/secret/upload"), "secret")).toBe("source");
    expect(getWorkerRoute(new URL("https://example.workers.dev/source/secret/restore"), "secret")).toBe("source");
    expect(getWorkerRoute(new URL("https://example.workers.dev/source/wrong/upload"), "secret")).toBe("not-found");
    expect(getWorkerRoute(new URL("https://example.workers.dev/source/secret"), "secret")).toBe("not-found");
  });

  it("keeps missing token and health behavior unchanged", () => {
    expect(getWorkerRoute(new URL("https://example.workers.dev/source/secret/upload"), undefined)).toBe("misconfigured");
    expect(getWorkerRoute(new URL("https://example.workers.dev/health"), undefined)).toBe("health");
  });
});
