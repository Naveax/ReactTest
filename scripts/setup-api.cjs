const { spawnSync } = require("node:child_process");
const { existsSync, unlinkSync, rmSync } = require("node:fs");
const path = require("node:path");
const process = require("node:process");

const rootDir = process.cwd();
const apiDir = path.join(rootDir, "apps", "api");

function removePdmPythonPointer() {
  const pdmPythonPointer = path.join(apiDir, ".pdm-python");
  if (!existsSync(pdmPythonPointer)) return;
  try {
    unlinkSync(pdmPythonPointer);
  } catch (_err) {
    // ignore
  }
}

function removeIncompatibleVenv() {
  const venvDir = path.join(apiDir, ".venv");
  const winPath = path.join(venvDir, "Scripts", "python.exe");
  const posixPath = path.join(venvDir, "bin", "python");

  if (!existsSync(venvDir)) return;

  if (process.platform === "win32" && existsSync(posixPath) && !existsSync(winPath)) {
    console.log("[setup:api] Windows ile uyumsuz .venv siliniyor...");
    rmSync(venvDir, { recursive: true, force: true });
    return;
  }

  if (process.platform !== "win32" && existsSync(winPath) && !existsSync(posixPath)) {
    console.log("[setup:api] Linux/macOS ile uyumsuz .venv siliniyor...");
    rmSync(venvDir, { recursive: true, force: true });
  }
}

function collectWindowsPidsOnPort(port) {
  const cmd = [
    "try {",
    `  $p = Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique;`,
    "  if ($p) { $p -join ' ' }",
    "} catch { }"
  ].join(" ");
  const out = spawnSync("powershell", ["-NoProfile", "-Command", cmd], {
    encoding: "utf8",
    shell: true
  });
  if (out.status !== 0 || !out.stdout) return [];
  return out.stdout
    .trim()
    .split(/\s+/)
    .filter((x) => /^\d+$/.test(x));
}

function killProcessOnPort8000() {
  if (process.platform === "win32") {
    const pidsFromPs = collectWindowsPidsOnPort(8000);
    for (const pid of pidsFromPs) {
      spawnSync("taskkill", ["/PID", pid, "/F"], { stdio: "ignore", shell: true });
    }

    const query = spawnSync("cmd", ["/c", "netstat -ano -p tcp | findstr :8000"], {
      encoding: "utf8",
      shell: true
    });

    if (query.status !== 0 || !query.stdout) return;

    const pids = new Set();
    for (const line of query.stdout.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }

    for (const pid of pids) {
      spawnSync("taskkill", ["/PID", pid, "/F"], { stdio: "ignore", shell: true });
    }
    return;
  }

  spawnSync("sh", ["-lc", "lsof -ti tcp:8000 | xargs -r kill -9"], {
    stdio: "ignore"
  });
}

function killStaleUvicornProcesses() {
  if (process.platform === "win32") {
    spawnSync(
      "powershell",
      [
        "-NoProfile",
        "-Command",
        [
          "$procs = Get-CimInstance Win32_Process | Where-Object {",
          "  $_.CommandLine -and $_.CommandLine -match 'uvicorn' -and $_.CommandLine -match 'app\\.main:app'",
          "};",
          "$procs | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
        ].join(" ")
      ],
      { stdio: "ignore", shell: true }
    );
    return;
  }

  spawnSync("sh", ["-lc", "pkill -f 'uvicorn app.main:app' || true"], {
    stdio: "ignore"
  });
}

function runPdmInstall() {
  const result = spawnSync("pdm", ["install"], {
    cwd: apiDir,
    stdio: "inherit",
    shell: true
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

removePdmPythonPointer();
removeIncompatibleVenv();
killStaleUvicornProcesses();
killProcessOnPort8000();
runPdmInstall();
console.log("[setup:api] done");
