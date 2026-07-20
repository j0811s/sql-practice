import { describe, expect, it, vi } from "vitest";
import worker from "./worker";

function makeEnv() {
  return { ASSETS: { fetch: vi.fn(async () => new Response("asset")) } };
}

describe("worker fetch", () => {
  it("routes /api/* to the Hono app", async () => {
    const env = makeEnv();
    const res = await worker.fetch(new Request("https://example.com/api/health"), env as never, {} as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();
  });

  it("routes everything else to ASSETS", async () => {
    const env = makeEnv();
    const request = new Request("https://example.com/");
    await worker.fetch(request, env as never, {} as never);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
  });
});
