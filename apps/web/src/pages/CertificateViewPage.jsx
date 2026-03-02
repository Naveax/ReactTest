import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import api, { getApiError } from "../lib/api";

export default function CertificateViewPage() {
  const { certificate_id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certificate, setCertificate] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCertificate() {
      setLoading(true);
      setError("");

      try {
        const response = await api.get(`/api/certificates/${certificate_id}`);
        if (!cancelled) {
          setCertificate(response.data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(getApiError(requestError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCertificate();

    return () => {
      cancelled = true;
    };
  }, [certificate_id]);

  const scoreLabel = useMemo(() => {
    if (!certificate) {
      return "";
    }

    if (certificate.score >= 90) return "Excellent";
    if (certificate.score >= 75) return "Strong";
    if (certificate.score >= 60) return "Competent";
    return "Developing";
  }, [certificate]);

  if (loading) {
    return <StatusCard text="Loading certificate..." tone="info" />;
  }

  if (error) {
    return <StatusCard text={error} tone="error" />;
  }

  if (!certificate) {
    return <StatusCard text="Certificate not found." tone="error" />;
  }

  return (
    <section className="rounded-[2rem] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-cyan-50 p-8 shadow-board dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-cyan-950">
      <p className="font-mono text-xs uppercase tracking-[0.24em] text-amber-700 dark:text-cyan-300">
        Public Certificate
      </p>
      <h2 className="mt-3 font-display text-4xl font-bold text-slate-900 dark:text-slate-100">
        Certificate of Achievement
      </h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        This certificate confirms successful completion and verified assessment.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="space-y-6">
          <Detail label="Awarded to" value={certificate.full_name} big />
          <Detail label="Course / Exam" value={certificate.course_name} />

          <div className="grid gap-4 sm:grid-cols-3">
            <Detail label="Language" value={certificate.language} />
            <Detail label="Level" value={certificate.level} />
            <Detail
              label="Issued at"
              value={new Date(certificate.issued_at).toLocaleDateString()}
            />
          </div>

          <Detail label="Certificate ID" value={certificate.certificate_id} mono />
        </div>

        <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-8 border-amber-300 bg-white text-center shadow dark:border-cyan-700 dark:bg-slate-800">
          <div>
            <p className="font-display text-4xl font-bold text-slate-900 dark:text-slate-100">{certificate.score}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">{scoreLabel}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Detail({ label, value, mono = false, big = false }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">{label}</p>
      <p
        className={[
          "mt-1 text-slate-900 dark:text-slate-100",
          mono ? "font-mono text-sm" : "",
          big ? "font-display text-3xl font-semibold" : "text-lg"
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function StatusCard({ text, tone }) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-200"
      : "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-200";

  return (
    <div className={`rounded-2xl border px-5 py-4 ${className}`}>
      <p>{text}</p>
    </div>
  );
}
