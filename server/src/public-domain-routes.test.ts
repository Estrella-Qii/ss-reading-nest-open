import { describe, expect, it, vi } from "vitest";
import { handlePublicDomainRoute } from "./public-domain-routes.js";

describe("public-domain proxy routes", () => {
  it("returns CORS-safe search results without exposing a third-party text URL", async () => {
    const provider = {
      id: "test",
      search: vi.fn().mockResolvedValue([{ providerId: "gutenberg-1", title: "Book", author: "A",
        language: "English", description: "Public-domain original." }]),
      downloadVerifiedText: vi.fn()
    };
    const response = await handlePublicDomainRoute(
      new Request("https://worker.test/public-domain/search?q=Book"),
      provider
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(await response.json()).toEqual({ books: [expect.objectContaining({ providerId: "gutenberg-1" })] });
    expect(JSON.stringify(await provider.search.mock.results[0]?.value)).not.toMatch(/textUrl|gutenberg\.org/);
  });

  it("returns verified text through the server endpoint", async () => {
    const provider = {
      id: "test",
      search: vi.fn(),
      downloadVerifiedText: vi.fn().mockResolvedValue("CHAPTER I\nStory.")
    };
    const response = await handlePublicDomainRoute(
      new Request("https://worker.test/public-domain/text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: "gutenberg-1" })
      }),
      provider
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ text: "CHAPTER I\nStory." });
    expect(provider.downloadVerifiedText).toHaveBeenCalledWith("gutenberg-1");
  });
});
