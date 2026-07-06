import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const nextPkg = path.dirname(require.resolve("next/package.json"));
const nextBin = path.join(nextPkg, "dist", "bin", "next");

const existing = process.env.NODE_OPTIONS?.trim();
process.env.NODE_OPTIONS = [existing, "--use-system-ca"].filter(Boolean).join(" ");

const child = spawn(process.execPath, [nextBin, "dev"], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
