import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Boot } from "./Boot.js";
import "./styles/tokens.css";
import "./styles/app.css";

const rootElement = document.getElementById("root");

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <Boot />
    </StrictMode>
  );
} else {
  document.body.insertAdjacentHTML(
    "afterbegin",
    '<main class="boot-diagnostics" role="alert"><strong>和爸爸一起读 · 启动诊断</strong><p>Missing app root. Please refresh the widget.</p><dl><div><dt>resourceVersion</dt><dd>app-v20</dd></div><div><dt>bootStage</dt><dd>missing-root</dd></div></dl></main>'
  );
}
