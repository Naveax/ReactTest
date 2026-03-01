const fs = require("fs");
const net = require("net");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const rootDir = process.cwd();
const apiDir = path.join(rootDir, "apps", "api");
const webDir = path.join(rootDir, "apps", "web");

const checks = [];

function addCheck(name, status, detail) {
  checks.push({ name, status, detail });
}

function runCommand(cmd, args, options) {
  return spawnSync(
    cmd,
    args,
    Object.assign(
      {
        encoding: "utf8",
        shell: process.platform === "win32"
      },
      options || {}
    )
  );
}

function findInPath(commandName) {
  const tool = process.platform === "win32" ? "where" : "which";
  const result = runCommand(tool, [commandName]);
  if (result.status !== 0 || !result.stdout) return null;
  const first = result.stdout.split(/\r?\n/).filter(Boolean)[0];
  return first || null;
}

function findBun() {
  if (process.env.BUN_BIN && fs.existsSync(process.env.BUN_BIN)) {
    return process.env.BUN_BIN;
  }

  const homeBun = path.join(os.homedir(), ".bun", "bin", process.platform === "win32" ? "bun.exe" : "bun");
  if (fs.existsSync(homeBun)) {
    return homeBun;
  }

  return findInPath("bun");
}

function parseMajorMinor(versionText) {
  const match = String(versionText || "").match(/(\d+)\.(\d+)/);
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]) };
}

function checkPort(host, port, timeoutMs) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    function finish(ok, detail) {
      if (settled) return;
      settled = true;
      try {
        socket.destroy();
      } catch (_err) {
        // ignore
      }
      resolve({ ok, detail });
    }

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true, `${host}:${port} is reachable`));
    socket.once("timeout", () => finish(false, `${host}:${port} timed out`));
    socket.once("error", (err) => finish(false, `${host}:${port} error: ${err.message}`));
    socket.connect(port, host);
  });
}

async function main() {
  const bunPath = findBun();
  if (!bunPath) {
    addCheck("Bun", "fail", "bun executable not found. Install from https://bun.sh");
  } else {
    const versionResult = runCommand(bunPath, ["--version"]);
    const version = (versionResult.stdout || "").trim();
    addCheck("Bun", versionResult.status === 0 ? "pass" : "fail", version || versionResult.stderr || "unable to read version");
  }

  const nodePath = findInPath("node");
  if (!nodePath) {
    addCheck("Node", "warn", "node not found in PATH");
  } else {
    const nodeVersionResult = runCommand(nodePath, ["-v"]);
    const nodeVersion = (nodeVersionResult.stdout || "").trim();
    const mm = parseMajorMinor(nodeVersion);
    if (!mm) {
      addCheck("Node", "warn", `unable to parse version: ${nodeVersion || "unknown"}`);
    } else if (mm.major < 14) {
      addCheck("Node", "warn", `${nodeVersion} detected. Legacy Node may break modern CLIs; use Bun runtime scripts.`);
    } else {
      addCheck("Node", "pass", nodeVersion);
    }
  }

  const pdmPath = findInPath("pdm");
  if (!pdmPath) {
    addCheck("PDM", "fail", "pdm not found in PATH");
  } else {
    const pdmVersionResult = runCommand(pdmPath, ["--version"]);
    addCheck("PDM", pdmVersionResult.status === 0 ? "pass" : "fail", (pdmVersionResult.stdout || pdmVersionResult.stderr || "").trim());
  }

  const venvPython = process.platform === "win32"
    ? path.join(apiDir, ".venv", "Scripts", "python.exe")
    : path.join(apiDir, ".venv", "bin", "python");
  if (fs.existsSync(venvPython)) {
    const pyVersionResult = runCommand(venvPython, ["-c", "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}')"]);
    const pyVersion = (pyVersionResult.stdout || "").trim();
    const mm = parseMajorMinor(pyVersion);
    if (pyVersionResult.status !== 0 || !mm) {
      addCheck("API Python", "fail", pyVersionResult.stderr || "unable to read .venv python version");
    } else if (mm.major < 3 || (mm.major === 3 && mm.minor < 11)) {
      addCheck("API Python", "fail", `${pyVersion} detected in .venv; requires >=3.11`);
    } else {
      addCheck("API Python", "pass", pyVersion);
    }
  } else {
    addCheck("API Python", "warn", ".venv python not found yet. Run: bun run setup");
  }

  if (fs.existsSync(path.join(apiDir, ".env"))) {
    addCheck("apps/api/.env", "pass", "present");
  } else {
    addCheck("apps/api/.env", "warn", "missing. Run: cp apps/api/.env.example apps/api/.env");
  }

  if (fs.existsSync(path.join(webDir, ".env"))) {
    addCheck("apps/web/.env", "pass", "present");
  } else {
    addCheck("apps/web/.env", "warn", "missing. Run: cp apps/web/.env.example apps/web/.env");
  }

  const dockerPath = findInPath("docker");
  if (!dockerPath) {
    addCheck("Docker CLI", "warn", "docker not found in PATH");
  } else {
    const dockerInfoResult = runCommand(dockerPath, ["info", "--format", "{{.ServerVersion}}"]);
    if (dockerInfoResult.status !== 0) {
      addCheck("Docker daemon", "warn", "docker daemon is not reachable");
    } else {
      addCheck("Docker daemon", "pass", `server ${String(dockerInfoResult.stdout || "").trim()}`);
    }
  }

  const mongoPort = await checkPort("127.0.0.1", 27017, 1200);
  addCheck("MongoDB port 27017", mongoPort.ok ? "pass" : "warn", mongoPort.detail);

  const apiPort = await checkPort("127.0.0.1", 8000, 1200);
  addCheck("API port 8000", apiPort.ok ? "pass" : "warn", apiPort.detail);

  const maxName = checks.reduce((acc, item) => Math.max(acc, item.name.length), 0);
  const statusText = { pass: "PASS", warn: "WARN", fail: "FAIL" };
  for (const item of checks) {
    const pad = " ".repeat(maxName - item.name.length);
    console.log(`[${statusText[item.status]}] ${item.name}${pad}  ${item.detail}`);
  }

  const hasFail = checks.some((item) => item.status === "fail");
  if (hasFail) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
