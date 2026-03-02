import { useState } from "react";

import api, { getApiError } from "../lib/api";
import { appendLog, appendVerificationCheck } from "../lib/activityStore";

export default function VerifyPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const trimmedCode = code.trim();

    try {
      const response = await api.get("/api/certificates/verify", {
        params: { code: trimmedCode }
      });
      setResult(response.data);
      appendVerificationCheck({ code: trimmedCode, result: response.data });

      appendLog({
        type: "verify",
        status: response.data?.valid ? "success" : "warning",
        title: response.data?.valid ? "Verification succeeded" : "Verification invalid",
        message: trimmedCode,
        meta: response.data?.certificate
          ? {
              certificate_id: response.data.certificate.certificate_id,
              full_name: response.data.certificate.full_name
            }
          : null
      });
    } catch (requestError) {
      const errorMessage = getApiError(requestError);
      setResult(null);
      setError(errorMessage);
      appendVerificationCheck({ code: trimmedCode, result: null, error: errorMessage });
      appendLog({
        type: "verify",
        status: "error",
        title: "Verification request failed",
        message: errorMessage,
        meta: { code: trimmedCode }
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-board lg:col-span-3 dark:border-slate-700 dark:bg-slate-900/85">
        <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Verify Certificate Code
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Enter the public verification code and check whether it is valid.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Verification code
            </span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 font-mono text-sm text-slate-900 outline-none ring-cyan-300 transition focus:border-cyan-500 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-cyan-400"
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste code"
              required
              value={code}
            />
          </label>

          <button
            className="inline-flex items-center rounded-full bg-emerald-700 px-6 py-3 font-medium text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-emerald-300 dark:bg-emerald-600 dark:hover:bg-emerald-500 dark:disabled:bg-emerald-900"
            disabled={loading || !code.trim()}
            type="submit"
          >
            {loading ? "Checking..." : "Verify"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-board lg:col-span-2 dark:border-slate-700 dark:bg-slate-900/85">
        <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">Result</h3>

        {!result && !error && (
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">No verification yet.</p>
        )}

        {result?.valid && result?.certificate && (
          <div className="mt-4 space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-700/60 dark:bg-emerald-950/30 dark:text-emerald-100">
            <p className="font-semibold">Valid certificate</p>
            <Line label="Name" value={result.certificate.full_name} />
            <Line label="Course" value={result.certificate.course_name} />
            <Line label="Score" value={String(result.certificate.score)} />
            <Line label="Level" value={result.certificate.level} />
            <a
              className="inline-block rounded-full bg-emerald-700 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500"
              href={`/c/${result.certificate.certificate_id}`}
            >
              Open public page
            </a>
          </div>
        )}

        {result && !result.valid && (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-800/60 dark:bg-rose-950/30 dark:text-rose-200">
            Invalid code
          </div>
        )}
      </aside>
    </div>
  );
}

function Line({ label, value }) {
  return (
    <div>
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">{label}</p>
      <p className="text-emerald-900 dark:text-emerald-100">{value}</p>
    </div>
  );
}
