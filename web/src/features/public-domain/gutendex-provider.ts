import type { PublicDomainBook, PublicDomainBookProvider } from "./provider.js";

const SEARCH_TIMEOUT_MS = 10_000;
const DOWNLOAD_TIMEOUT_MS = 25_000;

export class GutendexPublicDomainProvider implements PublicDomainBookProvider {
  readonly id = "gutendex";

  constructor(
    private readonly endpointBase = "/public-domain",
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async search(query: string): Promise<PublicDomainBook[]> {
    const response = await this.request(
      `${this.endpointBase}/search?q=${encodeURIComponent(query.trim())}`,
      { method: "GET" },
      SEARCH_TIMEOUT_MS
    );
    const payload = (await response.json()) as { books?: unknown };
    if (!Array.isArray(payload.books)) throw new Error("PUBLIC_DOMAIN_INVALID_RESPONSE");
    return payload.books as PublicDomainBook[];
  }

  async downloadText(book: PublicDomainBook): Promise<string> {
    const response = await this.request(
      `${this.endpointBase}/text`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId: book.providerId })
      },
      DOWNLOAD_TIMEOUT_MS
    );
    const payload = (await response.json()) as { text?: unknown };
    if (typeof payload.text !== "string" || !payload.text.trim()) {
      throw new Error("PUBLIC_DOMAIN_INVALID_TEXT");
    }
    return payload.text;
  }

  private async request(url: string, init: RequestInit, timeoutMs: number) {
    let response: Response;
    try {
      response = await this.fetcher(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
    } catch (error) {
      if (error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
        throw new Error("PUBLIC_DOMAIN_TIMEOUT");
      }
      throw new Error("PUBLIC_DOMAIN_NETWORK_FAILED");
    }
    if (!response.ok) {
      const code = response.status === 504 ? "PUBLIC_DOMAIN_TIMEOUT" : "PUBLIC_DOMAIN_REQUEST_FAILED";
      throw new Error(code);
    }
    return response;
  }
}
