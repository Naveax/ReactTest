import { useMemo, useState } from "react";

import { clearLogs, getLogs } from "../lib/activityStore";

const statusClassMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-rose-200 bg-rose-50 text-rose-800",
  info: "border-cyan-200 bg-cyan-50 text-cyan-800"
};

export default function LogsPage() {
  const [logs, setLogs] = useState(() => getLogs());

  const groupedCounts = useMemo(() => {
    return logs.reduce(
      (acc, item) => {
        const status = item.status || "info";
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { success: 0, warning: 0, error: 0, info: 0 }
    );
  }, [logs]);

  function refreshLogs() {
    setLogs(getLogs());
  }

  function clearAllLogs() {
    clearLogs();
    refreshLogs();
  }

  return (
    <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-board">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-semibold text-slate-900">Logs</h2>
          <p className="mt-1 text-sm text-slate-600">
            Create and Verify actions are recorded here.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={refreshLogs}
            type="button"
          >
            Refresh
          </button>
          <button
            className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50"
            onClick={clearAllLogs}
            type="button"
          >
            Clear logs
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <StatChip label="Total" value={String(logs.length)} />
        <StatChip label="Success" value={String(groupedCounts.success)} tone="success" />
        <StatChip label="Warning" value={String(groupedCounts.warning)} tone="warning" />
        <StatChip label="Error" value={String(groupedCounts.error)} tone="error" />
      </div>

      {logs.length === 0 ? (
        <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          No logs yet.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((item) => {
            const tone = statusClassMap[item.status] || statusClassMap.info;

            return (
              <article
                className={`rounded-2xl border px-4 py-3 text-sm ${tone}`}
                key={item.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.title || "Log entry"}</p>
                  <p className="font-mono text-xs">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                {item.message && <p className="mt-1 break-all">{item.message}</p>}
                <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.12em]">
                  type: {item.type || "unknown"} | status: {item.status || "info"}
                </p>
                {item.meta && (
                  <pre className="mt-2 overflow-auto rounded-xl bg-white/50 p-2 font-mono text-xs text-slate-700">
                    {JSON.stringify(item.meta, null, 2)}
                  </pre>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function StatChip({ label, value, tone = "default" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${toneClass}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em]">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
