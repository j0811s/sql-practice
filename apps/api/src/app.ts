import { Hono } from "hono";
import { problemsRoute } from "./routes/problems";

export const app = new Hono();

app.get("/api/health", (c) => c.json({ status: "ok" }));
app.route("/api/problems", problemsRoute);
