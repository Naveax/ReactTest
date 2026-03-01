import axios from "axios";

const configuredBase = (import.meta.env.VITE_API_BASE || "").trim();
const baseURL = configuredBase.endsWith("/")
  ? configuredBase.slice(0, -1)
  : configuredBase;

const api = axios.create({
  baseURL,
  timeout: 15000
});

export function getApiError(error) {
  const detail = error?.response?.data?.detail;

  if (Array.isArray(detail)) {
    return detail.map((item) => item?.msg || "Validation error").join(" | ");
  }

  if (typeof detail === "string") {
    return detail;
  }

  if (error?.code === "ERR_NETWORK") {
    return "API sunucusuna ulasilamadi. Backend calisiyor mu kontrol et (pdm run dev).";
  }

  return error?.message || "Request failed.";
}

export default api;
