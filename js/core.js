export const state = {
  socket: null,
  currentUser: null,
  transactionsCache: [],
  transactionFilter: "all",
  activityFeed: [],
  activityPage: 1,
  socketReady: false,
  spendingChartInstance: null,
};

export const CATEGORY_COLORS = [
  "#3b82f6",
  "#10b981",
  "#8b5cf6",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#f472b6",
  "#6366f1",
  "#84cc16",
];

export const SOCKET_URL =
  window.location.port === "5173" || window.location.port === "4173"
    ? "http://localhost:5000"
    : window.location.origin;

export function navigate(path) {
  if (window.location.pathname === path) return;
  history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

export async function apiCall(endpoint, method = "GET", body = null) {
  try {
    const opts = { method, headers: {} };
    if (body) {
      opts.body = JSON.stringify(body);
      opts.headers["Content-Type"] = "application/json";
    }
    const url = endpoint.startsWith("/") ? endpoint : `/api/${endpoint}`;
    const res = await fetch(url, opts);
    const contentType = res.headers.get("content-type");
    const data = contentType?.includes("application/json")
      ? await res.json()
      : {};
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  } catch (err) {
    if (endpoint !== "/api/me") console.error("API Error:", err.message);
    throw err;
  }
}

export async function refreshUserContext() {
  try {
    const data = await apiCall("/api/me");
    state.currentUser = { ...data, familyColor: "blue" };
    return state.currentUser;
  } catch {
    return null;
  }
}

export async function fetchFamilySnapshot() {
  try {
    return await apiCall(`/api/family/members?t=${Date.now()}`);
  } catch {
    return null;
  }
}

export async function loadComponent(name, targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;
  const res = await fetch(`/components/${name}.html`);
  target.innerHTML = await res.text();
}

export function setupForm(formId, handler) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      await handler(new FormData(form), form);
    } catch (err) {
      console.error("Form Error:", err.message);
      alert(err.message || "Operation failed");
    }
  });
}

export function validateAmount(amount, min = 0, max = 999999999) {
  const num = parseFloat(amount);
  if (isNaN(num) || num <= min || num > max) {
    return false;
  }
  return true;
}

export function validateString(str, minLen = 1, maxLen = 500) {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  return trimmed.length >= minLen && trimmed.length <= maxLen;
}

export function validateEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) && trimmed.length <= 255;
}

export function escapeHtml(unsafe) {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function sanitizeNumber(value, defaultValue = 0) {
  const num = parseFloat(value);
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
}
