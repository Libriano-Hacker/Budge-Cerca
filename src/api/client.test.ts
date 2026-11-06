import { afterEach, it, expect, vi } from "vitest";
import { api, setSession, photoSource } from "./client";
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  setSession(null);
});
it("times out with AbortController when AbortSignal.timeout is unavailable", async () => {
  vi.useFakeTimers();
  vi.spyOn(AbortSignal, "timeout").mockImplementation(() => {
    throw new Error("unsupported WebView");
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(
      (_url, init) =>
        new Promise((_resolve, reject) =>
          init.signal.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    ),
  );
  const result = api("/config").catch((e) => e);
  await vi.advanceTimersByTimeAsync(18001);
  expect(await result).toMatchObject({ code: "NETWORK" });
  vi.restoreAllMocks();
});
it("bounds response bytes and keeps errors readable for invalid JSON shapes", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ data: "x".repeat(500) }), {
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
  await expect(api("/catalog", {}, 100)).rejects.toMatchObject({
    code: "TOO_LARGE",
  });
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response("null", {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  await expect(api("/config")).rejects.toMatchObject({
    code: "REQUEST_FAILED",
    status: 503,
  });
});

it("does not preview private or unsafe image addresses before saving", () => {
  expect(photoSource({ url: "https://localhost/photo", alt: "Foto" })).toBe("");
  expect(photoSource({ url: "javascript:alert(1)", alt: "Foto" })).toBe("");
  expect(
    photoSource({ url: "https://example.com/photo.webp", alt: "Foto" }),
  ).toBe("https://example.com/photo.webp");
  expect(
    photoSource({
      assetId: "11111111-1111-4111-8111-111111111111",
      alt: "Foto",
    }),
  ).toBe("/api/media/11111111-1111-4111-8111-111111111111");
});
