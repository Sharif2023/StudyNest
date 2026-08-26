import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import "./index.css";
import { ApiProvider } from "./lib/apiClient.jsx";
import { AuthProvider } from "./lib/useAuth.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ApiProvider>
      <AuthProvider>
        <App />
        <Analytics />
      </AuthProvider>
    </ApiProvider>
  </React.StrictMode>
);
