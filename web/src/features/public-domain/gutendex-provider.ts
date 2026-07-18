import type { PublicDomainBook, PublicDomainBookProvider } from "./provider.js";

type GutendexBook = {
  id: number;
  title: string;
  authors: Array<{ name: string }>;
  translators: Array<{ name: string }>;
  summaries?: string[];
  subjects?: string[];
  languages: string[];
  copyright: boolean | null;
  formats: Record<string, string>;
};

type GutendexResponse = { results?: GutendexBook[] };

const MAX_PUBLIC_DOMAIN_TEXT_BYTES = 8 * 1024 * 1024;

export class GutendexPublicDomainProvider implements PublicDomainBookProvider {
  readonly id = "gutendex";

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = "https://gutendex.com"
  ) {}

  async search(query: string): Promise<PublicDomainBook[]> {
    const search = new URLSearchParams({
      languages: "en",
      copyright: "false",
      mime_type: "text/plain",
      search: query.trim()
    });
    const response = await this.fetcher(`${this.baseUrl}/books?${search.toString()}`);
    if (!response.ok) throw new Error("PUBLIC_DOMAIN_SEARCH_FAILED");
    const payload = (await response.json()) as GutendexResponse;
    return (payload.results ?? [])
      .filter(
        (book) =>
          book.copyright === false &&
          book.languages.includes("en") &&
          book.translators.length === 0
      )
      .map(toPublicDomainBook)
      .filter((book): book is PublicDomainBook => Boolean(book));
  }

  async downloadText(book: PublicDomainBook): Promise<string> {
    const response = await this.fetcher(book.textUrl);
    if (!response.ok) throw new Error("PUBLIC_DOMAIN_DOWNLOAD_FAILED");
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PUBLIC_DOMAIN_TEXT_BYTES) throw new Error("PUBLIC_DOMAIN_TEXT_TOO_LARGE");
    const source = await response.text();
    if (new TextEncoder().encode(source).byteLength > MAX_PUBLIC_DOMAIN_TEXT_BYTES) {
      throw new Error("PUBLIC_DOMAIN_TEXT_TOO_LARGE");
    }
    return stripGutenbergBoilerplate(source);
  }
}

function toPublicDomainBook(book: GutendexBook): PublicDomainBook | null {
  const textUrl = preferredPlainText(book.formats);
  if (!textUrl) return null;
  return {
    providerId: `gutenberg-${book.id}`,
    title: book.title,
    author: book.authors.map((author) => author.name).join(", ") || "Unknown",
    language: "English",
    description: book.summaries?.[0] ?? book.subjects?.slice(0, 3).join(" · ") ?? "",
    ...(book.formats["image/jpeg"] ? { coverUrl: book.formats["image/jpeg"] } : {}),
    textUrl
  };
}

function preferredPlainText(formats: Record<string, string>): string | undefined {
  return Object.entries(formats)
    .filter(([mime, url]) => mime.startsWith("text/plain") && /^https:\/\//.test(url))
    .sort(([left], [right]) => Number(right.includes("utf-8")) - Number(left.includes("utf-8")))
    .map(([, url]) => url)[0];
}

export function stripGutenbergBoilerplate(source: string): string {
  const normalized = source.replace(/\r\n?/g, "\n");
  const start = normalized.search(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const end = normalized.search(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const contentStart = start >= 0 ? normalized.indexOf("\n", start) + 1 : 0;
  const contentEnd = end > contentStart ? end : normalized.length;
  return normalized.slice(contentStart, contentEnd).trim();
}
