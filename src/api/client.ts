import settings from "../../app.config.json";
import { NATIVE_APP } from "../platform";
import { isAppData } from "../domain";
import type { AppData } from "../domain";
import type { PhotoItem } from "../catalogModel";
import { UUID } from "../catalogModel";
import { publicHttpsUrl } from "../securityValidation";
import type { ApiConfig, AdminSession } from "../catalogApiTypes";
export class ApiFailure extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const base = () => (NATIVE_APP ? settings.publicUrl.replace(/\/$/, "") : "");
let csrf = "";
export function photoSource(photo: PhotoItem) {
  return photo.assetId && UUID.test(photo.assetId)
    ? `${base()}/api/media/${encodeURIComponent(photo.assetId)}`
    : publicHttpsUrl(photo.url)
      ? photo.url
      : "";
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
  limit = 6_000_000,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && typeof options.body === "string")
    headers.set("Content-Type", "application/json");
  if (csrf) headers.set("X-CSRF-Token", csrf);
  // AbortController also works in older supported iOS WebViews.
  const controller = new AbortController();
  const abort = () => controller.abort();
  const timer = setTimeout(abort, 18000);
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    let response: Response;
    try {
      response = await fetch(`${base()}/api${path}`, {
        ...options,
        headers,
        credentials: NATIVE_APP ? "omit" : "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
    } catch {
      throw new ApiFailure(
        "NETWORK",
        0,
        "No pudimos conectar. Revisá la conexión e intentá nuevamente.",
      );
    }
    if (!response.headers.get("content-type")?.includes("application/json"))
      throw new ApiFailure(
        "SERVICE_UNAVAILABLE",
        response.status,
        "El catálogo compartido todavía no está disponible.",
      );
    const reader = response.body?.getReader();
    let size = 0;
    const chunks: Uint8Array[] = [];
    if (reader)
      while (true) {
        const value = await reader.read();
        if (value.done) break;
        size += value.value.length;
        if (size > limit) {
          await reader.cancel();
          throw new ApiFailure(
            "TOO_LARGE",
            413,
            "La respuesta excede el tamaño permitido.",
          );
        }
        chunks.push(value.value);
      }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    let result: unknown;
    try {
      result = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
      throw new ApiFailure(
        "INVALID_RESPONSE",
        503,
        "No pudimos leer la respuesta del catálogo.",
      );
    }
    if (!response.ok) {
      const value = (result && typeof result === "object" ? result : {}) as {
        code?: unknown;
        message?: unknown;
      };
      throw new ApiFailure(
        typeof value.code === "string" ? value.code : "REQUEST_FAILED",
        response.status,
        typeof value.message === "string"
          ? value.message
          : "No se pudo completar la operación.",
      );
    }
    return result as T;
  } catch (error) {
    if (error instanceof ApiFailure) throw error;
    throw new ApiFailure(
      "NETWORK",
      0,
      "No pudimos completar la descarga. Revisá la conexión e intentá nuevamente.",
    );
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}
export async function apiConfig(): Promise<ApiConfig> {
  try {
    const config = await api<ApiConfig>("/config");
    return config.configured === true
      ? config
      : { configured: false, mode: "unconfigured", photosEnabled: false };
  } catch {
    return { configured: false, mode: "unconfigured", photosEnabled: false };
  }
}
export async function publicCatalog(signal?: AbortSignal) {
  const result = await api<{
    data: AppData;
    revision: number;
    mode: "live" | "test";
  }>("/catalog", { signal }, 2_500_000);
  if (!isAppData(result.data) || !Number.isSafeInteger(result.revision))
    throw new ApiFailure(
      "INVALID_CATALOG",
      503,
      "El administrador debe revisar el catálogo.",
    );
  return result;
}
export type SessionResult = AdminSession | { requiresMfa: true; csrf: string };
export function setSession(session: SessionResult | null) {
  csrf = session?.csrf || "";
}
export async function loadSession() {
  const session = await api<SessionResult>("/session");
  setSession(session);
  return session;
}
export async function login(email: string, password: string) {
  const session = await api<SessionResult>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setSession(session);
  return session;
}
export async function verifyMfa(code: string) {
  const session = await api<AdminSession>("/mfa", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
  setSession(session);
  return session;
}
export async function logout() {
  try {
    await api("/logout", { method: "POST", body: "{}" });
  } finally {
    setSession(null);
  }
}
