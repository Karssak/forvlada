import { apiCall, setupForm, validateAmount, validateString, state } from "../core.js";
import { loadTransactions } from "./transactions.js";

export async function loadBudgets() {
  try {
    const addBtn = document.getElementById("addBudgetBtn");
    if (addBtn) {
        if (state.currentUser?.role === 'child') {
            addBtn.classList.add('hidden');
        } else {
            addBtn.classList.remove('hidden');
        }
    }

    const budgets = await apiCall(`/api/budgets?t=${Date.now()}`);
    const list = document.getElementById("budgetsList");
    const totalLimitEl = document.getElementById("budgetTotalLimit");
    const totalSpentEl = document.getElementById("budgetTotalSpent");
    const remainingEl = document.getElementById("budgetRemaining");
    const barEl = document.getElementById("budgetSummaryBar");
    if (!list) return;
    if (!budgets.length) {
      list.innerHTML =
        '<p class="text-center text-slate-400 py-4">No budgets set yet.</p>';
      if (totalLimitEl) totalLimitEl.textContent = "$0.00";
      if (totalSpentEl) totalSpentEl.textContent = "$0.00";
      if (remainingEl) remainingEl.textContent = "$0.00";
      if (barEl) barEl.style.width = "0%";
      return;
    }

    const totalLimit = budgets.reduce(
      (sum, b) => sum + Number(b.limit || 0),
      0,
    );
    const totalSpent = budgets.reduce(
      (sum, b) => sum + Number(b.spent || 0),
      0,
    );
    const remaining = Math.max(0, totalLimit - totalSpent);
    const percentUsed =
      totalLimit > 0 ? Math.min(100, (totalSpent / totalLimit) * 100) : 0;

    if (totalLimitEl) totalLimitEl.textContent = `$${totalLimit.toFixed(2)}`;
    if (totalSpentEl) totalSpentEl.textContent = `$${totalSpent.toFixed(2)}`;
    if (remainingEl) remainingEl.textContent = `$${remaining.toFixed(2)}`;
    if (barEl) barEl.style.width = `${percentUsed}%`;

    list.innerHTML = budgets
      .map((b) => {
        const percent = Math.min(100, (b.spent / b.limit) * 100);
        const remaining = Math.max(0, b.limit - b.spent);
        
        const percentVal = (b.spent / b.limit) * 100;
        let barColor = "#22c55e";
        if (percentVal >= 100) barColor = "#dc2626";
        else if (percentVal >= 80) barColor = "#ef4444";
        else if (percentVal >= 60) barColor = "#eab308";
        
        const barStyle = `background-color: ${barColor};`;
        
        const categoryLabel = b.category.charAt(0).toUpperCase() + b.category.slice(1);
        
        const isChild = state.currentUser?.role === 'child';
        const deleteBtn = isChild ? '' : `
            <button class="absolute top-4 right-2 text-slate-400 hover:text-red-500 transition-colors z-10 p-1 bg-white/80 rounded-full" data-delete-budget="${b.id}" title="Delete Budget">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>`;

        return `
          <div class="p-4 border border-slate-100 rounded-xl theme-card-accent bg-white relative group">
            ${deleteBtn}
            <div class="flex justify-between items-center mb-2 pr-6">
              <p class="font-bold text-slate-900">${categoryLabel}</p>
              <span class="text-sm text-slate-500">$${Number(b.limit).toFixed(2)} / ${b.period}</span>
            </div>
            <div class="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div class="h-2.5 rounded-full" style="width: ${percent}%; ${barStyle}"></div>
            </div>
            <div class="flex justify-between text-xs text-slate-500 mt-2">
              <span>Spent: $${Number(b.spent).toFixed(2)}</span>
              <span>Left: $${remaining.toFixed(2)}</span>
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll("[data-delete-budget]").forEach((btn) => {
         btn.addEventListener("click", (e) => {
             e.stopPropagation();
             deleteBudget(btn.getAttribute("data-delete-budget"));
         });
    });
    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch {}
}

async function deleteBudget(id) {
    if (!confirm("are you sure you want to delete this budget?")) return;
    try {
        await apiCall(`/api/budgets/${id}`, "DELETE");
        loadBudgets();
    } catch(err) {
        console.error("Failed to delete budget:", err);
    }
}

export function initBudgetForm() {
  setupForm("addBudgetForm", async (formData, form) => {
    const category = formData.get("category");
    const amount = formData.get("amount");
    
    if (!validateString(category, 1, 100)) {
      throw new Error("Category must be 1-100 characters");
    }
    
    if (!validateAmount(amount, 0, 999999999)) {
      throw new Error("Amount must be between 0 and 999,999,999");
    }
    
    const data = {
      category: category.trim(),
      amount: parseFloat(amount),
      period: "monthly",
    };
    await apiCall("/api/budgets", "POST", data);
    document.getElementById("addBudgetModal")?.classList.add("hidden");
    form.reset();
    loadBudgets();
    loadTransactions();
  });
}
