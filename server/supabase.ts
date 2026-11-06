import type {
  CatalogRepository,
  IdentityProvider,
  ProviderTokens,
  ProviderUser,
} from "./contracts";
import { ApiError } from "./contracts";
import { publicHttpsUrl } from "../src/securityValidation";
import settings from "../app.config.json";

export function serverConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  const url = env.SUPABASE_URL?.replace(/\/$/, "");
  const publishableKey = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY;
  const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = env.TBC_SESSION_SECRET;
  const origin = env.TBC_SITE_ORIGIN || settings.publicUrl;
  if (!url || !publishableKey || !secretKey || !secret) return null;
  if (
    !publicHttpsUrl(url) ||
    !new URL(url).hostname.endsWith(".supabase.co") ||
    new URL(url).pathname !== "/" ||
    new URL(url).search ||
    new URL(url).hash
  )
    throw new Error(
      "SUPABASE_URL debe ser el origen HTTPS de tu proyecto Supabase.",
    );
  const key = /^[0-9a-f]{64}$/i.test(secret)
    ? Buffer.from(secret, "hex")
    : Buffer.from(secret, "base64url");
  if (key.byteLength !== 32 || new Set(key).size < 8)
    throw new Error("TBC_SESSION_SECRET requiere 32 bytes aleatorios.");
  const site = new URL(origin);
  const localNetlify =
    env.NETLIFY_DEV === "true" &&
    site.protocol === "http:" &&
    ["127.0.0.1", "localhost"].includes(site.hostname);
  const production =
    !localNetlify && (!!env.NETLIFY || env.NODE_ENV === "production");
  if (
    site.origin !== origin ||
    (site.protocol !== "https:" &&
      (production || !["127.0.0.1", "localhost"].includes(site.hostname)))
  )
    throw new Error("TBC_SITE_ORIGIN no es un origen seguro permitido.");
  return {
    url,
    publishableKey,
    secretKey,
    sessionKey: key,
    origin,
    production,
  };
}
function providerError(status: number, body: unknown): never {
  const message =
    typeof body === "object" && body !== null && "message" in body
      ? String(body.message)
      : "";
  const code =
    typeof body === "object" && body !== null && "code" in body
      ? String(body.code)
      : "";
  if (message.includes("CONFLICT") || code === "40001")
    throw new ApiError(
      409,
      "CONFLICT",
      "La ficha cambió en otra sesión. Recargá antes de continuar.",
    );
  if (message.includes("MFA_REQUIRED"))
    throw new ApiError(
      403,
      "MFA_REQUIRED",
      "Completá la verificación en dos pasos.",
    );
  if (message.includes("ACCESS_DENIED") || code === "42501")
    throw new ApiError(
      403,
      "FORBIDDEN",
      "Tu cuenta no tiene permiso para esa operación.",
    );
  if (message.includes("REFERENCES_EXIST"))
    throw new ApiError(
      422,
      "REFERENCES_EXIST",
      "Reasigná los comercios antes de quitar un barrio o rubro.",
    );
  if (message.includes("INVALID_MEDIA"))
    throw new ApiError(
      422,
      "INVALID_MEDIA",
      "La foto no pertenece al barrio de esta ficha.",
    );
  if (message.includes("LIMIT_REACHED"))
    throw new ApiError(
      429,
      "LIMIT_REACHED",
      "Se alcanzó el límite disponible. Volvé a intentar más tarde.",
    );
  if (code === "23505")
    throw new ApiError(
      409,
      "REPLAY",
      "La solicitud ya se envió. No es necesario repetirla.",
    );
  if (status === 401 || (status === 400 && !/^\d{5}$/.test(code)))
    throw new ApiError(
      401,
      "AUTH_FAILED",
      "No se pudo verificar el acceso. Revisá los datos e intentá nuevamente.",
    );
  if (status === 403)
    throw new ApiError(
      403,
      "FORBIDDEN",
      "No tenés permiso para esta operación.",
    );
  if (message.includes("INVALID_DATA") || code.startsWith("22"))
    throw new ApiError(422, "INVALID_DATA", "Revisá los datos enviados.");
  throw new ApiError(
    503,
    "PROVIDER_UNAVAILABLE",
    "No pudimos conectar con el catálogo. Intentá nuevamente más tarde.",
  );
}
export function supabaseServices(
  config: NonNullable<ReturnType<typeof serverConfiguration>>,
): { repo: CatalogRepository; auth: IdentityProvider } {
  async function call(
    path: string,
    init: RequestInit = {},
    token?: string | "service",
    raw = false,
  ) {
    const credential = token === "service" ? config.secretKey : token;
    const headers = new Headers(init.headers);
    headers.set(
      "apikey",
      token === "service" ? config.secretKey : config.publishableKey,
    );
    // New sb_secret keys belong in apikey; only JWTs go in Authorization.
    if (credential && (token !== "service" || credential.startsWith("eyJ")))
      headers.set("Authorization", `Bearer ${credential}`);
    if (!headers.has("Content-Type") && init.body)
      headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      response = await fetch(`${config.url}${path}`, {
        ...init,
        headers,
        signal: AbortSignal.timeout(12000),
        redirect: "error",
      });
    } catch {
      throw new ApiError(
        503,
        "PROVIDER_UNAVAILABLE",
        "No pudimos conectar con el catálogo. Intentá nuevamente.",
      );
    }
    if (raw && response.ok) return response;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) providerError(response.status, data);
    return data;
  }
  const auth: IdentityProvider = {
    login: (email, password) =>
      call("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }) as Promise<ProviderTokens>,
    user: (token) => call("/auth/v1/user", {}, token) as Promise<ProviderUser>,
    refresh: (refresh_token) =>
      call("/auth/v1/token?grant_type=refresh_token", {
        method: "POST",
        body: JSON.stringify({ refresh_token }),
      }) as Promise<ProviderTokens>,
    logout: async (token) => {
      await call("/auth/v1/logout", { method: "POST" }, token);
    },
    mfa: async (token, factorId, code) => {
      const challenge = await call(
        `/auth/v1/factors/${encodeURIComponent(factorId)}/challenge`,
        { method: "POST", body: "{}" },
        token,
      );
      return call(
        `/auth/v1/factors/${encodeURIComponent(factorId)}/verify`,
        {
          method: "POST",
          body: JSON.stringify({ challenge_id: challenge.id, code }),
        },
        token,
      ) as Promise<ProviderTokens>;
    },
  };
  const repo: CatalogRepository = {
    rpc: async <T>(
      name: string,
      params: Record<string, unknown>,
      token?: string | "service",
    ): Promise<T> =>
      call(
        `/rest/v1/rpc/${name}`,
        { method: "POST", body: JSON.stringify(params) },
        token,
      ),
    upload: async (path, bytes) => {
      await call(
        `/storage/v1/object/tbc-private-media/${encodeURIComponent(path)}`,
        {
          method: "POST",
          headers: { "Content-Type": "image/webp", "x-upsert": "false" },
          body: new Uint8Array(bytes),
        },
        "service",
      );
    },
    download: async (path) =>
      new Uint8Array(
        await (
          (await call(
            `/storage/v1/object/authenticated/tbc-private-media/${encodeURIComponent(path)}`,
            {},
            "service",
            true,
          )) as Response
        ).arrayBuffer(),
      ),
  };
  return { repo, auth };
}
