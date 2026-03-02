import { useEffect, useState } from "react";

import api from "../lib/api";

export default function SystemStatus() {
  const [status, setStatus] = useState({
    loading: true,
    ok: false,
    database: "unknown",
    dbName: "",
    collection: "",
    detail: ""
  });

  useEffect(() => {
    let active = true;

    async function loadStatus() {
      try {
        const response = await api.get("/health", { timeout: 5000 });
        if (!active) return;

        setStatus({
          loading: false,
          ok: true,
          database: response.data?.database || "unknown",
          dbName: response.data?.db_name || "",
          collection: response.data?.collection || "",
          detail: ""
        });
      } catch (error) {
        const detail = error?.response?.data?.detail || "API offline";

        if (!active) return;

        setStatus({
          loading: false,
          ok: false,
          database: error?.response?.data?.database || "unavailable",
          dbName: error?.response?.data?.db_name || "",
          collection: error?.response?.data?.collection || "",
          detail
        });
      }
    }

    loadStatus();
    const timer = setInterval(loadStatus, 12000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const baseClass =
    "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium";

  if (status.loading) {
    return (
      <span className={`${baseClass} border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300`}>
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Checking API...
      </span>
    );
  }

  if (status.ok) {
    const mode = status.database === "memory" ? "memory fallback" : status.database;
    const location =
      status.dbName && status.collection
        ? `${status.dbName}.${status.collection}`
        : status.dbName || status.collection || "";
    const label = location ? `${mode} | ${location}` : mode;

    return (
      <span className={`${baseClass} border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/60 dark:bg-emerald-950/40 dark:text-emerald-200`}>
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        API online ({label})
      </span>
    );
  }

  return (
    <span
      className={`${baseClass} border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200`}
      title={status.detail}
    >
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      API degraded ({status.database})
    </span>
  );
}
