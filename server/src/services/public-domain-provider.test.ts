import { describe, expect, it, vi } from "vitest";
import { GutendexCatalogProvider, PublicDomainProviderError } from "./public-domain-provider.js";

const verifiedBook = {
  id: 1342,
  title: "Pride and Prejudice",
  authors: [{ name: "Austen, Jane" }],
  translators: [],
  summaries: ["A novel of manners."],
  subjects: [],
  languages: ["en"],
  copyright: false,
  formats: {
    "text/plain; charset=utf-8": "https://www.gutenberg.org/ebooks/1342.txt.utf-8",
    "image/jpeg": "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg"
  }
};

describe("GutendexCatalogProvider", () => {
  it("returns only confirmed untranslated English public-domain texts", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ results: [
      verifiedBook,
      { ...verifiedBook, id: 2, translators: [{ name: "Translator" }] },
      { ...verifiedBook, id: 3, copyright: null }
    ] }), { status: 200 }));
    const provider = new GutendexCatalogProvider(fetcher, "https://gutendex.test");

    await expect(provider.search("Austen")).resolves.toEqual([
      expect.objectContaining({ providerId: "gutenberg-1342", title: "Pride and Prejudice" })
    ]);
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringMatching(/copyright=false.*search=Austen/),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("rechecks rights metadata before downloading and strips Gutenberg boilerplate", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(verifiedBook), { status: 200 }))
      .mockResolvedValueOnce(new Response(
        "Header\n*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\nCHAPTER I\nStory.\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\nFooter",
        { status: 200 }
      ));
    const provider = new GutendexCatalogProvider(fetcher, "https://gutendex.test");

    await expect(provider.downloadVerifiedText("gutenberg-1342")).resolves.toBe("CHAPTER I\nStory.");
    expect(fetcher).toHaveBeenNthCalledWith(
      2,
      "https://www.gutenberg.org/ebooks/1342.txt.utf-8",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("refuses a work whose public-domain status cannot be confirmed", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ...verifiedBook, copyright: null }),
      { status: 200 }
    ));
    const provider = new GutendexCatalogProvider(fetcher, "https://gutendex.test");

    await expect(provider.downloadVerifiedText("gutenberg-1342")).rejects.toMatchObject<PublicDomainProviderError>({
      code: "NOT_CONFIRMED_PUBLIC_DOMAIN"
    });
  });
});
