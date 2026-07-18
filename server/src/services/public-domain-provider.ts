export interface PublicDomainCatalogBook {
  providerId: string;
  title: string;
  author: string;
  language: string;
  description: string;
  coverUrl?: string;
}

export interface PublicDomainCatalogProvider {
  readonly id: string;
  search(query: string): Promise<PublicDomainCatalogBook[]>;
  downloadVerifiedText(providerId: string): Promise<string>;
}

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
const SEARCH_TIMEOUT_MS = 15_000;
const DOWNLOAD_TIMEOUT_MS = 20_000;

export class PublicDomainProviderError extends Error {
  constructor(
    readonly code:
      | "INVALID_BOOK_ID"
      | "NOT_CONFIRMED_PUBLIC_DOMAIN"
      | "UPSTREAM_FAILED"
      | "UPSTREAM_TIMEOUT"
      | "TEXT_TOO_LARGE",
    message: string
  ) {
    super(message);
  }
}

export class GutendexCatalogProvider implements PublicDomainCatalogProvider {
  readonly id = "gutendex";

  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly baseUrl = "https://gutendex.com"
  ) {}

  async search(query: string): Promise<PublicDomainCatalogBook[]> {
    // Gutendex's combined search filters can be substantially slower than its
    // plain search endpoint. Rights, language, translation and text-format
    // eligibility are still enforced below for every returned book.
    const search = new URLSearchParams({ search: query.trim() });
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/books/?${search.toString()}`,
      SEARCH_TIMEOUT_MS
    );
    if (!response.ok) throw new PublicDomainProviderError("UPSTREAM_FAILED", "Gutendex search failed");
    const payload = (await response.json()) as GutendexResponse;
    return (payload.results ?? [])
      .filter(isVerifiedEnglishOriginal)
      .map(toPublicDomainBook)
      .filter((book): book is PublicDomainCatalogBook => Boolean(book));
  }

  async downloadVerifiedText(providerId: string): Promise<string> {
    const match = /^gutenberg-(\d+)$/.exec(providerId);
    if (!match) throw new PublicDomainProviderError("INVALID_BOOK_ID", "Invalid Gutenberg book id");
    const metadataResponse = await this.fetchWithTimeout(
      `${this.baseUrl}/books/${match[1]}/`,
      SEARCH_TIMEOUT_MS
    );
    if (!metadataResponse.ok) throw new PublicDomainProviderError("UPSTREAM_FAILED", "Gutendex metadata failed");
    const book = (await metadataResponse.json()) as GutendexBook;
    if (!isVerifiedEnglishOriginal(book)) {
      throw new PublicDomainProviderError(
        "NOT_CONFIRMED_PUBLIC_DOMAIN",
        "The work is not confirmed as an untranslated English public-domain text"
      );
    }
    const textUrl = preferredPlainText(book.formats);
    if (!textUrl) throw new PublicDomainProviderError("UPSTREAM_FAILED", "No HTTPS plain-text source");
    let response = await this.fetchWithTimeout(textUrl, DOWNLOAD_TIMEOUT_MS);
    if (!response.ok) {
      console.error(JSON.stringify({
        message: "Gutenberg text download failed",
        upstream: new URL(response.url || textUrl).origin,
        status: response.status
      }));
      const fallbackUrl = verifiedGutenbergTextProxyUrl(textUrl);
      if (!fallbackUrl) {
        throw new PublicDomainProviderError("UPSTREAM_FAILED", "Gutenberg text download failed");
      }
      response = await this.fetchWithTimeout(fallbackUrl, DOWNLOAD_TIMEOUT_MS);
      if (!response.ok) {
        throw new PublicDomainProviderError("UPSTREAM_FAILED", "Gutenberg text proxy failed");
      }
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_PUBLIC_DOMAIN_TEXT_BYTES) {
      throw new PublicDomainProviderError("TEXT_TOO_LARGE", "Public-domain text is too large");
    }
    const source = await response.text();
    if (new TextEncoder().encode(source).byteLength > MAX_PUBLIC_DOMAIN_TEXT_BYTES) {
      throw new PublicDomainProviderError("TEXT_TOO_LARGE", "Public-domain text is too large");
    }
    return stripGutenbergBoilerplate(source);
  }

  private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await this.fetcher.call(globalThis, url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          accept: "application/json, text/plain;q=0.9, */*;q=0.8",
          "user-agent": "ss-reading-nest/0.2 (private public-domain reader)"
        }
      });
    } catch (error) {
      if (controller.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        throw new PublicDomainProviderError("UPSTREAM_TIMEOUT", "Public-domain provider timed out");
      }
      console.error(JSON.stringify({
        message: "Public-domain provider request failed",
        upstream: new URL(url).origin,
        errorName: error instanceof Error ? error.name : "UnknownError",
        errorMessage: error instanceof Error ? error.message : "Unknown failure"
      }));
      throw new PublicDomainProviderError("UPSTREAM_FAILED", "Public-domain provider request failed");
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isVerifiedEnglishOriginal(book: GutendexBook) {
  return book.copyright === false && book.languages.includes("en") && book.translators.length === 0;
}

function toPublicDomainBook(book: GutendexBook): PublicDomainCatalogBook | null {
  if (!preferredPlainText(book.formats)) return null;
  return {
    providerId: `gutenberg-${book.id}`,
    title: book.title,
    author: book.authors.map((author) => author.name).join(", ") || "Unknown",
    language: "English",
    description: book.summaries?.[0] ?? book.subjects?.slice(0, 3).join(" · ") ?? "",
    ...(book.formats["image/jpeg"] ? { coverUrl: book.formats["image/jpeg"] } : {})
  };
}

function preferredPlainText(formats: Record<string, string>): string | undefined {
  return Object.entries(formats)
    .filter(([mime, url]) => mime.startsWith("text/plain") && /^https:\/\//.test(url))
    .sort(([left], [right]) => Number(right.includes("utf-8")) - Number(left.includes("utf-8")))
    .map(([, url]) => url)[0];
}

function verifiedGutenbergTextProxyUrl(source: string): string | undefined {
  const url = new URL(source);
  if (url.protocol !== "https:" || !/(^|\.)gutenberg\.org$/i.test(url.hostname)) return undefined;
  return `https://r.jina.ai/http://${url.host}${url.pathname}${url.search}`;
}

export function stripGutenbergBoilerplate(source: string): string {
  const normalized = source.replace(/\r\n?/g, "\n");
  const start = normalized.search(/\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const end = normalized.search(/\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\*\*\*/i);
  const contentStart = start >= 0 ? normalized.indexOf("\n", start) + 1 : 0;
  const contentEnd = end > contentStart ? end : normalized.length;
  return normalized.slice(contentStart, contentEnd).trim();
}
