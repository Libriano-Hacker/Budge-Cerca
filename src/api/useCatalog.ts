import { useEffect, useState } from "react";
import type { AppData } from "../domain";
import { isAppData } from "../domain";
import { apiConfig, publicCatalog } from "./client";
const KEY = "tu-barrio-cerca:published:v1";
export default function useCatalog(onData: (data: AppData) => void) {
  const [status, setStatus] = useState<"demo" | "live" | "offline">("demo"),
    [configured, setConfigured] = useState(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    void (async () => {
      // This cache contains published catalog data only, never sessions or moderation data.
      try {
        const raw = localStorage.getItem(KEY);
        if (raw && raw.length < 2_500_000) {
          const parsed = JSON.parse(raw);
          if (isAppData(parsed) && active) {
            onData(parsed);
            setStatus("offline");
          }
        }
      } catch {
        /* Public snapshot is optional. */
      }
      const config = await apiConfig();
      if (!active) return;
      setConfigured(config.configured);
      if (!config.configured) return;
      try {
        const result = await publicCatalog(controller.signal);
        if (!active) return;
        onData(result.data);
        setStatus("live");
        try {
          localStorage.setItem(KEY, JSON.stringify(result.data));
        } catch {
          /* Browsing remains available. */
        }
      } catch {
        if (active) setConfigured(false);
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [onData]);
  return { status, configured };
}
