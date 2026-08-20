import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { AppProviders } from "./app/AppProviders.tsx";
import { AuthProvider } from "./auth/AuthProvider.tsx";
import { ApiClientProvider } from "./api/provider.tsx";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <AuthProvider>
      <ApiClientProvider>
        <AppProviders>
          <App />
        </AppProviders>
      </ApiClientProvider>
    </AuthProvider>
  </React.StrictMode>,
);
