import { useEffect, useState } from "react";

import api from "../lib/api";

export default function SystemStatus() {
  const [status, setStatus] = useState({
    loading: true,
    ok: false,
    database: "unknown",
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
          detail: ""
        });
      } catch (error) {
        const detail = error?.response?.data?.detail || "API offline";

        if (!active) return;

        setStatus({
          loading: false,
          ok: false,
          database: error?.response?.data?.database || "unavailable",
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
      <span className={`${baseClass} border-slate-200 bg-white text-slate-600`}>
        <span className="h-2 w-2 rounded-full bg-slate-400" />
        Checking API...
      </span>
    );
  }

  if (status.ok) {
    const mode = status.database === "memory" ? "memory fallback" : status.database;

    return (
      <span className={`${baseClass} border-emerald-200 bg-emerald-50 text-emerald-800`}>
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        API online ({mode})
      </span>
    );
  }

  return (
    <span
      className={`${baseClass} border-amber-200 bg-amber-50 text-amber-800`}
      title={status.detail}
    >
      <span className="h-2 w-2 rounded-full bg-amber-500" />
      API degraded ({status.database})
    </span>
  );
}
