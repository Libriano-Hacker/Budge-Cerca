// Test-only Postgres and identity provider. Never imported by production functions.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { ApiDependencies, ProviderUser } from "../../server/contracts";
import { ApiError } from "../../server/contracts";
export const OWNER = "11111111-1111-4111-8111-111111111111";
export const ADMIN = "22222222-2222-4222-8222-222222222222";
export const OTHER = "33333333-3333-4333-8333-333333333333";
export async function catalogFixture(origin = "http://localhost:4190") {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role;
 create schema auth; create table auth.users(id uuid primary key);
 create table auth.mfa_factors(id uuid primary key,user_id uuid,status text,factor_type text);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 grant execute on function auth.uid(),auth.jwt() to anon,authenticated,service_role;
 insert into auth.users values('${OWNER}'),('${ADMIN}'),('${OTHER}');`);
  await db.exec(
    await readFile(
      new URL("../../supabase/migrations/001_catalog.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(
    `insert into public.tbc_members(user_id,role,neighborhoods) values('${OWNER}','owner','{}'),('${ADMIN}','admin','{"Barrio Centro"}');`,
  );
  const files = new Map<string, Uint8Array>();
  const tokens = new Map<string, { user: ProviderUser; aal: string }>();
  const refresh = new Map<string, string>();
  function issue(id = OWNER, aal = "aal1") {
    const token = `test.${Buffer.from(JSON.stringify({ sub: id, aal })).toString("base64url")}.${randomUUID()}`;
    const user = {
      id,
      email:
        id === OWNER
          ? "owner@example.test"
          : id === ADMIN
            ? "admin@example.test"
            : "other@example.test",
    };
    tokens.set(token, { user, aal });
    const refresh_token = randomUUID();
    refresh.set(refresh_token, token);
    return { access_token: token, refresh_token, expires_in: 3600 };
  }
  let clock = Date.now();
  let queue = Promise.resolve();
  const deps: ApiDependencies = {
    origin,
    sessionKey: Uint8Array.from({ length: 32 }, (_, i) => i + 1),
    production: false,
    mode: "test",
    now: () => clock,
    auth: {
      login: async (email, password) => {
        if (
          password !== "test-password" ||
          ![
            "owner@example.test",
            "admin@example.test",
            "other@example.test",
          ].includes(email)
        )
          throw new ApiError(401, "AUTH_FAILED", "Acceso no válido.");
        return issue(
          email.startsWith("owner")
            ? OWNER
            : email.startsWith("admin")
              ? ADMIN
              : OTHER,
        );
      },
      user: async (token) => {
        const value = tokens.get(token);
        if (!value) throw new ApiError(401, "AUTH_FAILED", "Acceso no válido.");
        const factors = await db.query<{
          id: string;
          factor_type: string;
          status: string;
        }>(
          "select id,factor_type,status from auth.mfa_factors where user_id=$1",
          [value.user.id],
        );
        return { ...value.user, factors: factors.rows };
      },
      refresh: async (value) => {
        const token = refresh.get(value);
        const current = token && tokens.get(token);
        if (!current) throw new ApiError(401, "AUTH_FAILED", "Sesión vencida.");
        return issue(current.user.id, current.aal);
      },
      logout: async (token) => {
        tokens.delete(token);
      },
      mfa: async (token, _factor, code) => {
        const value = tokens.get(token);
        if (!value || code !== "123456")
          throw new ApiError(401, "AUTH_FAILED", "Código incorrecto.");
        return issue(value.user.id, "aal2");
      },
    },
    repo: {
      rpc: async <T>(
        name: string,
        params: Record<string, unknown>,
        credential?: string,
      ): Promise<T> => {
        // Parameters and names are bounded, while role/JWT changes stay in one serialized transaction.
        if (
          !/^tbc_[a-z_]+$/.test(name) ||
          Object.keys(params).some((k) => !/^p_[a-z_]+$/.test(k))
        )
          throw new Error("Invalid fixture RPC");
        const result = queue.then(() =>
          db.transaction(async (tx) => {
            const identity = credential ? tokens.get(credential) : undefined;
            const role =
              credential === "service"
                ? "service_role"
                : identity
                  ? "authenticated"
                  : "anon";
            await tx.exec(`set local role ${role}`);
            await tx.query(
              "select set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)",
              [
                identity?.user.id || "",
                JSON.stringify({ aal: identity?.aal || "aal1" }),
              ],
            );
            const entries = Object.entries(params);
            const sql = `select public.${name}(${entries.map(([k], i) => `${k} => $${i + 1}`).join(",")}) as result`;
            const result = await tx.query<{ result: T }>(
              sql,
              entries.map(([, v]) =>
                typeof v === "object" ? JSON.stringify(v) : v,
              ),
            );
            return result.rows[0].result;
          }),
        );
        queue = result.then(
          () => {},
          () => {},
        );
        try {
          return await result;
        } catch (error) {
          const e = error as { code?: string; message: string };
          const status =
            e.code === "40001"
              ? 409
              : e.code === "42501"
                ? 403
                : e.code === "23505"
                  ? 409
                  : 422;
          throw new ApiError(
            status,
            e.message.includes("MFA_REQUIRED")
              ? "MFA_REQUIRED"
              : e.code === "40001"
                ? "CONFLICT"
                : e.message.split("\n")[0],
            e.message,
          );
        }
      },
      upload: async (path, bytes) => {
        files.set(path, bytes);
      },
      download: async (path) => {
        const file = files.get(path);
        if (!file) throw new ApiError(404, "NOT_FOUND", "Sin foto.");
        return file;
      },
    },
  };
  return {
    db,
    deps,
    issue,
    files,
    advance: (ms: number) => {
      clock += ms;
    },
  };
}
