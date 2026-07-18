import { describe, expect, it, vi } from "vitest";
import { GutendexPublicDomainProvider } from "./gutendex-provider.js";

describe("GutendexPublicDomainProvider", () => {
  it("searches through the same-origin server proxy", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ books: [
      { providerId: "gutenberg-1", title: "Jane Eyre", author: "Brontë, Charlotte",
        language: "English", description: "A governess tells her story." }
    ] }), { status: 200 }));
    const provider = new GutendexPublicDomainProvider("https://worker.example.test/public-domain", fetcher);
    const books = await provider.search("jane");
    expect(books).toEqual([expect.objectContaining({ title: "Jane Eyre", language: "English" })]);
    expect(fetcher).toHaveBeenCalledWith(
      "https://worker.example.test/public-domain/search?q=jane",
      expect.objectContaining({ method: "GET", signal: expect.any(AbortSignal) })
    );
  });

  it("downloads only the server-verified plain text", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ text: "CHAPTER I\nStory." }), { status: 200 }));
    const provider = new GutendexPublicDomainProvider("/public-domain", fetcher);
    const text = await provider.downloadText({ providerId: "gutenberg-1", title: "Test", author: "A",
      language: "English", description: "" });
    expect(text).toBe("CHAPTER I\nStory.");
    expect(fetcher).toHaveBeenCalledWith("/public-domain/text", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ providerId: "gutenberg-1" })
    }));
  });
});
