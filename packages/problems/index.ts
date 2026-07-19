import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";

export const problems: Problem[] = [where001].map(parseProblem);
