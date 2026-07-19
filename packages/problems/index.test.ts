import { describe, expect, it } from "vitest";
import { problems } from "./index";

describe("problems", () => {
  it("includes the seeded WHERE problem", () => {
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ id: 1, category: "WHERE" });
  });
});
