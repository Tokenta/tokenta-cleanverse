import { afterEach, describe, expect, it, vi } from "vitest";
import { HashicorpVault } from "./hashicorp-vault.js";

describe("hashicorp-vault", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads and writes via KV v2 API shape", async () => {
    const store = new Map<string, string>();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        const u = String(url);
        if (init?.method === "POST" && u.includes("/data/")) {
          const body = JSON.parse(init.body as string) as { data: { apiKey: string } };
          store.set(u, body.data.apiKey);
          return { ok: true, status: 204 };
        }
        const key = store.get(u);
        if (!key) return { ok: false, status: 404 };
        return {
          ok: true,
          status: 200,
          json: async () => ({ data: { data: { apiKey: key } } }),
        };
      }) as typeof fetch,
    );

    const v = new HashicorpVault("http://127.0.0.1:8200", "test-token");
    await v.put("listing/lst_1", "sk-hashicorp-test");
    expect(await v.get("listing/lst_1")).toBe("sk-hashicorp-test");
  });
});
