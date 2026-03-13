import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AgendaProvider } from "./context/AgendaContext";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AgendaProvider>
      <App />
    </AgendaProvider>
  </React.StrictMode>,
);
