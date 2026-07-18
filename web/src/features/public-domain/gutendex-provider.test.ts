import { describe, expect, it, vi } from "vitest";
import { GutendexPublicDomainProvider } from "./gutendex-provider.js";

describe("GutendexPublicDomainProvider", () => {
  it("returns only English public-domain original texts", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
      { id: 1, title: "Jane Eyre", authors: [{ name: "Brontë, Charlotte" }], translators: [],
        summaries: ["A governess tells her story."], subjects: [], languages: ["en"], copyright: false,
        formats: { "text/plain; charset=utf-8": "https://example.test/1.txt", "image/jpeg": "https://example.test/1.jpg" } },
      { id: 2, title: "A modern translation", authors: [], translators: [{ name: "Translator" }],
        languages: ["en"], copyright: false, formats: { "text/plain": "https://example.test/2.txt" } },
      { id: 3, title: "Copyrighted", authors: [], translators: [], languages: ["en"], copyright: true,
        formats: { "text/plain": "https://example.test/3.txt" } }
    ] }), { status: 200 }));
    const provider = new GutendexPublicDomainProvider(fetcher, "https://example.test");
    const books = await provider.search("jane");
    expect(books).toEqual([expect.objectContaining({ title: "Jane Eyre", language: "English" })]);
    expect(fetcher).toHaveBeenCalledWith(expect.stringContaining("copyright=false"));
  });

  it("downloads plain text and removes Project Gutenberg boilerplate", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      "Header\n*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\nCHAPTER I\nStory.\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\nFooter",
      { status: 200 }
    ));
    const provider = new GutendexPublicDomainProvider(fetcher);
    const text = await provider.downloadText({ providerId: "gutenberg-1", title: "Test", author: "A",
      language: "English", description: "", textUrl: "https://example.test/1.txt" });
    expect(text).toBe("CHAPTER I\nStory.");
  });
});
