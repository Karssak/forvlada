import { apiCall, setupForm, validateAmount, validateString } from "../core.js";

export async function loadGoals() {
  try {
    const goals = await apiCall(`/api/goals?t=${Date.now()}`);
    const list = document.getElementById("goalsList");
    if (!list) return;
    if (!goals.length) {
      list.innerHTML =
        '<p class="text-center text-slate-400 py-4">No goals set yet.</p>';
      return;
    }
    list.innerHTML = goals
      .map((g) => {
        const target = Number(g.target_amount) || 0;
        const percent = target
          ? Math.min(100, (g.current_amount / target) * 100)
          : 0;
        return `
          <div class="theme-surface-card p-4 rounded-2xl flex flex-col h-full">
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <i data-lucide="flag" class="w-5 h-5 text-indigo-500"></i>
                <div>
                  <p class="font-bold text-slate-900">${g.name}</p>
                  <p class="text-xs text-slate-500">Target: $${Number(g.target_amount).toFixed(2)}</p>
                </div>
              </div>
              <div class="text-right">
                <span class="font-bold text-slate-700">$${Number(g.current_amount).toFixed(2)}</span>
              </div>
            </div>
            <div class="flex-1">
              <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-3">
                <div class="bg-[var(--theme-primary)] h-2.5 rounded-full" style="width: ${percent}%;"></div>
              </div>
              <div class="grid grid-cols-2 gap-2 text-xs text-slate-500">
                <div>Progress</div>
                <div class="text-right">${percent.toFixed(0)}%</div>
                <div>Deadline</div>
                <div class="text-right">${g.deadline ? new Date(g.deadline).toLocaleDateString() : "—"}</div>
              </div>
            </div>
            <div class="mt-3 flex gap-2">
              <button class="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200" data-goal-adjust="add" data-goal-id="${g.id}">Add</button>
              <button class="flex-1 px-3 py-2 text-sm rounded-lg bg-slate-50 border border-slate-200" data-goal-adjust="subtract" data-goal-id="${g.id}">Withdraw</button>
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll("[data-goal-adjust]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const goalId = btn.getAttribute("data-goal-id");
        const action = btn.getAttribute("data-goal-adjust");
        openGoalAdjustModal(goalId, action);
      });
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch {}
}

export function openGoalAdjustModal(goalId, action = "add") {
  const modal = document.getElementById("adjustGoalModal");
  const form = document.getElementById("adjustGoalForm");
  if (!modal || !form) return;
  form.querySelector('input[name="goalId"]').value = goalId;
  form.querySelector('input[name="action"]').value = action;
  form.querySelectorAll("[data-goal-action]").forEach((btn) => {
    btn.classList.toggle(
      "bg-slate-50",
      btn.getAttribute("data-goal-action") === action,
    );
    btn.classList.toggle(
      "border-slate-200",
      btn.getAttribute("data-goal-action") === action,
    );
  });
  modal.classList.remove("hidden");
}

export function initGoalForm() {
  setupForm("addGoalForm", async (formData, form) => {
    const name = formData.get("name");
    const targetAmount = formData.get("targetAmount");
    const currentAmount = formData.get("currentAmount") || 0;
    
    // Validate name
    if (!validateString(name, 1, 200)) {
      throw new Error("Goal name must be 1-200 characters");
    }
    
    // Validate target amount
    if (!validateAmount(targetAmount, 0, 999999999)) {
      throw new Error("Target amount must be between 0 and 999,999,999");
    }
    
    const targetNum = parseFloat(targetAmount);
    const currentNum = parseFloat(currentAmount);
    
    // Validate current amount
    if (currentNum < 0 || currentNum > targetNum) {
      throw new Error("Current amount cannot exceed target amount");
    }
    
    const data = {
      name: name.trim(),
      targetAmount: targetNum,
      currentAmount: currentNum,
      deadline: formData.get("deadline"),
    };
    await apiCall("/api/goals", "POST", data);
    document.getElementById("addGoalModal")?.classList.add("hidden");
    form.reset();
    loadGoals();
  });
}

export function initGoalAdjustForm() {
  const form = document.getElementById("adjustGoalForm");
  if (form) {
    form.querySelectorAll("[data-goal-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        form.querySelector('input[name="action"]').value =
          btn.getAttribute("data-goal-action");
        form
          .querySelectorAll("[data-goal-action]")
          .forEach((b) =>
            b.classList.remove("bg-slate-50", "border-slate-200"),
          );
        btn.classList.add("bg-slate-50", "border-slate-200");
      });
    });
  }

  setupForm("adjustGoalForm", async (formData, form) => {
    const goalId = formData.get("goalId");
    const action = formData.get("action") || "add";
    const amount = formData.get("amount");
    
    // Validate goal ID
    if (!goalId || parseInt(goalId) <= 0) {
      throw new Error("Invalid goal");
    }
    
    // Validate amount
    if (!validateAmount(amount, 0, 999999999)) {
      throw new Error("Amount must be between 0 and 999,999,999");
    }
    
    // Validate action
    if (!["add", "subtract"].includes(action)) {
      throw new Error("Invalid action");
    }

    await apiCall(`/api/goals/${goalId}/adjust`, "POST", { 
      amount: parseFloat(amount), 
      action 
    });
    form.reset();
    document.getElementById("adjustGoalModal")?.classList.add("hidden");
    loadGoals();
  });
}
