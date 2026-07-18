export function derivePublicDomainEndpointBase(doc: Document | undefined = globalThis.document): string {
  const workerOrigin = doc?.querySelector<HTMLMetaElement>('meta[name="ss-worker-origin"]')?.content.trim();
  if (!workerOrigin) return "/public-domain";
  try {
    const url = new URL(workerOrigin);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "/public-domain";
    return `${url.origin}/public-domain`;
  } catch {
    return "/public-domain";
  }
}
