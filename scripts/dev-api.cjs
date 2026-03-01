const { spawn, spawnSync } = require("node:child_process");
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
    console.log("[API] Windows ile uyumsuz .venv bulundu, yeniden olusturuluyor...");
    rmSync(venvDir, { recursive: true, force: true });
    return;
  }

  if (process.platform !== "win32" && existsSync(winPath) && !existsSync(posixPath)) {
    console.log("[API] Linux/macOS ile uyumsuz .venv bulundu, yeniden olusturuluyor...");
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

  const query = spawnSync("sh", ["-lc", "lsof -ti tcp:8000"], { encoding: "utf8" });
  if (query.status !== 0 || !query.stdout) return;

  for (const pid of query.stdout.split(/\s+/).filter(Boolean)) {
    spawnSync("kill", ["-9", pid], { stdio: "ignore" });
  }
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

function stopApiProcesses() {
  killStaleUvicornProcesses();
  killProcessOnPort8000();
}

function resolveVenvPython() {
  const winPath = path.join(apiDir, ".venv", "Scripts", "python.exe");
  const posixPath = path.join(apiDir, ".venv", "bin", "python");

  if (process.platform === "win32") {
    if (existsSync(winPath)) return winPath;
    return null;
  }

  if (existsSync(posixPath)) return posixPath;
  if (existsSync(winPath)) return winPath;
  return null;
}

function runPdmInstall() {
  removePdmPythonPointer();

  const result = spawnSync("pdm", ["install"], {
    cwd: apiDir,
    stdio: "inherit",
    shell: true
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function hasRequiredModules(pythonExecPath) {
  const result = spawnSync(
    pythonExecPath,
    ["-c", "import fastapi, motor, pydantic, pydantic_core; print('ok')"],
    {
      cwd: apiDir,
      stdio: "ignore"
    }
  );
  return result.status === 0;
}

function ensureVenvReady() {
  removeIncompatibleVenv();

  let pythonExec = resolveVenvPython();
  if (!pythonExec) {
    console.log("[API] .venv python bulunamadi, pdm install calistiriliyor...");
    runPdmInstall();
    pythonExec = resolveVenvPython();
  }

  if (pythonExec && !hasRequiredModules(pythonExec)) {
    console.log("[API] Eksik Python paketleri tespit edildi, pdm install calistiriliyor...");
    runPdmInstall();
    pythonExec = resolveVenvPython();
  }

  if (!pythonExec) {
    console.error("[API] .venv python hala bulunamadi. apps/api icinde pdm install calistir.");
    process.exit(1);
  }

  return pythonExec;
}

stopApiProcesses();
const pythonExec = ensureVenvReady();
stopApiProcesses();

const args = ["-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"];

// Stable default: no reload to avoid watch loops on Windows venv creation.
if (process.env.API_RELOAD === "1") {
  args.push(
    "--reload",
    "--reload-dir",
    "app",
    "--reload-exclude",
    ".venv",
    "--reload-exclude",
    "__pycache__"
  );
}

const child = spawn(pythonExec, args, {
  cwd: apiDir,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code || 0);
});
