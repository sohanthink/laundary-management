// `npm run dev`: uses your real database when DATABASE_URL is set (in the
// environment or .env); otherwise starts the built-in local database.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function hasDatabaseUrl() {
  if (process.env.DATABASE_URL) return true;
  if (!existsSync(".env")) return false;
  return /^\s*DATABASE_URL\s*=\s*["']?[^"'\s#]+/m.test(readFileSync(".env", "utf8"));
}

if (hasDatabaseUrl()) {
  const next = spawn("npx", ["next", "dev"], { stdio: "inherit", shell: process.platform === "win32" });
  next.on("exit", (code) => process.exit(code ?? 0));
} else {
  console.log("No DATABASE_URL found in .env, so using the built-in local database.\n");
  await import("./dev-local.mjs");
}
