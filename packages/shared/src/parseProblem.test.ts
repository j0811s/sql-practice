import { describe, expect, it } from "vitest";
import { parseProblem } from "./parseProblem";

const validProblem = {
  id: 1,
  title: "20歳以上を取得",
  difficulty: 1,
  category: "WHERE",
  question: "usersテーブルから20歳以上のユーザーを取得してください。",
  schema: ["CREATE TABLE users(id INTEGER,name TEXT,age INTEGER);"],
  seed: [
    "INSERT INTO users VALUES(1,'Alice',22);",
    "INSERT INTO users VALUES(2,'Bob',18);",
    "INSERT INTO users VALUES(3,'Carol',35);",
  ],
  expectedResult: [
    { id: 1, name: "Alice", age: 22 },
    { id: 3, name: "Carol", age: 35 },
  ],
  hint: ["WHERE句を使います。", "『以上』なので比較演算子を確認してみましょう。"],
};

describe("parseProblem", () => {
  it("returns the problem when the shape is valid", () => {
    expect(parseProblem(validProblem)).toEqual(validProblem);
  });

  it("throws when a required field has the wrong type", () => {
    expect(() => parseProblem({ ...validProblem, id: "1" })).toThrow("Problem.id must be a number");
  });

  it("throws when given a non-object", () => {
    expect(() => parseProblem(null)).toThrow("Problem must be an object");
  });
});
