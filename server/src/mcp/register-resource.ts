import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { READING_NEST_URI } from "./register-tools.js";

export function registerReadingResource(server: McpServer, widgetHtml: string, workerOrigin?: string) {
  const connectDomains = [
    workerOrigin ?? "http://localhost:8787",
    "https://gutendex.com",
    "https://www.gutenberg.org",
    "https://gutenberg.org"
  ];
  const resourceDomains = [
    "https://www.gutenberg.org",
    "https://gutenberg.org"
  ];
  const resourceCsp = {
    connectDomains,
    resourceDomains
  };
  const openaiWidgetCsp = {
    connect_domains: connectDomains,
    resource_domains: resourceDomains
  };
  registerAppResource(
    server,
    "和爸爸一起读",
    READING_NEST_URI,
    {
      description: "小辞与 Elias 的私人双人共读空间",
      _meta: {
        ui: {
          csp: resourceCsp,
          prefersBorder: true
        },
        "openai/widgetCSP": openaiWidgetCsp,
        "openai/widgetDescription":
          "一个安静、轻盈的私人共读空间，供小辞与 Elias 阅读私人导入的小说或漫画。"
      }
    },
    async () => {
      return {
        contents: [
          {
            uri: READING_NEST_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: widgetHtml,
            _meta: {
              ui: {
                csp: resourceCsp,
                prefersBorder: true
              },
              "openai/widgetCSP": openaiWidgetCsp,
              "openai/widgetDescription":
                "一个安静、轻盈的私人共读空间，供小辞与 Elias 阅读私人导入的小说或漫画。",
              "openai/widgetPrefersBorder": true
            }
          }
        ]
      };
    }
  );
}
