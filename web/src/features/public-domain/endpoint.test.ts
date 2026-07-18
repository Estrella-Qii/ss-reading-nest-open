import { afterEach, describe, expect, it } from "vitest";
import { derivePublicDomainEndpointBase } from "./endpoint.js";

describe("derivePublicDomainEndpointBase", () => {
  afterEach(() => document.querySelector('meta[name="ss-worker-origin"]')?.remove());

  it("uses the Worker origin injected into ChatGPT's embedded resource", () => {
    const meta = document.createElement("meta");
    meta.name = "ss-worker-origin";
    meta.content = "https://reading-nest.example.workers.dev";
    document.head.append(meta);

    expect(derivePublicDomainEndpointBase()).toBe(
      "https://reading-nest.example.workers.dev/public-domain"
    );
  });

  it("keeps the local same-origin fallback when no trusted origin is injected", () => {
    expect(derivePublicDomainEndpointBase()).toBe("/public-domain");
  });
});
