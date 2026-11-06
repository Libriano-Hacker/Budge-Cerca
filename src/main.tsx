import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { lazy, Suspense } from "react";
import { USER_APP } from "./platform";
const AdminPortal = !USER_APP
  ? lazy(() => import("./admin/AdminPortal"))
  : null;
import "@fontsource-variable/manrope";
import "./styles.css";
import "./cobalt.css";
import "./catalog.css";
import { NATIVE_APP } from "./platform";

document.documentElement.classList.toggle("native-user-app", NATIVE_APP);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {AdminPortal && location.pathname.replace(/\/$/, "") === "/gestion" ? (
      <Suspense fallback={<p>Cargando gestión…</p>}>
        <AdminPortal />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>,
);

if (
  import.meta.env.PROD &&
  !NATIVE_APP &&
  import.meta.env.VITE_APP_TARGET !== "mobile" &&
  "serviceWorker" in navigator
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* App remains usable without offline support. */
    });
  });
}
