import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { registerReadingResource } from "./register-resource.js";
import {
  READING_NEST_URI,
  registerReadingTools
} from "./register-tools.js";

describe("MCP App protocol binding", () => {
  it("exposes one matching executable resource from tools/list through resources/read", async () => {
    const server = new McpServer({ name: "reading-nest-binding-test", version: "1.0.0" });
    const service = {
      listAllSessions: async () => [],
      getSessionBundle: async () => {
        throw new Error("No sessions are expected in this test");
      }
    };
    const widgetHtml =
      "<!doctype html><html><head></head><body><div id=\"root\"></div><script type=\"module\">document.querySelector('#root').textContent='ready';</script></body></html>";

    registerReadingResource(server, widgetHtml, "https://ss-reading-nest.3176445534.workers.dev");
    registerReadingTools(server, service as never, undefined, {
      sourceEndpointBase: "https://ss-reading-nest.3176445534.workers.dev/source/redacted",
      publicDomainEndpointBase: "https://ss-reading-nest.3176445534.workers.dev/public-domain"
    });

    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "reading-nest-inspector-test", version: "1.0.0" });

    try {
      await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

      const tools = await client.listTools();
      const openTool = tools.tools.find((tool) => tool.name === "open_reading_nest");
      expect(openTool?._meta?.ui).toEqual({ resourceUri: READING_NEST_URI });
      expect(openTool?._meta?.["openai/outputTemplate"]).toBe(READING_NEST_URI);
      expect(openTool?._meta?.["ui/resourceUri"]).toBe(READING_NEST_URI);

      const resources = await client.listResources();
      expect(resources.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            uri: READING_NEST_URI,
            mimeType: "text/html;profile=mcp-app"
          })
        ])
      );

      const resource = await client.readResource({ uri: READING_NEST_URI });
      expect(resource.contents[0]).toMatchObject({
        uri: READING_NEST_URI,
        mimeType: "text/html;profile=mcp-app"
      });
      expect(resource.contents[0]).toHaveProperty("text", expect.stringContaining("<script"));

      const result = await client.callTool({ name: "open_reading_nest", arguments: {} });
      expect(result.structuredContent).toMatchObject({
        bookshelfSessions: [],
        recentSessions: [],
        publicDomainEndpointBase: "https://ss-reading-nest.3176445534.workers.dev/public-domain"
      });
      expect(result.content).toEqual(
        expect.arrayContaining([expect.objectContaining({ type: "text" })])
      );
    } finally {
      await client.close();
      await server.close();
    }
  });
});
