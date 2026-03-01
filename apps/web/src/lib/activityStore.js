const STORAGE_KEY = "certificate_app_activity_v1";
const MAX_LOGS = 300;
const MAX_CREATED = 200;
const MAX_CHECKS = 300;

const EMPTY_STATE = {
  logs: [],
  createdCertificates: [],
  verificationChecks: []
};

function hasStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function readState() {
  if (!hasStorage()) return { ...EMPTY_STATE };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_STATE };

    const parsed = JSON.parse(raw);
    return {
      logs: normalizeArray(parsed.logs),
      createdCertificates: normalizeArray(parsed.createdCertificates),
      verificationChecks: normalizeArray(parsed.verificationChecks)
    };
  } catch {
    return { ...EMPTY_STATE };
  }
}

function writeState(state) {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function createId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function pushFrontWithLimit(items, nextItem, max) {
  return [nextItem, ...items].slice(0, max);
}

export function getLogs() {
  return readState().logs;
}

export function getVerificationData() {
  const state = readState();
  return {
    createdCertificates: state.createdCertificates,
    verificationChecks: state.verificationChecks
  };
}

export function appendLog({ type, status, title, message = "", meta = null }) {
  const state = readState();
  const entry = {
    id: createId("log"),
    type,
    status,
    title,
    message,
    meta,
    created_at: new Date().toISOString()
  };

  writeState({
    ...state,
    logs: pushFrontWithLimit(state.logs, entry, MAX_LOGS)
  });
}

export function appendCreatedCertificate(formPayload, responsePayload) {
  const state = readState();
  const entry = {
    id: createId("crt"),
    created_at: new Date().toISOString(),
    ...formPayload,
    certificate_id: responsePayload?.certificate_id || "",
    verification_code: responsePayload?.verification_code || ""
  };

  writeState({
    ...state,
    createdCertificates: pushFrontWithLimit(
      state.createdCertificates,
      entry,
      MAX_CREATED
    )
  });
}

export function appendVerificationCheck({ code, result, error = "" }) {
  const state = readState();
  const certificate = result?.certificate || null;
  const entry = {
    id: createId("chk"),
    checked_at: new Date().toISOString(),
    code,
    valid: Boolean(result?.valid),
    error,
    certificate: certificate
      ? {
          certificate_id: certificate.certificate_id,
          full_name: certificate.full_name,
          course_name: certificate.course_name,
          score: certificate.score,
          level: certificate.level
        }
      : null
  };

  writeState({
    ...state,
    verificationChecks: pushFrontWithLimit(state.verificationChecks, entry, MAX_CHECKS)
  });
}

export function clearLogs() {
  const state = readState();
  writeState({
    ...state,
    logs: []
  });
}

export function clearVerificationData() {
  const state = readState();
  writeState({
    ...state,
    createdCertificates: [],
    verificationChecks: []
  });
}
