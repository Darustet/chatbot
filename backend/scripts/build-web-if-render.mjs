import { spawnSync } from "child_process";

const isRender = Boolean(
  process.env.RENDER ||
  process.env.RENDER_SERVICE_ID ||
  process.env.RENDER_EXTERNAL_HOSTNAME
);

if (!isRender) {
  process.exit(0);
}

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["run", "build:web"],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}