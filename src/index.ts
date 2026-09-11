import { Hono } from "hono";
import { syncs } from "./routes/syncs";
import { users } from "./routes/users";
import type { Env, UserRow } from "./types";

type AppEnv = { Bindings: Env; Variables: { user: UserRow } };

const app = new Hono<AppEnv>();

app.get("/health", (c) => c.json({ status: "ok" }));

app.route("/users", users);
app.route("/syncs", syncs);

app.notFound((c) => c.json({ message: "not found" }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ message: "Internal Server Error" }, 500);
});

export default app;
