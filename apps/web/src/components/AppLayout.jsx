import { NavLink } from "react-router-dom";
import SystemStatus from "./SystemStatus";

function navClassName({ isActive }) {
  return [
    "rounded-full px-4 py-2 text-sm font-medium transition",
    isActive
      ? "bg-slate-900 text-white"
      : "bg-white/70 text-slate-700 hover:bg-white"
  ].join(" ");
}

export default function AppLayout({ children }) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-10 pt-8 sm:px-6 lg:px-8">
      <header className="mb-8 rounded-3xl border border-white/70 bg-gradient-to-r from-white/80 to-cyan-50/80 p-5 shadow-board backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-700">
              Certificate Platform
            </p>
            <h1 className="mt-1 font-display text-3xl font-bold text-slate-900">
              Generator + Public Verification
            </h1>
            <div className="mt-3">
              <SystemStatus />
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
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
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </div>
  );
}
