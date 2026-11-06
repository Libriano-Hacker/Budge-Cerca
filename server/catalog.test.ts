import { beforeAll, afterAll, describe, it, expect } from "vitest";
import {
  catalogFixture,
  OWNER,
  ADMIN,
  OTHER,
} from "../tests/support/catalogFixture";
import { createApi } from "./handler";
import { initialData } from "../src/data";
import type { AppData } from "../src/domain";
import type { AdminCatalog, CatalogHistory } from "../src/catalogApiTypes";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
let fixture: Awaited<ReturnType<typeof catalogFixture>>;
let api: ReturnType<typeof createApi>;
let cookie = "";
let csrf = "";
const business = {
  ...initialData.businesses[0],
  id: "real-bakery",
  neighborhood: "Barrio Centro",
  imageUrl: undefined,
  details: {
    services: [{ name: "Pan integral", price: 0.29 }],
    features: ["delivery" as const],
  },
};
async function call(
  path: string,
  method = "GET",
  body?: unknown,
  headers: Record<string, string> = {},
) {
  return api(
    new Request(`http://localhost:4190/api${path}`, {
      method,
      headers: {
        Origin: "http://localhost:4190",
        ...(cookie ? { Cookie: cookie } : {}),
        ...(csrf ? { "X-CSRF-Token": csrf } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    { ip: "192.0.2.5" },
  );
}
beforeAll(async () => {
  fixture = await catalogFixture();
  api = createApi(fixture.deps);
}, 30000);
afterAll(async () => {
  await fixture.db.close();
});
describe("Shared catalog authorization and publication", () => {
  it("fails closed without configuration", async () => {
    const res = await createApi(null)(
      new Request("https://example.test/api/admin/catalog"),
    );
    expect(res.status).toBe(503);
  });
  it("has only a published public catalog; denies raw tables and writes by user tokens", async () => {
    expect((await (await call("/catalog")).json()).data.businesses).toEqual([]);
    const token = fixture.issue().access_token;
    await expect(
      fixture.deps.repo.rpc(
        "tbc_save_draft",
        { p_business: business, p_expected: 0, p_actor: OWNER },
        token,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      fixture.db.transaction(async (tx) => {
        await tx.exec("set local role authenticated");
        await tx.query("select * from public.tbc_members");
      }),
    ).rejects.toMatchObject({ code: "42501" });
  });
  it("rejects foreign origin and non-member accounts", async () => {
    expect(
      (
        await call(
          "/login",
          "POST",
          { email: "owner@example.test", password: "test-password" },
          { Origin: "https://evil.example" },
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await call("/login", "POST", {
          email: "other@example.test",
          password: "test-password",
        })
      ).status,
    ).toBe(403);
  });
  it("uses an encrypted HttpOnly session and CSRF; stores no tokens in JSON", async () => {
    const res = await call("/login", "POST", {
      email: "owner@example.test",
      password: "test-password",
    });
    expect(res.status).toBe(200);
    cookie = res.headers.get("set-cookie")!.split(";")[0];
    expect(res.headers.get("set-cookie")).toContain(
      "HttpOnly; SameSite=Strict",
    );
    const body = await res.json();
    csrf = body.csrf;
    expect(JSON.stringify(body)).not.toMatch(/access_token|refresh_token/);
    expect(
      (
        await call(
          `/admin/businesses/${business.id}/draft`,
          "PUT",
          { business, expectedRevision: 0 },
          { "X-CSRF-Token": "wrong" },
        )
      ).status,
    ).toBe(403);
    expect(
      (await call("/session", "GET", undefined, { Cookie: cookie + "x" }))
        .status,
    ).toBe(401);
  });
  it("keeps drafts private, publishes explicitly, and detects stale edits", async () => {
    expect(
      (
        await call(`/admin/businesses/${business.id}/draft`, "PUT", {
          business,
          expectedRevision: 0,
        })
      ).status,
    ).toBe(200);
    expect(
      (await (await call("/catalog")).json()).data.businesses,
    ).toHaveLength(0);
    expect(
      (
        await call(`/admin/businesses/${business.id}/draft`, "PUT", {
          business,
          expectedRevision: 0,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await call(`/admin/businesses/${business.id}/publish`, "POST", {
          expectedRevision: 1,
        })
      ).status,
    ).toBe(200);
    const catalog = await (await call("/catalog")).json();
    expect(catalog.data.businesses[0].details.services[0].price).toBe(0.29);
    expect(catalog.data.businesses[0].details.publishedAt).toBeTruthy();
  });
  it("restores history to a new draft without changing the public version", async () => {
    const changed = { ...business, name: "Nueva panadería" };
    expect(
      (
        await call(`/admin/businesses/${business.id}/draft`, "PUT", {
          business: changed,
          expectedRevision: 2,
        })
      ).status,
    ).toBe(200);
    const history = (await (
      await call(`/admin/businesses/${business.id}/history`)
    ).json()) as CatalogHistory[];
    expect(
      (
        await call(`/admin/businesses/${business.id}/restore`, "POST", {
          expectedRevision: 3,
          historyId: history.find((h) => h.revision === 1)!.id,
        })
      ).status,
    ).toBe(200);
    expect(
      (await (await call("/catalog")).json()).data.businesses[0].name,
    ).toBe(business.name);
    const admin = (await (await call("/admin/catalog")).json()) as AdminCatalog;
    expect(admin.records[0].draft?.name).toBe(business.name);
    expect(admin.records[0].revision).toBe(4);
  });
  it("enforces neighborhood scope in service RPC independently of the BFF", async () => {
    const catalog = await fixture.deps.repo.rpc<{
      data: AppData;
      revision: number;
    }>("tbc_public_catalog", {});
    await fixture.deps.repo.rpc(
      "tbc_save_meta",
      {
        p_data: {
          ...catalog.data,
          businesses: [],
          neighborhoods: ["Barrio Centro", "Otra zona"],
        },
        p_expected: catalog.revision,
        p_actor: OWNER,
      },
      "service",
    );
    await expect(
      fixture.deps.repo.rpc(
        "tbc_save_draft",
        {
          p_business: { ...business, id: "other", neighborhood: "Otra zona" },
          p_expected: 0,
          p_actor: ADMIN,
        },
        "service",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      fixture.deps.repo.rpc(
        "tbc_save_meta",
        { p_data: catalog.data, p_expected: 1, p_actor: ADMIN },
        "service",
      ),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      fixture.deps.repo.rpc(
        "tbc_save_draft",
        { p_business: business, p_expected: 4, p_actor: OTHER },
        "service",
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
  it("protects media until publication, reencodes images, denies SVG uploads", async () => {
    const invalid = await api(
      new Request("http://localhost:4190/api/admin/photos", {
        method: "POST",
        headers: {
          Origin: "http://localhost:4190",
          Cookie: cookie,
          "X-CSRF-Token": csrf,
          "X-TBC-Neighborhood": "Barrio Centro",
          "Content-Type": "image/svg+xml",
        },
        body: "<svg/>",
      }),
    );
    expect(invalid.status).toBe(415);
    const image = await sharp({
      create: { width: 32, height: 32, channels: 3, background: "#247" },
    })
      .png()
      .toBuffer();
    const res = await api(
      new Request("http://localhost:4190/api/admin/photos", {
        method: "POST",
        headers: {
          Origin: "http://localhost:4190",
          Cookie: cookie,
          "X-CSRF-Token": csrf,
          "X-TBC-Neighborhood": "Barrio Centro",
          "Content-Type": "image/png",
        },
        body: new Uint8Array(image),
      }),
    );
    expect(res.status).toBe(201);
    const { assetId } = await res.json();
    expect(
      (
        await fixture.deps.repo.rpc<{ allowed: boolean }>("tbc_media_access", {
          p_id: assetId,
        })
      ).allowed,
    ).toBe(false);
    expect(
      (
        await fixture.deps.repo.rpc<{ allowed: boolean }>(
          "tbc_media_access",
          { p_id: assetId },
          fixture.issue().access_token,
        )
      ).allowed,
    ).toBe(true);
    const draft = {
      ...business,
      details: { photos: [{ assetId, alt: "Frente del local" }] },
    };
    expect(
      (
        await call(`/admin/businesses/${business.id}/draft`, "PUT", {
          business: draft,
          expectedRevision: 4,
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await call(`/admin/businesses/${business.id}/publish`, "POST", {
          expectedRevision: 5,
        })
      ).status,
    ).toBe(200);
    const pub = await api(
      new Request(`http://localhost:4190/api/media/${assetId}`),
    );
    expect(pub.status).toBe(200);
    expect(pub.headers.get("content-type")).toBe("image/webp");
    expect(pub.headers.get("cache-control")).toContain("no-store");
  });
  it("accepts requests only once and approves them to draft, never to publication", async () => {
    const { token } = await (await call("/challenge")).json();
    const body = {
      payload: {
        kind: "new",
        name: "Nuevo local",
        category: business.category,
        neighborhood: "Barrio Centro",
        address: "Calle 123",
        note: "Ofrecemos productos del barrio.\nCon atención personalizada.",
      },
      consent: true,
      challenge: token,
      website: "",
    };
    expect((await call("/requests", "POST", body)).status).toBe(422);
    fixture.advance(2500);
    const res = await call("/requests", "POST", body);
    expect(res.status).toBe(201);
    const request = await res.json();
    expect((await call("/requests", "POST", body)).status).toBe(409);
    expect(
      (
        await call(`/admin/requests/${request.id}/draft`, "POST", {
          expectedRevision: 1,
          business: {
            ...business,
            id: "requested-business",
            name: "Nuevo local",
          },
          businessRevision: 0,
        })
      ).status,
    ).toBe(200);
    const catalog = await (await call("/catalog")).json();
    expect(catalog.data.businesses).toHaveLength(1);
    expect(JSON.stringify(catalog)).not.toContain("contactName");
    expect(
      (
        await call(`/admin/requests/${request.id}/draft`, "POST", {
          expectedRevision: 1,
          business: { ...business, id: "requested-business" },
          businessRevision: 0,
        })
      ).status,
    ).toBe(409);
  });
  it("limits abuse persistently and prevents removal of referenced neighborhoods", async () => {
    for (let i = 0; i < 3; i++)
      expect(
        await fixture.deps.repo.rpc(
          "tbc_consume_quota",
          { p_key: "test-rate-key", p_limit: 3, p_seconds: 60 },
          "service",
        ),
      ).toBe(true);
    expect(
      await fixture.deps.repo.rpc(
        "tbc_consume_quota",
        { p_key: "test-rate-key", p_limit: 3, p_seconds: 60 },
        "service",
      ),
    ).toBe(false);
    const c = await fixture.deps.repo.rpc<{ data: AppData; revision: number }>(
      "tbc_public_catalog",
      {},
    );
    await expect(
      fixture.deps.repo.rpc(
        "tbc_save_meta",
        {
          p_data: {
            ...c.data,
            businesses: [],
            neighborhoods: ["Otra zona"],
            settings: { ...c.data.settings, neighborhood: "Otra zona" },
          },
          p_expected: c.revision,
          p_actor: OWNER,
        },
        "service",
      ),
    ).rejects.toMatchObject({ code: "REFERENCES_EXIST" });
  });
  it("keeps storage private even alongside permissive object policies", async () => {
    await fixture.db.exec(
      `create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid default gen_random_uuid(),bucket_id text); alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated; grant select on storage.objects to anon,authenticated; create policy unrelated_public on storage.objects for select to anon,authenticated using(true);`,
    );
    await fixture.db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/002_private_media.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await fixture.db.exec(
      "insert into storage.objects(bucket_id) values('tbc-private-media'),('other-bucket')",
    );
    const rows = await fixture.db.transaction(async (tx) => {
      await tx.exec("set local role anon");
      return tx.query<{ bucket_id: string }>(
        "select bucket_id from storage.objects",
      );
    });
    expect(rows.rows).toEqual([{ bucket_id: "other-bucket" }]);
  });
  it("requires enrolled MFA in BFF and private database reads", async () => {
    await fixture.db.exec(
      `insert into auth.mfa_factors values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','${OWNER}','verified','totp')`,
    );
    await expect(
      fixture.deps.repo.rpc(
        "tbc_admin_catalog",
        {},
        fixture.issue().access_token,
      ),
    ).rejects.toMatchObject({ code: "MFA_REQUIRED" });
    const res = await call("/login", "POST", {
      email: "owner@example.test",
      password: "test-password",
    });
    const body = await res.json();
    expect(body.requiresMfa).toBe(true);
    csrf = body.csrf;
    cookie = res.headers.get("set-cookie")!.split(";")[0];
    expect((await call("/admin/catalog")).status).toBe(403);
    const mfa = await call("/mfa", "POST", { code: "123456" });
    expect(mfa.status).toBe(200);
    cookie = mfa.headers.get("set-cookie")!.split(";")[0];
    expect((await call("/admin/catalog")).status).toBe(200);
  });
});
