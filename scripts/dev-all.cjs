const { existsSync } = require("fs");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const process = require("process");

function findBunExecutable() {
  if (process.env.BUN_BIN && existsSync(process.env.BUN_BIN)) {
    return process.env.BUN_BIN;
  }

  const localBun = path.join(process.env.HOME || "", ".bun", "bin", "bun");
  if (existsSync(localBun)) {
    return localBun;
  }

  const whereCmd = process.platform === "win32" ? "where" : "which";
  const lookup = spawnSync(whereCmd, ["bun"], { encoding: "utf8", shell: true });
  if (lookup.status === 0 && lookup.stdout) {
    return lookup.stdout.split(/\r?\n/).filter(Boolean)[0];
  }

  return null;
}

const bunPath = findBunExecutable();

if (!bunPath) {
  console.error("[dev] Bun bulunamadi. Once Bun kurun: https://bun.sh");
  process.exit(1);
}

const children = [];
let exiting = false;

function killAll(signal) {
  if (exiting) return;
  exiting = true;

  for (const child of children) {
    if (!child.killed) {
      try {
        child.kill(signal || "SIGTERM");
      } catch (_err) {
        // ignore
      }
    }
  }
}

function runScript(scriptName) {
  const child = spawn(bunPath, ["run", scriptName], {
    cwd: process.cwd(),
    stdio: "inherit",
    shell: false
  });

  child.on("exit", (code, signal) => {
    if (exiting) return;

    const reason = signal ? `signal ${signal}` : `code ${code}`;
    console.error(`[dev] ${scriptName} exited (${reason}), shutting down other processes...`);
    killAll("SIGTERM");
    process.exit(typeof code === "number" && code !== 0 ? code : 1);
  });

  children.push(child);
}

runScript("dev:api");
runScript("dev:web");

process.on("SIGINT", () => {
  killAll("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  killAll("SIGTERM");
  process.exit(0);
});
