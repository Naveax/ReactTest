import { useMemo, useState } from "react";

import api, { getApiError } from "../lib/api";
import { appendCreatedCertificate, appendLog } from "../lib/activityStore";

const defaultIssuedAt = new Date().toISOString().slice(0, 10);

const initialForm = {
  full_name: "",
  course_name: "",
  score: "",
  issued_at: defaultIssuedAt,
  language: "English",
  level: "B2"
};

export default function CreateCertificatePage() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      form.full_name.trim().length >= 2 &&
      form.course_name.trim().length >= 2 &&
      form.score !== "" &&
      form.issued_at !== "" &&
      form.language.trim().length >= 2 &&
      form.level.trim().length >= 1
    );
  }, [form]);

  function onChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const payload = {
        ...form,
        score: Number(form.score)
      };

      const response = await api.post("/api/certificates", payload);
      setResult(response.data);
      appendCreatedCertificate(payload, response.data);
      appendLog({
        type: "create",
        status: "success",
        title: "Certificate created",
        message: `${payload.full_name} - ${payload.course_name}`,
        meta: {
          certificate_id: response.data?.certificate_id,
          verification_code: response.data?.verification_code
        }
      });
      setForm((prev) => ({ ...initialForm, issued_at: prev.issued_at }));
    } catch (requestError) {
      const errorMessage = getApiError(requestError);
      setError(errorMessage);
      appendLog({
        type: "create",
        status: "error",
        title: "Certificate create failed",
        message: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-board lg:col-span-3 dark:border-slate-700 dark:bg-slate-900/85">
        <h2 className="font-display text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Create Certificate
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
          Fill all fields. Backend validates data with Pydantic and stores it in
          MongoDB.
        </p>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <Field label="Full name" name="full_name" value={form.full_name} onChange={onChange} />
          <Field label="Course / Exam name" name="course_name" value={form.course_name} onChange={onChange} />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Score (0-100)"
              name="score"
              value={form.score}
              onChange={onChange}
              type="number"
              min="0"
              max="100"
            />
            <Field
              label="Issued at"
              name="issued_at"
              value={form.issued_at}
              onChange={onChange}
              type="date"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Language" name="language" value={form.language} onChange={onChange} />
            <Field label="Level" name="level" value={form.level} onChange={onChange} />
          </div>

          <button
            className="inline-flex items-center rounded-full bg-cyan-700 px-6 py-3 font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-cyan-300 dark:bg-cyan-600 dark:hover:bg-cyan-500 dark:disabled:bg-cyan-900"
            disabled={loading || !canSubmit}
            type="submit"
          >
            {loading ? "Creating..." : "Create certificate"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}
      </section>

      <aside className="rounded-3xl border border-cyan-200 bg-cyan-950 p-6 text-cyan-50 shadow-board lg:col-span-2 dark:border-cyan-800 dark:bg-slate-900">
        <h3 className="font-display text-xl font-semibold">Last creation result</h3>

        {!result && (
          <p className="mt-4 text-sm text-cyan-100/80">
            Submit the form to get a `certificate_id` and `verification_code`.
          </p>
        )}

        {result && (
          <div className="mt-4 space-y-4 text-sm">
            <ResultRow label="Certificate ID" value={result.certificate_id} />
            <ResultRow label="Verification Code" value={result.verification_code} />

            <a
              className="block rounded-xl bg-white/10 px-4 py-3 text-center font-medium text-cyan-50 transition hover:bg-white/20"
              href={`/c/${result.certificate_id}`}
            >
              Open public certificate
            </a>
          </div>
        )}
      </aside>
    </div>
  );
}

function Field({ label, name, value, onChange, type = "text", ...rest }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-slate-900 outline-none ring-cyan-300 transition focus:border-cyan-500 focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-cyan-400"
        name={name}
        onChange={onChange}
        required
        type={type}
        value={value}
        {...rest}
      />
    </label>
  );
}

function ResultRow({ label, value }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-cyan-200">{label}</p>
      <p className="mt-1 break-all rounded-xl bg-white/10 px-3 py-2 text-cyan-50">{value}</p>
    </div>
  );
}
