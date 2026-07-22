import { parseProblem, type Problem } from "@sql-practice/shared";
import where001 from "./where/001.json";
import where002 from "./where/002.json";
import where003 from "./where/003.json";
import where004 from "./where/004.json";
import orderby001 from "./orderby/001.json";
import orderby002 from "./orderby/002.json";
import orderby003 from "./orderby/003.json";
import orderby004 from "./orderby/004.json";
import groupby001 from "./groupby/001.json";
import groupby002 from "./groupby/002.json";
import groupby003 from "./groupby/003.json";
import groupby004 from "./groupby/004.json";
import join001 from "./join/001.json";
import join002 from "./join/002.json";
import join003 from "./join/003.json";

export const problems: Problem[] = [
  where001,
  where002,
  where003,
  where004,
  orderby001,
  orderby002,
  orderby003,
  orderby004,
  groupby001,
  groupby002,
  groupby003,
  groupby004,
  join001,
  join002,
  join003,
].map(parseProblem);
