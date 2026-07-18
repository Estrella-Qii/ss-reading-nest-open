import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { JsonReadingRepository } from "../repositories/json-reading-repository.js";
import { createMcpServerFromRepository } from "./server-factory.js";

const widgetPath = fileURLToPath(new URL("../../../web/dist/index.html", import.meta.url));

export async function createMcpServer(
  dataFile = resolve("data", "sessions.json"),
  options: { publicDomainEndpointBase?: string; workerOrigin?: string } = {}
) {
  const widgetHtml = await readWidgetHtml();
  return createMcpServerFromRepository(new JsonReadingRepository(dataFile), widgetHtml, undefined, options);
}

async function readWidgetHtml() {
  try {
    return await readFile(widgetPath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    return "<!doctype html><html><body><main>Build web first to load the reading nest UI.</main></body></html>";
  }
}
