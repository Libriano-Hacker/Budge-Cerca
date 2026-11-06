import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
  randomUUID,
} from "node:crypto";
import { ApiError } from "./contracts";
import type { ApiDependencies, ProviderTokens } from "./contracts";
export type Session = {
  access: string;
  refresh: string;
  expires: number;
  until: number;
  csrf: string;
};
export function now(deps: ApiDependencies) {
  return deps.now?.() ?? Date.now();
}
export function hash(deps: ApiDependencies, value: string) {
  return createHmac("sha256", deps.sessionKey).update(value).digest("hex");
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function makeSession(
  deps: ApiDependencies,
  tokens: ProviderTokens,
  previous?: Session,
): Session {
  return {
    access: tokens.access_token,
    refresh: tokens.refresh_token,
    expires: now(deps) + tokens.expires_in * 1000,
    until: previous?.until || now(deps) + 8 * 3600000,
    csrf: previous?.csrf || randomBytes(24).toString("base64url"),
  };
}
const name = (deps: ApiDependencies) =>
  deps.production ? "__Host-tbc-session" : "tbc-dev-session";
export function cookie(deps: ApiDependencies, session: Session | null) {
  let value = "";
  if (session) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", deps.sessionKey, nonce);
    cipher.setAAD(Buffer.from("tbc-session-v1"));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(session), "utf8"),
      cipher.final(),
    ]);
    value = Buffer.concat([nonce, cipher.getAuthTag(), encrypted]).toString(
      "base64url",
    );
    if (value.length > 3800)
      throw new ApiError(
        503,
        "SESSION_TOO_LARGE",
        "No se pudo iniciar la sesión.",
      );
  }
  return `${name(deps)}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${session ? Math.max(0, Math.floor((session.until - now(deps)) / 1000)) : 0}${deps.production ? "; Secure" : ""}`;
}
export function readSession(deps: ApiDependencies, request: Request): Session {
  const raw = (request.headers.get("cookie") || "")
    .split(";")
    .map((v) => v.trim())
    .find((v) => v.startsWith(`${name(deps)}=`))
    ?.slice(name(deps).length + 1);
  try {
    if (!raw || raw.length > 4000) throw new Error();
    const data = Buffer.from(raw, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deps.sessionKey,
      data.subarray(0, 12),
    );
    decipher.setAAD(Buffer.from("tbc-session-v1"));
    decipher.setAuthTag(data.subarray(12, 28));
    const session = JSON.parse(
      Buffer.concat([
        decipher.update(data.subarray(28)),
        decipher.final(),
      ]).toString(),
    ) as Session;
    if (
      !session.access ||
      !session.refresh ||
      !session.csrf ||
      session.until <= now(deps) ||
      session.until > now(deps) + 9 * 3600000
    )
      throw new Error();
    return session;
  } catch {
    throw new ApiError(401, "LOGIN_REQUIRED", "Iniciá sesión para continuar.");
  }
}
export function checkOrigin(
  deps: ApiDependencies,
  request: Request,
  allowNative = false,
) {
  const origin = request.headers.get("origin");
  if (
    origin !== deps.origin &&
    !(
      allowNative &&
      [
        "capacitor://localhost",
        "https://localhost",
        "http://localhost",
      ].includes(origin || "")
    )
  )
    throw new ApiError(
      403,
      "INVALID_ORIGIN",
      "No se permite enviar datos desde este origen.",
    );
}
export function checkCsrf(request: Request, session: Session) {
  if (!equal(request.headers.get("x-csrf-token") || "", session.csrf))
    throw new ApiError(
      403,
      "INVALID_CSRF",
      "La sesión debe actualizarse antes de guardar.",
    );
}
export function challenge(deps: ApiDependencies, ip: string) {
  const data = Buffer.from(
    JSON.stringify({
      id: randomUUID(),
      issued: now(deps),
      ip: hash(deps, `request:${ip}`),
    }),
  ).toString("base64url");
  return `${data}.${hash(deps, `challenge:${data}`)}`;
}
export function verifyChallenge(
  deps: ApiDependencies,
  token: unknown,
  ip: string,
) {
  try {
    if (typeof token !== "string" || token.length > 800) throw new Error();
    const [payload, signature, ...rest] = token.split(".");
    if (
      rest.length ||
      !equal(signature || "", hash(deps, `challenge:${payload}`))
    )
      throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (
      typeof data.id !== "string" ||
      !/^[0-9a-f-]{36}$/.test(data.id) ||
      data.ip !== hash(deps, `request:${ip}`) ||
      now(deps) - data.issued < 2000 ||
      now(deps) - data.issued > 600000
    )
      throw new Error();
    return data.id as string;
  } catch {
    throw new ApiError(
      422,
      "INVALID_CHALLENGE",
      "Revisá el formulario y volvé a enviarlo. Si esperaste mucho, abrilo nuevamente.",
    );
  }
}
