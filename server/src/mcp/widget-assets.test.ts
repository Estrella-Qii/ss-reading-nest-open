import { describe, expect, it } from "vitest";
import {
  buildRemoteWidgetHtml,
  getWidgetAsset,
  WIDGET_SCRIPT_PATH,
  WIDGET_STYLE_PATH
} from "./widget-assets.js";

const bundledHtml = `<!doctype html><html><head><style>body{color:#333}</style></head><body><div id="root"></div><script type="module">document.querySelector('#root').textContent='ready'</script></body></html>`;

describe("versioned widget assets", () => {
  it("keeps the MCP template small and loads executable assets from the Worker origin", () => {
    const html = buildRemoteWidgetHtml(bundledHtml, "https://reading.example.workers.dev");
    expect(html).toContain(`https://reading.example.workers.dev${WIDGET_SCRIPT_PATH}`);
    expect(html).toContain(`https://reading.example.workers.dev${WIDGET_STYLE_PATH}`);
    expect(html).toContain('<meta name="ss-worker-origin" content="https://reading.example.workers.dev">');
    expect(html.length).toBeLessThan(2_000);
  });

  it("serves only the extracted versioned script and stylesheet", () => {
    expect(getWidgetAsset(WIDGET_SCRIPT_PATH, bundledHtml)).toMatchObject({
      contentType: "text/javascript; charset=utf-8",
      body: expect.stringContaining("document.querySelector")
    });
    expect(getWidgetAsset(WIDGET_STYLE_PATH, bundledHtml)).toMatchObject({
      contentType: "text/css; charset=utf-8",
      body: "body{color:#333}"
    });
    expect(getWidgetAsset("/app-assets/private.txt", bundledHtml)).toBeUndefined();
  });
});
