import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AgendaProvider } from "./context/AgendaContext";
import { SaudeProvider } from "./context/SaudeContext";
import { FinancasProvider } from "./context/FinancasContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AgendaProvider>
      <FinancasProvider>
        <SaudeProvider>
          <App />
        </SaudeProvider>
      </FinancasProvider>
    </AgendaProvider>
  </React.StrictMode>,
);
