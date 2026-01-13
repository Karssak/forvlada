import {
  state,
  navigate,
  refreshUserContext,
  apiCall,
  setupForm,
  loadComponent,
} from "../core.js";
import { loadFamilyMembers, loadRoles } from "./family.js";
import {
  loadTransactions,
  initTransactionFilters,
  initTransactionForm,
} from "./transactions.js";
import { loadGoals, initGoalForm, initGoalAdjustForm } from "./goals.js";
import { loadBudgets, initBudgetForm } from "./budgets.js";
import { joinSocketRoom, setupSocketListeners } from "../socket.js";
import { renderLiveEvents } from "./activity.js";
import { initFamilyForms } from "./auth.js";

export async function initDashboardPage() {
  await Promise.all([
    loadComponent("dashboard/sidebar", "container-sidebar"),
    loadComponent("dashboard/header", "container-header"),
    loadComponent("dashboard/family-selection", "container-family-selection"),
    loadComponent("dashboard/quick-actions", "comp-quick-actions"),
    loadComponent("dashboard/stats", "comp-stats"),
    loadComponent("dashboard/family", "comp-family"),
    loadComponent("dashboard/goals", "comp-goals"),
    loadComponent("dashboard/budgets", "comp-budgets"),
    loadComponent("dashboard/live-events", "comp-live-events"),
    loadComponent("dashboard/transactions", "comp-transactions"),
    loadComponent("dashboard/roles", "comp-roles"),
    loadComponent("dashboard/settings", "comp-settings"),
    loadComponent("dashboard/analytics", "comp-analytics"),
    loadComponent("dashboard/modals", "container-modals"),
  ]);

  const user = await refreshUserContext();
  if (!user) {
    navigate("/login");
    return;
  }

  updateUserHeader(user);

  if (!user.familyId) {
    toggleDashboardLayout(false);
    initFamilyForms(initDashboardPage);
    return;
  }

  toggleDashboardLayout(true);
  joinSocketRoom(user.familyId);
  state.activityFeed = [];
  renderLiveEvents();
  await loadActivityHistory();
  initSidebarNavigation();
  setupQuickActions();
  initTransactionForm();
  initTransactionFilters();
  initGoalForm();
  initGoalAdjustForm();
  initBudgetForm();
  initSettingsForms();
  populateSettingsForms();

  await Promise.all([
    loadFamilyMembers(),
    loadTransactions(),
    loadGoals(),
    loadBudgets(),
    loadRoles(),
  ]);

  setupSocketListeners();
  if (typeof lucide !== "undefined") lucide.createIcons();
}

