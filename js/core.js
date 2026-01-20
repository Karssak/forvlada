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
      showToast(err.message || "Operation failed", "error");
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


export function showToast(message, type = "error") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.className = "fixed top-5 right-5 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border transform transition-all duration-300 translate-y-6 opacity-0 text-sm font-medium`
    + (type === "success"
      ? " bg-emerald-50 text-emerald-700 border-emerald-100"
      : type === "error"
      ? " bg-red-50 text-red-800 border-red-100"
      : " bg-blue-50 text-blue-700 border-blue-100");
  
  const icon = type === "success" ? "check-circle" : type === "error" ? "alert-circle" : "info";
  
  toast.innerHTML = `<i data-lucide="${icon}" class="w-6 h-6 flex-shrink-0"></i>
    <p class="mr-3 leading-tight">${message}</p>
    <button class="ml-auto text-current opacity-60 hover:opacity-100 transition-opacity px-2 py-1">
      <i data-lucide="x" class="w-5 h-5"></i>
    </button>`;

  const close = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector("button").onclick = close;
  container.appendChild(toast);

  if (typeof lucide !== 'undefined') lucide.createIcons();

  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateY(0)";
  });

  setTimeout(close, 7000);
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
