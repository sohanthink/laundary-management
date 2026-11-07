// Runs the app with a built-in local Postgres (PGlite), so you can try it
// without a Neon account. Data is kept in .local-db/ between runs.
// Delete that folder to start fresh. For real use, set up Neon (see README).

import { spawn } from "node:child_process";
import { watch } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = 54329;
// pgbouncer=true turns off prepared statements, which PGlite's shared connection can't handle.
const url = `postgresql://postgres:postgres@127.0.0.1:${PORT}/postgres?sslmode=disable&connection_limit=1&pgbouncer=true`;

const env = {
  ...process.env,
  DATABASE_URL: url,
  DIRECT_URL: url,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "admin@annafi.local",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "admin12345",
  ADMIN_NAME: process.env.ADMIN_NAME || "Admin",
};

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: "inherit", shell: process.platform === "win32" });
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} ${args.join(" ")} failed`))));
  });
}

const db = await PGlite.create("./.local-db");
const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1", maxConnections: 10 });
await server.start();
console.log(`Local database running on port ${PORT} (data in .local-db/)`);

await run("npx", ["prisma", "migrate", "deploy"]);
await run("npx", ["prisma", "db", "seed"]);

console.log(`\n  Sign in at http://localhost:${process.env.PORT || 3000}/login`);
console.log(`  Email:    ${env.ADMIN_EMAIL}`);
console.log(`  Password: ${env.ADMIN_PASSWORD}\n`);

let next = null;
let restarting = false;

function startNext() {
  next = spawn("npx", ["next", "dev"], { env, stdio: "inherit", shell: process.platform === "win32" });
  next.on("exit", () => {
    if (!restarting) shutdown();
  });
}

function stopNext() {
  return new Promise((resolve) => {
    if (!next || next.exitCode !== null) return resolve();
    next.once("exit", resolve);
    next.kill("SIGINT");
  });
}

// When a new database update (migration) arrives, apply it and restart the app,
// so the running server never uses an old database layout.
let timer = null;
watch("prisma/migrations", { recursive: true }, () => {
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (restarting) return;
    restarting = true;
    console.log("\n  Database update found: applying it and restarting the app...\n");
    try {
      await stopNext();
      await run("npx", ["prisma", "migrate", "deploy"]);
      await run("npx", ["prisma", "generate"]);
    } catch (error) {
      console.error(error);
    }
    restarting = false;
    startNext();
  }, 1500);
});

async function shutdown() {
  await stopNext();
  await server.stop();
  await db.close();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
startNext();
