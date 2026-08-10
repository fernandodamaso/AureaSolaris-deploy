import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { AgendaProvider } from "./context/AgendaContext.tsx";
import { SaudeProvider } from "./context/SaudeContext.tsx";
import { GlobalProvider } from "./context/GlobalContext.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AgendaProvider>
      <SaudeProvider>
        <GlobalProvider>
          <App />
        </GlobalProvider>
      </SaudeProvider>
    </AgendaProvider>
  </React.StrictMode>,
);
