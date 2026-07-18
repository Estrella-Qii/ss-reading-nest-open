import type { Request as ExpressRequest, Response as ExpressResponse } from "express";
import {
  GutendexCatalogProvider,
  PublicDomainProviderError,
  type PublicDomainCatalogProvider
} from "./services/public-domain-provider.js";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type"
};

export function registerPublicDomainRoutes(
  app: { get: Function; post: Function; options: Function },
  provider: PublicDomainCatalogProvider = new GutendexCatalogProvider()
) {
  app.options("/public-domain/*path", (_request: ExpressRequest, response: ExpressResponse) => {
    response.set(corsHeaders).status(204).send();
  });
  app.get("/public-domain/search", async (request: ExpressRequest, response: ExpressResponse) => {
    const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
    if (!query || query.length > 200) return response.set(corsHeaders).status(400).json({ error: "INVALID_QUERY" });
    try {
      return response.set(corsHeaders).json({ books: await provider.search(query) });
    } catch (error) {
      const mapped = mapProviderError(error);
      return response.set(corsHeaders).status(mapped.status).json({ error: mapped.code });
    }
  });
  app.post("/public-domain/text", async (request: ExpressRequest, response: ExpressResponse) => {
    const providerId = typeof request.body?.providerId === "string" ? request.body.providerId : "";
    try {
      return response.set(corsHeaders).json({ text: await provider.downloadVerifiedText(providerId) });
    } catch (error) {
      const mapped = mapProviderError(error);
      return response.set(corsHeaders).status(mapped.status).json({ error: mapped.code });
    }
  });
}

export async function handlePublicDomainRoute(
  request: Request,
  provider: PublicDomainCatalogProvider = new GutendexCatalogProvider()
): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  const url = new URL(request.url);
  try {
    if (request.method === "GET" && url.pathname === "/public-domain/search") {
      const query = url.searchParams.get("q")?.trim() ?? "";
      if (!query || query.length > 200) return json({ error: "INVALID_QUERY" }, 400);
      return json({ books: await provider.search(query) });
    }
    if (request.method === "POST" && url.pathname === "/public-domain/text") {
      const body = (await request.json()) as { providerId?: unknown };
      const providerId = typeof body.providerId === "string" ? body.providerId : "";
      return json({ text: await provider.downloadVerifiedText(providerId) });
    }
    return json({ error: "NOT_FOUND" }, 404);
  } catch (error) {
    const mapped = mapProviderError(error);
    return json({ error: mapped.code }, mapped.status);
  }
}

function mapProviderError(error: unknown) {
  if (!(error instanceof PublicDomainProviderError)) return { status: 502, code: "PUBLIC_DOMAIN_UPSTREAM_FAILED" };
  if (error.code === "INVALID_BOOK_ID") return { status: 400, code: error.code };
  if (error.code === "NOT_CONFIRMED_PUBLIC_DOMAIN") return { status: 422, code: error.code };
  if (error.code === "TEXT_TOO_LARGE") return { status: 413, code: error.code };
  if (error.code === "UPSTREAM_TIMEOUT") return { status: 504, code: error.code };
  return { status: 502, code: error.code };
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}
