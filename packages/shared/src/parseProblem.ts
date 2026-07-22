import type { Problem } from "./types";

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function parseProblem(json: unknown): Problem {
  if (typeof json !== "object" || json === null) {
    throw new Error("Problem must be an object");
  }

  const candidate = json as Record<string, unknown>;

  if (typeof candidate.id !== "number") throw new Error("Problem.id must be a number");
  if (typeof candidate.title !== "string") throw new Error("Problem.title must be a string");
  if (typeof candidate.difficulty !== "number") {
    throw new Error("Problem.difficulty must be a number");
  }
  if (typeof candidate.category !== "string") {
    throw new Error("Problem.category must be a string");
  }
  if (typeof candidate.question !== "string") {
    throw new Error("Problem.question must be a string");
  }
  if (!isStringArray(candidate.schema)) throw new Error("Problem.schema must be a string array");
  if (!isStringArray(candidate.seed)) throw new Error("Problem.seed must be a string array");
  if (!Array.isArray(candidate.expectedResult)) {
    throw new Error("Problem.expectedResult must be an array");
  }
  if (!isStringArray(candidate.hint)) throw new Error("Problem.hint must be a string array");
  if (typeof candidate.answerQuery !== "string") {
    throw new Error("Problem.answerQuery must be a string");
  }
  if (typeof candidate.orderMatters !== "boolean") {
    throw new Error("Problem.orderMatters must be a boolean");
  }

  return candidate as unknown as Problem;
}
