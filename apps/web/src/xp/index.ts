import type { Problem } from "@sql-practice/shared";

export function calculateXp(problem: Problem): number {
  return problem.difficulty * 10;
}

export function calculateLevel(xp: number): number {
  return Math.floor(xp / 100) + 1;
}

export function totalXp(completedIds: number[], problems: Problem[]): number {
  return problems
    .filter((p) => completedIds.includes(p.id))
    .reduce((sum, p) => sum + calculateXp(p), 0);
}
