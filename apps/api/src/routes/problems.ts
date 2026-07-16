import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { loadProblems } from "../problems/loadProblems";

const here = dirname(fileURLToPath(import.meta.url));
const PROBLEMS_DIR = resolve(here, "../../../../packages/problems");

export const problemsRoute = new Hono().get("/", (c) => c.json(loadProblems(PROBLEMS_DIR)));
