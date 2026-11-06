import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { isAppData } from "../src/domain";
import type { AppData, Business } from "../src/domain";
import { boundedText, recordWithKeys } from "../src/securityValidation";
import { validRequest } from "../src/requestModel";
import { UUID } from "../src/catalogModel";
import type {
  Access,
  AdminCatalog,
  CatalogHistory,
  ApiConfig,
} from "../src/catalogApiTypes";
import { ApiError } from "./contracts";
import type { ApiDependencies, Authenticated, ProviderUser } from "./contracts";
import {
  cookie,
  readSession,
  makeSession,
  checkCsrf,
  checkOrigin,
  challenge,
  verifyChallenge,
  hash,
  now,
} from "./session";
import type { Session } from "./session";

const revision = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const noCache = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
};
async function bytes(request: Request, max: number) {
  if (Number(request.headers.get("content-length")) > max)
    throw new ApiError(
      413,
      "TOO_LARGE",
      "El archivo o formulario es demasiado grande.",
    );
  const reader = request.body?.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  if (reader)
    while (true) {
      const item = await reader.read();
      if (item.done) break;
      size += item.value.length;
      if (size > max) {
        await reader.cancel();
        throw new ApiError(
          413,
          "TOO_LARGE",
          "El archivo o formulario es demasiado grande.",
        );
      }
      parts.push(item.value);
    }
  return Buffer.concat(parts);
}
async function jsonBody(request: Request) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new ApiError(
      415,
      "JSON_REQUIRED",
      "El formulario debe enviarse como JSON.",
    );
  try {
    return JSON.parse(
      (await bytes(request, 96_000)).toString("utf8"),
    ) as unknown;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(400, "INVALID_JSON", "No pudimos leer el formulario.");
  }
}
function validBusiness(business: unknown, meta: AppData): business is Business {
  return isAppData({ ...meta, businesses: [business] });
}
function needsMfa(user: ProviderUser, token: string) {
  if (
    !user.factors?.some(
      (f) => f.status === "verified" && f.factor_type === "totp",
    )
  )
    return false;
  // Called only after Supabase verified this exact token through /auth/v1/user.
  try {
    return (
      JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
        .aal !== "aal2"
    );
  } catch {
    return true;
  }
}
export function createApi(deps: ApiDependencies | null) {
  return async (
    request: Request,
    context: { ip?: string } = {},
  ): Promise<Response> => {
    const extra = new Headers(noCache);
    let isPublic = false;
    const respond = (value: unknown, status = 200) => {
      const headers = new Headers(extra);
      headers.set("Content-Type", "application/json; charset=utf-8");
      if (isPublic) {
        headers.set("Access-Control-Allow-Origin", "*");
        headers.set("Cross-Origin-Resource-Policy", "cross-origin");
      }
      return new Response(JSON.stringify(value), { status, headers });
    };
    try {
      const url = new URL(request.url);
      const path =
        url.pathname
          .replace(/^\/\.netlify\/functions\/api/, "")
          .replace(/^\/api/, "") || "/";
      const method = request.method.toUpperCase();
      isPublic =
        method === "GET" &&
        ["/catalog", "/config", "/challenge"].includes(path);
      if (method === "OPTIONS") {
        if (!deps)
          throw new ApiError(
            503,
            "SERVICE_UNCONFIGURED",
            "Todavía falta conectar el catálogo compartido.",
          );
        checkOrigin(deps, request, true);
        extra.set(
          "Access-Control-Allow-Origin",
          request.headers.get("origin")!,
        );
        extra.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        extra.set("Access-Control-Allow-Headers", "Content-Type");
        extra.set("Vary", "Origin");
        return new Response(null, { status: 204, headers: extra });
      }
      if (path === "/config" && method === "GET")
        return respond({
          configured: !!deps,
          mode: deps?.mode || "unconfigured",
          photosEnabled: !!deps,
        } satisfies ApiConfig);
      if (!deps)
        throw new ApiError(
          503,
          "SERVICE_UNCONFIGURED",
          "Todavía falta conectar el catálogo compartido.",
        );
      const ip = context.ip || "unknown";
      async function quota(type: string, limit: number, seconds = 3600) {
        const allowed = await deps!.repo.rpc<boolean>(
          "tbc_consume_quota",
          {
            p_key: hash(deps!, `${type}:${ip}`),
            p_limit: limit,
            p_seconds: seconds,
          },
          "service",
        );
        if (!allowed) {
          extra.set("Retry-After", String(seconds));
          throw new ApiError(
            429,
            "RATE_LIMIT",
            "Se alcanzó el límite de intentos. Esperá antes de volver a intentar.",
          );
        }
      }
      async function authenticated(
        requireWrite = false,
        allowPendingMfa = false,
      ): Promise<Authenticated & { session: Session; pendingMfa: boolean }> {
        let session = readSession(deps!, request);
        if (requireWrite) {
          checkOrigin(deps!, request);
          checkCsrf(request, session);
        }
        if (session.expires < now(deps!) + 30000) {
          session = makeSession(
            deps!,
            await deps!.auth.refresh(session.refresh),
            session,
          );
          extra.append("Set-Cookie", cookie(deps!, session));
        }
        const user = await deps!.auth.user(session.access);
        if (!UUID.test(user.id))
          throw new ApiError(
            401,
            "LOGIN_REQUIRED",
            "Iniciá sesión para continuar.",
          );
        const pendingMfa = needsMfa(user, session.access);
        if (pendingMfa && !allowPendingMfa)
          throw new ApiError(
            403,
            "MFA_REQUIRED",
            "Completá la verificación en dos pasos.",
          );
        const access = pendingMfa
          ? { role: "admin" as const, neighborhoods: [] }
          : await deps!.repo.rpc<Access>("tbc_access", {}, session.access);
        return {
          user,
          access,
          token: session.access,
          csrf: session.csrf,
          session,
          pendingMfa,
        };
      }
      if (path === "/catalog" && method === "GET") {
        const result = await deps.repo.rpc<{ data: AppData; revision: number }>(
          "tbc_public_catalog",
          {},
        );
        if (!result || !isAppData(result.data))
          throw new ApiError(
            503,
            "INVALID_CATALOG",
            "El catálogo necesita una revisión del administrador.",
          );
        return respond({ ...result, configured: true, mode: deps.mode });
      }
      if (path === "/challenge" && method === "GET") {
        await quota("challenge", 40, 900);
        return respond({ token: challenge(deps, ip), expiresIn: 600 });
      }
      if (path === "/requests" && method === "POST") {
        checkOrigin(deps, request, true);
        extra.set(
          "Access-Control-Allow-Origin",
          request.headers.get("origin")!,
        );
        extra.set("Vary", "Origin");
        const body = await jsonBody(request);
        if (
          !recordWithKeys(body, [
            "payload",
            "consent",
            "challenge",
            "website",
          ]) ||
          body.consent !== true ||
          body.website !== "" ||
          !validRequest(body.payload)
        )
          throw new ApiError(
            422,
            "INVALID_DATA",
            "Revisá los datos y el consentimiento del formulario.",
          );
        const nonce = verifyChallenge(deps, body.challenge, ip);
        await quota("request", 5);
        const result = await deps.repo.rpc(
          "tbc_submit_request",
          { p_payload: body.payload, p_nonce: nonce },
          "service",
        );
        const origin = request.headers.get("origin");
        if (origin) {
          extra.set("Access-Control-Allow-Origin", origin);
          extra.set("Vary", "Origin");
        }
        return respond(result, 201);
      }
      if (path === "/login" && method === "POST") {
        checkOrigin(deps, request);
        await quota("login", 10, 900);
        const body = await jsonBody(request);
        if (
          !recordWithKeys(body, ["email", "password"]) ||
          !boundedText(body.email, 3, 254) ||
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) ||
          !boundedText(body.password, 8, 1024)
        )
          throw new ApiError(
            401,
            "AUTH_FAILED",
            "Revisá el correo y la contraseña.",
          );
        const tokens = await deps.auth.login(body.email, body.password);
        const user = await deps.auth.user(tokens.access_token);
        const session = makeSession(deps, tokens);
        if (needsMfa(user, tokens.access_token)) {
          extra.append("Set-Cookie", cookie(deps, session));
          return respond({ requiresMfa: true, csrf: session.csrf });
        }
        const access = await deps.repo.rpc<Access>(
          "tbc_access",
          {},
          tokens.access_token,
        );
        extra.append("Set-Cookie", cookie(deps, session));
        return respond({
          user: { id: user.id, email: user.email },
          access,
          csrf: session.csrf,
        });
      }
      if (path === "/mfa" && method === "POST") {
        const auth = await authenticated(true, true);
        await quota("mfa", 6, 900);
        const body = await jsonBody(request);
        if (
          !recordWithKeys(body, ["code"]) ||
          typeof body.code !== "string" ||
          !/^\d{6}$/.test(body.code)
        )
          throw new ApiError(
            422,
            "INVALID_DATA",
            "Ingresá los seis dígitos del autenticador.",
          );
        const factor = auth.user.factors?.find(
          (f) => f.factor_type === "totp" && f.status === "verified",
        );
        if (!factor)
          throw new ApiError(
            422,
            "MFA_NOT_CONFIGURED",
            "No hay un factor disponible para esta cuenta.",
          );
        const tokens = await deps.auth.mfa(auth.token, factor.id, body.code);
        const user = await deps.auth.user(tokens.access_token);
        if (needsMfa(user, tokens.access_token))
          throw new ApiError(
            401,
            "MFA_REQUIRED",
            "No se pudo verificar el código.",
          );
        const access = await deps.repo.rpc<Access>(
          "tbc_access",
          {},
          tokens.access_token,
        );
        const session = makeSession(deps, tokens, auth.session);
        extra.append("Set-Cookie", cookie(deps, session));
        return respond({
          user: { id: user.id, email: user.email },
          access,
          csrf: session.csrf,
        });
      }
      if (path === "/session" && method === "GET") {
        const auth = await authenticated(false, true);
        return respond(
          auth.pendingMfa
            ? { requiresMfa: true, csrf: auth.csrf }
            : {
                user: { id: auth.user.id, email: auth.user.email },
                access: auth.access,
                csrf: auth.csrf,
              },
        );
      }
      if (path === "/logout" && method === "POST") {
        const session = readSession(deps, request);
        checkOrigin(deps, request);
        checkCsrf(request, session);
        try {
          await deps.auth.logout(session.access);
        } finally {
          extra.append("Set-Cookie", cookie(deps, null));
        }
        return respond({ loggedOut: true });
      }
      if (path === "/admin/catalog" && method === "GET") {
        const auth = await authenticated();
        return respond(
          await deps.repo.rpc<AdminCatalog>(
            "tbc_admin_catalog",
            {},
            auth.token,
          ),
        );
      }
      const businessPath = path.match(
        /^\/admin\/businesses\/([A-Za-z0-9][A-Za-z0-9._:-]{0,99})(?:\/(draft|publish|history|restore))?$/,
      );
      if (businessPath) {
        const [, id, action] = businessPath;
        if (action === "history" && method === "GET") {
          const auth = await authenticated();
          return respond(
            await deps.repo.rpc<CatalogHistory[]>(
              "tbc_history_for",
              { p_id: id },
              auth.token,
            ),
          );
        }
        const auth = await authenticated(true);
        const body = await jsonBody(request);
        if (
          !recordWithKeys(
            body,
            ["expectedRevision"],
            ["business", "historyId"],
          ) ||
          !revision(body.expectedRevision)
        )
          throw new ApiError(
            422,
            "INVALID_DATA",
            "Revisá la versión de la ficha.",
          );
        if (action === "draft" && method === "PUT") {
          const catalog = await deps.repo.rpc<{ data: AppData }>(
            "tbc_public_catalog",
            {},
          );
          if (
            !validBusiness(body.business, catalog.data) ||
            body.business.id !== id
          )
            throw new ApiError(
              422,
              "INVALID_DATA",
              "Revisá los datos de la ficha, fotos, precios y horarios.",
            );
          return respond(
            await deps.repo.rpc(
              "tbc_save_draft",
              {
                p_business: body.business,
                p_expected: body.expectedRevision,
                p_actor: auth.user.id,
              },
              "service",
            ),
          );
        }
        if (action === "publish" && method === "POST")
          return respond(
            await deps.repo.rpc(
              "tbc_publish",
              {
                p_id: id,
                p_expected: body.expectedRevision,
                p_actor: auth.user.id,
              },
              "service",
            ),
          );
        if (
          action === "restore" &&
          method === "POST" &&
          typeof body.historyId === "string" &&
          UUID.test(body.historyId)
        )
          return respond(
            await deps.repo.rpc(
              "tbc_restore",
              {
                p_id: id,
                p_history_id: body.historyId,
                p_expected: body.expectedRevision,
                p_actor: auth.user.id,
              },
              "service",
            ),
          );
        if (!action && method === "DELETE")
          return respond(
            await deps.repo.rpc(
              "tbc_archive",
              {
                p_id: id,
                p_expected: body.expectedRevision,
                p_actor: auth.user.id,
              },
              "service",
            ),
          );
      }
      if (path === "/admin/settings" && method === "PUT") {
        const auth = await authenticated(true);
        const body = await jsonBody(request);
        if (
          !recordWithKeys(body, ["data", "expectedRevision"]) ||
          !revision(body.expectedRevision) ||
          !isAppData(body.data) ||
          body.data.businesses.length
        )
          throw new ApiError(
            422,
            "INVALID_DATA",
            "Revisá la configuración del catálogo.",
          );
        return respond(
          await deps.repo.rpc(
            "tbc_save_meta",
            {
              p_data: body.data,
              p_expected: body.expectedRevision,
              p_actor: auth.user.id,
            },
            "service",
          ),
        );
      }
      const requestPath = path.match(
        /^\/admin\/requests\/([0-9a-f-]{36})\/(review|draft)$/i,
      );
      if (requestPath) {
        const [, id, action] = requestPath;
        if (!UUID.test(id) || method !== "POST")
          throw new ApiError(404, "NOT_FOUND", "No encontramos esa operación.");
        const auth = await authenticated(true);
        const body = await jsonBody(request);
        if (
          !recordWithKeys(
            body,
            ["expectedRevision"],
            ["status", "note", "business", "businessRevision"],
          ) ||
          !revision(body.expectedRevision)
        )
          throw new ApiError(422, "INVALID_DATA", "Revisá la solicitud.");
        if (
          action === "review" &&
          ["needs_changes", "rejected"].includes(String(body.status)) &&
          boundedText(body.note, 5, 1000, true)
        )
          return respond(
            await deps.repo.rpc(
              "tbc_review_request",
              {
                p_id: id,
                p_expected: body.expectedRevision,
                p_status: body.status,
                p_note: body.note,
                p_actor: auth.user.id,
              },
              "service",
            ),
          );
        if (action === "draft") {
          const catalog = await deps.repo.rpc<{ data: AppData }>(
            "tbc_public_catalog",
            {},
          );
          if (
            !revision(body.businessRevision) ||
            !validBusiness(body.business, catalog.data)
          )
            throw new ApiError(
              422,
              "INVALID_DATA",
              "Completá y revisá los datos del comercio.",
            );
          return respond(
            await deps.repo.rpc(
              "tbc_request_to_draft",
              {
                p_id: id,
                p_expected: body.expectedRevision,
                p_business: body.business,
                p_business_expected: body.businessRevision,
                p_actor: auth.user.id,
              },
              "service",
            ),
          );
        }
      }
      if (path === "/admin/photos" && method === "POST") {
        const auth = await authenticated(true);
        await quota("photo", 30);
        const neighborhood = request.headers.get("x-tbc-neighborhood");
        if (
          !boundedText(neighborhood, 1, 60) ||
          !["image/jpeg", "image/png", "image/webp"].includes(
            request.headers.get("content-type") || "",
          )
        )
          throw new ApiError(
            415,
            "IMAGE_REQUIRED",
            "Elegí una imagen JPEG, PNG o WebP.",
          );
        const image = await bytes(request, 5 * 1024 * 1024);
        let output: Buffer;
        try {
          const decoder = sharp(image, {
            limitInputPixels: 32_000_000,
            animated: false,
            failOn: "error",
          });
          const info = await decoder.metadata();
          if (
            !["jpeg", "png", "webp"].includes(info.format || "") ||
            (info.pages || 1) > 1
          )
            throw new Error();
          output = await decoder
            .rotate()
            .resize({
              width: 1920,
              height: 1920,
              fit: "inside",
              withoutEnlargement: true,
            })
            .webp({ quality: 85 })
            .toBuffer();
        } catch {
          throw new ApiError(
            415,
            "INVALID_IMAGE",
            "No pudimos procesar esa foto. Usá una imagen fija de hasta 32 megapíxeles.",
          );
        }
        const id = randomUUID();
        await deps.repo.rpc(
          "tbc_register_media",
          { p_id: id, p_neighborhood: neighborhood, p_actor: auth.user.id },
          "service",
        );
        await deps.repo.upload(`${id}.webp`, output);
        return respond({ assetId: id }, 201);
      }
      const mediaPath = path.match(/^\/media\/([0-9a-f-]{36})$/i);
      if (mediaPath && method === "GET" && UUID.test(mediaPath[1])) {
        const id = mediaPath[1];
        let access = await deps.repo.rpc<{
          allowed: boolean;
          public?: boolean;
          path?: string;
        }>("tbc_media_access", { p_id: id });
        if (!access.allowed) {
          const auth = await authenticated();
          access = await deps.repo.rpc(
            "tbc_media_access",
            { p_id: id },
            auth.token,
          );
        }
        if (!access.allowed || access.path !== `${id}.webp`)
          throw new ApiError(404, "NOT_FOUND", "No encontramos la imagen.");
        const image = await deps.repo.download(access.path);
        extra.set("Content-Type", "image/webp");
        if (access.public) {
          extra.set("Access-Control-Allow-Origin", "*");
          extra.set("Cross-Origin-Resource-Policy", "cross-origin");
        }
        return new Response(new Uint8Array(image), { headers: extra });
      }
      throw new ApiError(404, "NOT_FOUND", "No encontramos esa operación.");
    } catch (error) {
      const safe =
        error instanceof ApiError
          ? error
          : new ApiError(
              503,
              "SERVICE_UNAVAILABLE",
              "No se pudo completar la operación. Intentá nuevamente.",
            );
      return respond({ code: safe.code, message: safe.message }, safe.status);
    }
  };
}
