import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { loadProblems } from "./loadProblems";

const here = dirname(fileURLToPath(import.meta.url));
const problemsDir = resolve(here, "../../../../packages/problems");

describe("loadProblems", () => {
  it("loads the seeded example problem", () => {
    const problems = loadProblems(problemsDir);
    expect(problems).toHaveLength(7);
    expect(problems.find((p) => p.id === 1)).toMatchObject({ id: 1, category: "WHERE" });
  });

  it("skips node_modules and dotfiles when scanning for categories", () => {
    // Create a temporary directory with a valid category and invalid files
    const tmpDir = mkdtempSync(resolve(tmpdir(), "loadProblems-test-"));
    try {
      // Create a valid problem in the 'where' category
      mkdirSync(resolve(tmpDir, "where"));
      writeFileSync(
        resolve(tmpDir, "where", "001.json"),
        JSON.stringify({
          id: 1,
          title: "Test Problem",
          difficulty: 1,
          category: "WHERE",
          question: "Test question",
          schema: ["CREATE TABLE test(id INT);"],
          seed: [],
          expectedResult: [],
          hint: [],
          orderMatters: false,
        }),
      );

      // Create node_modules with an invalid JSON file
      mkdirSync(resolve(tmpDir, "node_modules", "some-package"), { recursive: true });
      writeFileSync(
        resolve(tmpDir, "node_modules", "some-package", "package.json"),
        JSON.stringify({ name: "some-package" }),
      );

      // Create a hidden directory (should be skipped)
      mkdirSync(resolve(tmpDir, ".git"));
      writeFileSync(resolve(tmpDir, ".git", "invalid.json"), JSON.stringify({ invalid: "data" }));

      // Load problems - should only find the 'where' category
      const problems = loadProblems(tmpDir);
      expect(problems).toHaveLength(1);
      expect(problems[0]).toMatchObject({ id: 1, category: "WHERE" });
    } finally {
      // Clean up the temporary directory
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
