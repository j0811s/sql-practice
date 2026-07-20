import { Hono } from "hono";
import { problems } from "@sql-practice/problems";

export const problemsRoute = new Hono().get("/", (c) => c.json(problems));
