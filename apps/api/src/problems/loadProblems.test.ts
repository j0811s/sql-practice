import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadProblems } from "./loadProblems";

const here = dirname(fileURLToPath(import.meta.url));
const problemsDir = resolve(here, "../../../../packages/problems");

describe("loadProblems", () => {
  it("loads the seeded example problem", () => {
    const problems = loadProblems(problemsDir);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ id: 1, category: "WHERE" });
  });
});
