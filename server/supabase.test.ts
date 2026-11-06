import { afterEach, describe, it, expect, vi } from "vitest";
import { serverConfiguration, supabaseServices } from "./supabase";
const env = {
  SUPABASE_URL: "https://example.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture",
  SUPABASE_SECRET_KEY: "sb_secret_fixture",
  TBC_SESSION_SECRET: Buffer.from(
    Array.from({ length: 32 }, (_, i) => i + 1),
  ).toString("hex"),
  TBC_SITE_ORIGIN: "https://example.com",
  NODE_ENV: "production",
};
afterEach(() => vi.unstubAllGlobals());
describe("Server-only provider configuration", () => {
  it("fails closed for absent settings and rejects unsafe URLs and weak session secrets", () => {
    expect(serverConfiguration({})).toBe(null);
    expect(
      serverConfiguration({
        ...env,
        NETLIFY: "true",
        NETLIFY_DEV: "true",
        TBC_SITE_ORIGIN: "http://localhost:8888",
      })?.production,
    ).toBe(false);
    expect(
      serverConfiguration({ ...env, NETLIFY: "true", NETLIFY_DEV: "true" })
        ?.production,
    ).toBe(true);
    for (const bad of [
      { SUPABASE_URL: "http://localhost" },
      { SUPABASE_URL: "https://example.com/path" },
      { SUPABASE_URL: "https://example.supabase.co/?x=y" },
      { TBC_SITE_ORIGIN: "http://example.com" },
      { TBC_SESSION_SECRET: "00".repeat(32) },
    ])
      expect(() => serverConfiguration({ ...env, ...bad })).toThrow();
  });
  it("sends opaque secret keys only as apikey, and uses the verified user JWT for private reads", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response("{}", { headers: { "content-type": "application/json" } }),
      );
    vi.stubGlobal("fetch", fetchMock);
    const services = supabaseServices(serverConfiguration(env)!);
    await services.repo.rpc("tbc_save_draft", {}, "service");
    let headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get("apikey")).toBe("sb_secret_fixture");
    expect(headers.has("authorization")).toBe(false);
    await services.repo.rpc("tbc_admin_catalog", {}, "verified-user-jwt");
    headers = fetchMock.mock.calls[1][1].headers;
    expect(headers.get("apikey")).toBe("sb_publishable_fixture");
    expect(headers.get("authorization")).toBe("Bearer verified-user-jwt");
  });
  it("preserves legacy service role JWT compatibility without disclosing provider failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ message: "private-provider-error-and-secret" }),
          { status: 500, headers: { "content-type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const services = supabaseServices(
      serverConfiguration({
        ...env,
        SUPABASE_SECRET_KEY: "eyJ.legacy.fixture",
      })!,
    );
    await expect(
      services.repo.rpc("tbc_publish", {}, "service"),
    ).rejects.toMatchObject({ status: 503, code: "PROVIDER_UNAVAILABLE" });
    expect(fetchMock.mock.calls[0][1].headers.get("authorization")).toBe(
      "Bearer eyJ.legacy.fixture",
    );
  });
});
