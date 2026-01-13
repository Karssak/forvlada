import { navigate, apiCall, loadComponent } from "./core.js";
import { initDashboardPage } from "./ui/dashboard.js";
import { initLoginForm, initRegisterForm, initFamilyForms } from "./ui/auth.js";

export async function router() {
  const path = window.location.pathname;
  const components = {
    "/dashboard": "dashboard",
    "/login": "login",
    "/register": "register",
    "/": "home",
  };

  const componentName =
    Object.keys(components).find(
      (k) => path.startsWith(k) && (k === "/" ? path === "/" : true),
    ) || "home";
  await loadComponent(components[componentName], "content-container");

  if (path.startsWith("/dashboard")) await initDashboardPage();
  else if (path.startsWith("/login")) initLoginForm();
  else if (path.startsWith("/register")) initRegisterForm();
  else initFamilyForms();

  await updateNav();
  if (typeof lucide !== "undefined") lucide.createIcons();
}

async function updateNav() {
  const navContainer = document.getElementById("nav-container");
  if (!navContainer) return;

  try {
    const user = await apiCall("/api/me").catch(() => null);
    const authButtons = navContainer.querySelector(".flex.items-center.gap-4");
    if (!authButtons) return;

    if (user && user.email) {
      const initials = user.firstName
        ? user.firstName[0].toUpperCase()
        : user.email[0].toUpperCase();
      const name = user.firstName || user.email.split("@")[0];

      authButtons.innerHTML = `
           <div class="flex items-center gap-3 mr-4 pl-4 border-l border-slate-200">
              <div class="w-8 h-8 rounded-full bg-[var(--theme-primary-soft)] text-[var(--theme-primary-strong)] flex items-center justify-center text-sm font-bold border border-[var(--theme-primary-border)]">
                ${initials}
              </div>
              <span class="text-slate-700 font-medium text-sm hidden sm:block">${name}</span>
           </div>
           <a href="/dashboard" class="flex items-center gap-2 text-slate-600 font-medium mr-4 hover:text-[var(--theme-primary)] transition-colors">
             <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
             <span class="hidden md:inline">Dashboard</span>
           </a>
           <button id="logoutBtn" class="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] inline-block text-center hover:bg-[var(--theme-primary-soft)] transition-colors text-sm">
             <i data-lucide="log-out" class="w-4 h-4"></i>
             Logout
           </button>
         `;
      document
        .getElementById("logoutBtn")
        ?.addEventListener("click", async () => {
          await apiCall("/api/logout", "POST");
          navigate("/");
        });
      authButtons
        .querySelector('a[href="/dashboard"]')
        .addEventListener("click", (e) => {
          e.preventDefault();
          navigate("/dashboard");
        });
    } else {
      authButtons.innerHTML = `
           <a href="/login" class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 border-[var(--theme-primary)] text-[var(--theme-primary)] inline-block text-center hover:bg-blue-50 transition-colors">
             <i data-lucide="log-in" class="w-5 h-5"></i>
             Sign In
           </a>
           <a href="/register" class="flex items-center gap-2 px-6 py-3 rounded-lg font-semibold border-2 border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white inline-block text-center hover:bg-blue-600 transition-colors">
             <i data-lucide="rocket" class="w-5 h-5"></i>
             Get Started
           </a>
         `;
      authButtons.querySelectorAll("a").forEach((link) =>
        link.addEventListener("click", (e) => {
          e.preventDefault();
          navigate(link.getAttribute("href"));
        }),
      );
    }
  } catch {}
}
