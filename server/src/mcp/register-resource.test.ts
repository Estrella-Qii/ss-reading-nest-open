import { describe, expect, it, vi } from "vitest";

const registerAppResource = vi.fn();

vi.mock("@modelcontextprotocol/ext-apps/server", () => ({
  RESOURCE_MIME_TYPE: "text/html;profile=mcp-app",
  registerAppResource
}));

describe("registerReadingResource", () => {
  it("uses a versioned app resource with same-origin connections and ChatGPT compatibility metadata", async () => {
    const { registerReadingResource } = await import("./register-resource.js");
    const { READING_NEST_URI } = await import("./register-tools.js");

    registerReadingResource({} as never, "<html></html>", "https://reading-nest.example.workers.dev");
    const [, , uri, descriptor, loader] = registerAppResource.mock.calls[0];

    expect(READING_NEST_URI).toBe("ui://widget/reading-nest-v4.html");
    expect(uri).toBe(READING_NEST_URI);
    expect(descriptor._meta.ui.csp.connectDomains).toContain(
      "https://reading-nest.example.workers.dev"
    );
    expect(descriptor._meta.ui.csp.resourceDomains).toContain(
      "https://reading-nest.example.workers.dev"
    );
    expect(descriptor._meta["openai/widgetCSP"].connect_domains).toContain(
      "https://reading-nest.example.workers.dev"
    );
    expect(descriptor._meta.ui.domain).toBe("https://reading-nest.example.workers.dev");
    expect(descriptor._meta["openai/widgetDomain"]).toBe("https://reading-nest.example.workers.dev");
    expect(descriptor._meta.ui.csp.connectDomains).not.toContain("https://gutendex.com");

    const loaded = await loader();
    expect(loaded.contents[0].uri).toBe(READING_NEST_URI);
    expect(loaded.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    expect(loaded.contents[0].text).toContain("<html></html>");
    expect(loaded.contents[0]._meta.ui.csp.connectDomains).toContain(
      "https://reading-nest.example.workers.dev"
    );
    expect(loaded.contents[0]._meta["openai/widgetCSP"].connect_domains).toContain(
      "https://reading-nest.example.workers.dev"
    );
  });
});
