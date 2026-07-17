import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseProblem, type Problem } from "@sql-practice/shared";

export function loadProblems(problemsDir: string): Problem[] {
  const categories = readdirSync(problemsDir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules",
  );

  const problems: Problem[] = [];
  for (const category of categories) {
    const categoryDir = join(problemsDir, category.name);
    const files = readdirSync(categoryDir).filter((name) => name.endsWith(".json"));
    for (const file of files) {
      const raw = readFileSync(join(categoryDir, file), "utf-8");
      problems.push(parseProblem(JSON.parse(raw)));
    }
  }
  return problems;
}
