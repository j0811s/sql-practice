import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { problemsRoute } from "./problems";

describe("GET /api/problems", () => {
  it("returns the seeded example problem", async () => {
    const app = new Hono().route("/api/problems", problemsRoute);
    const res = await app.request("/api/problems");

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].id).toBe(1);
  });
});