function updateUserHeader(user) {
  const name =
    `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User";
  const avatar = document.getElementById("navUserAvatar");
  const nameEl = document.getElementById("navUserName");
  const greetingEl = document.getElementById("userNameDisplay");
  const headerAvatar = document.getElementById("headerUserAvatar");
  if (avatar)
    avatar.textContent = (user.firstName || "U").charAt(0).toUpperCase();
  if (nameEl) nameEl.textContent = name;
  if (greetingEl) greetingEl.textContent = user.firstName || "User";
  if (headerAvatar) {
    headerAvatar.textContent = (user.firstName || "U").charAt(0).toUpperCase();
    headerAvatar.classList.remove("hidden");
  }
}

function toggleDashboardLayout(hasFamily) {
  const selection = document.getElementById("family-selection");
  const dash = document.getElementById("dashboard-content");
  if (selection) selection.classList.toggle("hidden", hasFamily);
  if (dash) dash.classList.toggle("hidden", !hasFamily);
}

async function loadActivityHistory() {
  try {
    const data = await apiCall(`/api/activity?t=${Date.now()}`);
    if (Array.isArray(data?.events)) {
      state.activityFeed = [...data.events]
        .sort((a, b) => (b.ts || 0) - (a.ts || 0))
        .slice(0, 50);
      renderLiveEvents();
    }
  } catch {}
}

function initSidebarNavigation() {
  const navItems = Array.from(document.querySelectorAll("[data-nav]"));

  
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const key = item.getAttribute("data-nav");
      setActive(key);
      window.scrollTo(0, 0); 
    });
  });

  const allWrappers = [
    "comp-quick-actions",
    "comp-stats",
    "comp-family",
    "comp-goals",
    "comp-budgets",
    "comp-live-events",
    "comp-transactions",
    "comp-roles",
    "comp-settings",
    "comp-analytics",
  ];

  
  const viewConfig = {
    overview: {
      show: [
        "comp-quick-actions",
        "comp-stats",
        "comp-family",
        "comp-goals",
        "comp-budgets",
        "comp-live-events",
        "comp-transactions",
      ],
      gridMode: "overview",
    },
    transactions: {
      show: ["comp-transactions"],
      gridMode: "stack",
    },
    budgets: {
      show: ["comp-budgets"],
      gridMode: "stack",
    },
    goals: {
      show: ["comp-goals"],
      gridMode: "stack",
    },
    roles: {
      show: ["comp-roles"],
      gridMode: false,
    },
    analytics: {
      show: ["comp-analytics"],
      gridMode: false,
    },
    settings: {
      show: ["comp-settings"],
      gridMode: false,
    },
  };

  
  const hash = window.location.hash.slice(1);
  if (viewConfig[hash]) setActive(hash);
  else setActive("overview");

  function setActive(key) {
    
    navItems.forEach((item) => {
      item.classList.remove("nav-active");
      item.classList.add("nav-item");
      if (item.getAttribute("data-nav") === key)
        item.classList.add("nav-active");
    });

    const config = viewConfig[key] || viewConfig["overview"];

    
    allWrappers.forEach((id) =>
      document.getElementById(id)?.classList.add("hidden"),
    );

    
    const gridContainer = document.getElementById("dashboard-grid-container");
    if (gridContainer) {
      if (config.gridMode === "overview") {
        gridContainer.classList.remove("hidden");
        gridContainer.className = "grid grid-cols-1 xl:grid-cols-2 gap-6";
      } else if (config.gridMode === "stack") {
        gridContainer.classList.remove("hidden");
        gridContainer.className = "flex flex-col gap-6";
      } else {
        gridContainer.classList.add("hidden");
        gridContainer.className = "";
      }
    }

    
    config.show.forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove("hidden");
        
        const inner = el.querySelector("[data-section]");
        if (inner) inner.classList.remove("hidden");
      }
    });

    
    const transEl = document.getElementById("comp-transactions");
    if (transEl) {
      if (key === "overview") {
        transEl.style.order = "5";
        transEl.classList.add("col-span-1", "xl:col-span-2");
        document.getElementById("comp-family").style.order = "1";
        document.getElementById("comp-goals").style.order = "2";
        document.getElementById("comp-budgets").style.order = "3";
        document.getElementById("comp-live-events").style.order = "4";
      } else {
        transEl.style.order = "";
        transEl.classList.remove("col-span-1", "xl:col-span-2");
        [
          "comp-family",
          "comp-goals",
          "comp-budgets",
          "comp-live-events",
        ].forEach((id) => {
          const e = document.getElementById(id);
          if (e) e.style.order = "";
        });
      }
    }
    
    
    window.scrollTo(0,0);
  }

  window.navigateDashboardSection = setActive;
  setActive("overview");
}

function setupQuickActions() {
  document.querySelectorAll("[data-quick-action]").forEach((btn) => {
    btn.addEventListener("click", () =>
      handleQuickAction(btn.getAttribute("data-quick-action")),
    );
  });
}

function handleQuickAction(action) {
  const openModal = (id) =>
    document.getElementById(id)?.classList.remove("hidden");
  const scrollToSection = (id) =>
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  const highlightLiveFeed = () => {
    const section = document.getElementById("section-live-events");
    if (!section) return;
    section.classList.add("ring-2", "ring-red-200");
    setTimeout(() => section.classList.remove("ring-2", "ring-red-200"), 1000);
  };

  switch (action) {
    case "add-transaction":
      window.navigateDashboardSection?.("transactions");
      openModal("addTransactionModal");
      break;
    case "create-budget":
      window.navigateDashboardSection?.("budgets");
      openModal("addBudgetModal");
      break;
    case "new-goal":
      window.navigateDashboardSection?.("goals");
      openModal("addGoalModal");
      break;
    case "financial-health":
      window.navigateDashboardSection?.("analytics");
      scrollToSection("section-analytics");
      break;
    case "roles-access":
      window.navigateDashboardSection?.("roles");
      scrollToSection("section-roles");
      break;
    case "live-events":
      window.navigateDashboardSection?.("overview");
      scrollToSection("section-live-events");
      highlightLiveFeed();
      break;
    default:
      break;
  }
}

function populateSettingsForms() {
  if (!state.currentUser) return;
  const profileForm = document.getElementById("profileSettingsForm");
  if (profileForm) {
    profileForm
      .querySelector('[name="firstName"]')
      ?.setAttribute("value", state.currentUser.firstName || "");
    profileForm
      .querySelector('[name="lastName"]')
      ?.setAttribute("value", state.currentUser.lastName || "");
    profileForm
      .querySelector('[name="email"]')
      ?.setAttribute("value", state.currentUser.email || "");
  }
  const familyForm = document.getElementById("familySettingsForm");
  if (familyForm) {
    familyForm
      .querySelector('[name="familyName"]')
      ?.setAttribute("value", state.currentUser.familyName || "");

    const isAdmin = state.currentUser.role === "admin";
    familyForm
      .querySelectorAll("input, button, select, textarea")
      .forEach((el) => {
        el.disabled =
          !isAdmin && el.name !== "familyName"
            ? true
            : !isAdmin && el.name === "familyName";
      });
    const hint = document.getElementById("familySettingsHint");
    if (hint)
      hint.textContent = isAdmin
        ? ""
        : "Only admins can change family settings.";
  }
}

function initSettingsForms() {
  setupForm("profileSettingsForm", async (formData) => {
    await apiCall("/api/me", "PUT", {
      firstName: formData.get("firstName"),
      lastName: formData.get("lastName"),
      email: formData.get("email"),
    });
    await refreshUserContext();
    updateUserHeader(state.currentUser);
    populateSettingsForms();
    alert("Profile updated");
  });

  setupForm("passwordSettingsForm", async (formData, form) => {
    if (formData.get("newPassword") !== formData.get("confirmPassword"))
      throw new Error("Passwords do not match");
    await apiCall("/api/me/password", "PUT", {
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
    });
    form.reset();
    alert("Password updated");
  });

  setupForm("familySettingsForm", async (formData) => {
    if (state.currentUser?.role !== "admin")
      throw new Error("Only admins can update family settings");
    await apiCall("/api/family", "PATCH", {
      name: formData.get("familyName"),
      color: "blue",
    });
    await refreshUserContext();
    populateSettingsForms();
    loadFamilyMembers();
    alert("Family updated");
  });
}

window.addEventListener("family_updated", () => {
  populateSettingsForms();
});
