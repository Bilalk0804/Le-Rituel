import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  withCredentials: true,
});

// URLs where a 401 must NOT trigger a refresh attempt — refresh itself,
// the initial "am I logged in?" probe, and the login/register/logout ops.
const NO_REFRESH_PATHS = [
  "/auth/refresh",
  "/auth/login",
  "/auth/register",
  "/auth/logout",
  "/auth/me",
];

let refreshPromise = null;

async function performRefresh() {
  // De-duplicate concurrent refresh attempts.
  if (!refreshPromise) {
    refreshPromise = api
      .post("/auth/refresh", null, { _skipAuthRetry: true })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config || {};
    const status = error.response?.status;
    const url = original.url || "";
    const skip =
      original._skipAuthRetry ||
      original._retried ||
      NO_REFRESH_PATHS.some((p) => url.endsWith(p));

    if (status === 401 && !skip) {
      try {
        await performRefresh();
        original._retried = true;
        return api(original);
      } catch {
        // Refresh failed — surface the original 401 for the caller.
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiErrorDetail(detail) {
  if (detail == null) return "Something went wrong. Please try again.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}
