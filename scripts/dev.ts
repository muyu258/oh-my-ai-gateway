export {};

const rawPort = process.env.APP_PORT?.trim() || "3000";
const port = Number(rawPort);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`APP_PORT must be an integer between 1 and 65535. Received: ${rawPort}`);
}

const next = Bun.spawn(["bun", "x", "next", "dev", "--port", rawPort], {
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  env: process.env,
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => next.kill(signal));
}

process.exit(await next.exited);
