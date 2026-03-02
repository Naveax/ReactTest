import { useState } from "react";

import { clearVerificationData, getVerificationData } from "../lib/activityStore";

export default function VerificationDataPage() {
  const [data, setData] = useState(() => getVerificationData());

  function refreshData() {
    setData(getVerificationData());
  }

  function clearData() {
    clearVerificationData();
    refreshData();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-board dark:border-slate-700 dark:bg-slate-900/85">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
              Verification Data
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Local history for created certificates and verification checks.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
              onClick={refreshData}
              type="button"
            >
              Refresh
            </button>
            <button
              className="rounded-full border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/40"
              onClick={clearData}
              type="button"
            >
              Clear data
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <CountCard label="Created certificates" value={data.createdCertificates.length} />
          <CountCard label="Verification checks" value={data.verificationChecks.length} />
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-board dark:border-slate-700 dark:bg-slate-900/85">
        <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
          Created Certificates
        </h3>
        {data.createdCertificates.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No created certificate records yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.createdCertificates.map((item) => (
              <article
                className="rounded-2xl border border-cyan-200 bg-cyan-50/60 p-4 dark:border-cyan-800/60 dark:bg-cyan-950/25"
                key={item.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.full_name} - {item.course_name}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="mt-2 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-2">
                  <MetaLine label="Score" value={String(item.score)} />
                  <MetaLine label="Issued At" value={item.issued_at} />
                  <MetaLine label="Language" value={item.language} />
                  <MetaLine label="Level" value={item.level} />
                  <MetaLine label="Certificate ID" value={item.certificate_id} mono />
                  <MetaLine label="Verification Code" value={item.verification_code} mono />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-board dark:border-slate-700 dark:bg-slate-900/85">
        <h3 className="font-display text-xl font-semibold text-slate-900 dark:text-slate-100">
          Verification Checks
        </h3>
        {data.verificationChecks.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No verification checks yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {data.verificationChecks.map((item) => (
              <article
                className={`rounded-2xl border p-4 ${
                  item.valid
                    ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-700/60 dark:bg-emerald-950/25"
                    : "border-amber-200 bg-amber-50/60 dark:border-amber-700/60 dark:bg-amber-950/25"
                }`}
                key={item.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {item.valid ? "Valid check" : "Invalid / Failed check"}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {new Date(item.checked_at).toLocaleString()}
                  </p>
                </div>
                <div className="mt-2 space-y-1 text-sm text-slate-700 dark:text-slate-200">
                  <MetaLine label="Code" value={item.code} mono />
                  {item.error && <MetaLine label="Error" value={item.error} />}
                  {item.certificate && (
                    <>
                      <MetaLine
                        label="Certificate"
                        value={`${item.certificate.full_name} - ${item.certificate.course_name}`}
                      />
                      <MetaLine
                        label="Certificate ID"
                        value={item.certificate.certificate_id}
                        mono
                      />
                      <MetaLine
                        label="Score / Level"
                        value={`${item.certificate.score} / ${item.certificate.level}`}
                      />
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

function CountCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">{value}</p>
    </div>
  );
}

function MetaLine({ label, value, mono = false }) {
  return (
    <p className="break-all">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
        {label}:
      </span>{" "}
      <span className={mono ? "font-mono text-slate-800 dark:text-slate-100" : "text-slate-800 dark:text-slate-100"}>{value || "-"}</span>
    </p>
  );
}
