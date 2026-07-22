import { describe, expect, it } from "vitest";
import { shuffle } from "./shuffle";

describe("shuffle", () => {
  it("returns a new array without mutating the input", () => {
    const input = [1, 2, 3];
    const result = shuffle(input, () => 0);
    expect(input).toEqual([1, 2, 3]);
    expect(result).not.toBe(input);
  });

  it("keeps the same elements (as a multiset)", () => {
    const result = shuffle(["a", "b", "c", "d"], () => 0.5);
    expect(result.slice().sort()).toEqual(["a", "b", "c", "d"]);
  });

  it("is deterministic for an injected random source", () => {
    const random = () => 0; // Fisher-Yates with random()===0 always swaps with index 0
    expect(shuffle([1, 2, 3, 4], random)).toEqual([4, 1, 2, 3]);
  });
});
