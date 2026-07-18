export const WIDGET_SCRIPT_PATH = "/app-assets/reading-nest-v4.js";
export const WIDGET_STYLE_PATH = "/app-assets/reading-nest-v4.css";

export function buildRemoteWidgetHtml(widgetHtml: string, workerOrigin: string) {
  const assets = extractWidgetAssets(widgetHtml);
  if (!assets) return injectWorkerOrigin(widgetHtml, workerOrigin);

  const escapedOrigin = escapeHtmlAttribute(workerOrigin);
  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <meta name="ss-worker-origin" content="${escapedOrigin}">
    <title>和爸爸一起读</title>
    <link rel="stylesheet" href="${escapedOrigin}${WIDGET_STYLE_PATH}">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="${escapedOrigin}${WIDGET_SCRIPT_PATH}"></script>
  </body>
</html>`;
}

export function getWidgetAsset(pathname: string, widgetHtml: string) {
  const assets = extractWidgetAssets(widgetHtml);
  if (!assets) return undefined;
  if (pathname === WIDGET_SCRIPT_PATH) {
    return { body: assets.script, contentType: "text/javascript; charset=utf-8" };
  }
  if (pathname === WIDGET_STYLE_PATH) {
    return { body: assets.style, contentType: "text/css; charset=utf-8" };
  }
  return undefined;
}

function extractWidgetAssets(widgetHtml: string) {
  const script = widgetHtml.match(/<script\b[^>]*type=["']module["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];
  const styles = [...widgetHtml.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(
    (match) => match[1]
  );
  if (!script || styles.length === 0) return undefined;
  return { script, style: styles.join("\n") };
}

function injectWorkerOrigin(widgetHtml: string, workerOrigin: string) {
  const meta = `<meta name="ss-worker-origin" content="${escapeHtmlAttribute(workerOrigin)}">`;
  return /<\/head>/i.test(widgetHtml)
    ? widgetHtml.replace(/<\/head>/i, `${meta}</head>`)
    : `${meta}${widgetHtml}`;
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
