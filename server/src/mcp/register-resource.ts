import { registerAppResource, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { READING_NEST_URI } from "./register-tools.js";
import { buildRemoteWidgetHtml } from "./widget-assets.js";

export function registerReadingResource(server: McpServer, widgetHtml: string, workerOrigin?: string) {
  const connectDomains = [
    workerOrigin ?? "http://localhost:8787"
  ];
  const resourceDomains = [
    ...(workerOrigin?.startsWith("https://") ? [workerOrigin] : []),
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
  const widgetDomain = workerOrigin?.startsWith("https://") ? workerOrigin : undefined;
  const resourceHtml = widgetDomain
    ? buildRemoteWidgetHtml(widgetHtml, widgetDomain)
    : injectWorkerOrigin(widgetHtml);
  registerAppResource(
    server,
    "和爸爸一起读",
    READING_NEST_URI,
    {
      description: "小辞与 Elias 的私人双人共读空间",
      _meta: {
        ui: {
          csp: resourceCsp,
          prefersBorder: true,
          ...(widgetDomain ? { domain: widgetDomain } : {})
        },
        "openai/widgetCSP": openaiWidgetCsp,
        "openai/widgetDescription":
          "一个安静、轻盈的私人共读空间，供小辞与 Elias 阅读私人导入的小说或漫画。",
        ...(widgetDomain ? { "openai/widgetDomain": widgetDomain } : {})
      }
    },
    async () => {
      return {
        contents: [
          {
            uri: READING_NEST_URI,
            mimeType: RESOURCE_MIME_TYPE,
            text: resourceHtml,
            _meta: {
              ui: {
                csp: resourceCsp,
                prefersBorder: true,
                ...(widgetDomain ? { domain: widgetDomain } : {})
              },
              "openai/widgetCSP": openaiWidgetCsp,
              "openai/widgetDescription":
                "一个安静、轻盈的私人共读空间，供小辞与 Elias 阅读私人导入的小说或漫画。",
              "openai/widgetPrefersBorder": true,
              ...(widgetDomain ? { "openai/widgetDomain": widgetDomain } : {})
            }
          }
        ]
      };
    }
  );
}

function injectWorkerOrigin(widgetHtml: string) {
  return widgetHtml;
}
