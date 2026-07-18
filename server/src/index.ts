import { createApp } from "./app.js";

const port = Number(process.env.PORT ?? 8787);
createApp().listen(port, () => {
  console.log(`和爸爸一起读 MCP server: http://localhost:${port}/mcp`);
});
