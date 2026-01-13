import { state } from "../core.js";

const PAGE_SIZE = 5;

export function pushActivityEvent(evt) {
  if (!evt) return;

  const makeKey = (e) =>
    `${(e.title || "").toString().trim().toLowerCase()}|${(e.detail || "").toString().trim().toLowerCase()}|${(e.category || "").toString().trim().toLowerCase()}`;
  const key = makeKey(evt);
  const exists = state.activityFeed.some((a) => makeKey(a) === key);
  if (exists) return;

  state.activityFeed = [evt, ...state.activityFeed].slice(0, 200);

  state.activityPage = 1;
  renderLiveEvents();
}

export function renderLiveEvents() {
  const list = document.getElementById("liveEventsList");
  if (!list) return;
  if (!state.activityFeed.length) {
    list.innerHTML =
      '<p class="text-center text-slate-400 py-6">Live feed is warming up...</p>';
    return;
  }

  const badgeMap = {
    transactions: {
      label: "Transactions",
      bg: "bg-blue-50",
      text: "text-blue-600",
    },
    budgets: {
      label: "Budgets",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
    },
    goals: { label: "Goals", bg: "bg-indigo-50", text: "text-indigo-600" },
    members: { label: "Members", bg: "bg-amber-50", text: "text-amber-700" },
    roles: { label: "Roles", bg: "bg-slate-100", text: "text-slate-700" },
    settings: { label: "Settings", bg: "bg-slate-100", text: "text-slate-700" },
    info: { label: "Live", bg: "bg-red-50", text: "text-red-600" },
  };

  const page = state.activityPage || 1;
  const total = state.activityFeed.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageItems = state.activityFeed.slice(start, start + PAGE_SIZE);

  list.innerHTML = pageItems
    .map((evt) => {
      const badge = badgeMap[evt.category] || {
        label: "Activity",
        bg: "bg-slate-100",
        text: "text-slate-700",
      };
      const timeLabel = new Date(evt.ts || Date.now()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const detail = evt.detail
        ? `<p class="text-xs text-slate-500">${evt.detail}</p>`
        : "";
      return `
        <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <span class="px-2 py-1 rounded-full text-[11px] font-semibold ${badge.bg} ${badge.text}">${badge.label}</span>
            <div>
              <p class="font-semibold text-slate-900">${evt.title || "Activity"}</p>
              ${detail}
            </div>
          </div>
          <span class="text-xs text-slate-400">${timeLabel}</span>
        </div>
      `;
    })
    .join("");

  const pagination = document.getElementById("liveEventsPagination");
  if (pagination) {
    if (totalPages <= 1) {
      pagination.innerHTML = "";
      pagination.parentElement.classList.add("hidden");
    } else {
      pagination.parentElement.classList.remove("hidden");
      
      let pagesHtml = "";
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
           pagesHtml += `<button data-page="${i}" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm ${i === page ? "bg-[var(--theme-primary-soft)] text-[var(--theme-primary-strong)] font-semibold" : "bg-white border border-slate-200 hover:bg-slate-50"}">${i}</button>`;
        } else if (i === page - 2 || i === page + 2) {
           pagesHtml += `<span class="w-8 h-8 flex items-center justify-center text-slate-400">...</span>`;
        }
      }

      pagination.innerHTML = `
        <div class="flex items-center justify-center gap-2">
          <button id="livePrev" class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" ${page === 1 ? "disabled" : ""}>Prev</button>
          ${pagesHtml}
          <button id="liveNext" class="px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed" ${page === totalPages ? "disabled" : ""}>Next</button>
        </div>
      `;

      pagination.querySelectorAll("button[data-page]").forEach((btn) => 
        btn.addEventListener("click", () => {
          state.activityPage = Number(btn.getAttribute("data-page")) || 1;
          renderLiveEvents();
        })
      );
      const prev = document.getElementById("livePrev");
      const next = document.getElementById("liveNext");
      if (prev)
        prev.onclick = () => {
          state.activityPage = Math.max(1, (state.activityPage || 1) - 1);
          renderLiveEvents();
        };
      if (next)
        next.onclick = () => {
          state.activityPage = Math.min(
            totalPages,
            (state.activityPage || 1) + 1,
          );
          renderLiveEvents();
        };
      
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }
}
