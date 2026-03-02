import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import SystemStatus from "./SystemStatus";

const THEME_KEY = "reacty_theme";

function resolveInitialTheme() {
  if (typeof window === "undefined") return "light";

  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch (_err) {
    // ignore storage read failures
  }

  const hour = new Date().getHours();
  if (hour >= 19 || hour < 7) {
    return "dark";
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

function navClassName({ isActive }) {
  return [
    "shrink-0 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition sm:px-4",
    isActive
      ? "bg-slate-900 text-white dark:bg-cyan-400 dark:text-slate-950"
      : "bg-white/70 text-slate-700 hover:bg-white dark:bg-slate-800/80 dark:text-slate-200 dark:hover:bg-slate-700"
  ].join(" ");
}

export default function AppLayout({ children }) {
  const [theme, setTheme] = useState(resolveInitialTheme);

  useEffect(() => {
    applyTheme(theme);
    try {
      window.localStorage.setItem(THEME_KEY, theme);
    } catch (_err) {
      // ignore storage write failures
    }
  }, [theme]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
      <header className="relative mb-8 rounded-3xl border border-white/70 bg-gradient-to-r from-white/80 to-cyan-50/80 p-5 shadow-board backdrop-blur dark:border-slate-700 dark:from-slate-900/90 dark:to-cyan-950/60">
        <button
          aria-label="Toggle theme"
          className="absolute right-4 top-4 rounded-full border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 sm:right-5 sm:top-5"
          onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          type="button"
        >
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="pr-28 sm:pr-32">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">
              Certificate Platform
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900 dark:text-slate-100">
              Generator + Public Verification
            </h1>
            <div className="mt-3">
              <SystemStatus />
            </div>
          </div>
          <div className="flex w-full max-w-full flex-nowrap items-center gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible">
            <NavLink className={navClassName} to="/" end>
              Create
            </NavLink>
            <NavLink className={navClassName} to="/verify">
              Verify
            </NavLink>
            <NavLink className={navClassName} to="/logs">
              Logs
            </NavLink>
            <NavLink className={navClassName} to="/data">
              Verifications
            </NavLink>
          </div>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
