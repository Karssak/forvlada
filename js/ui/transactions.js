import { apiCall, state, setupForm, validateAmount, validateString } from "../core.js";
import { renderSpendingChart } from "./chart.js";

const TRANSACTION_PAGE_SIZE = 5;
let transactionPage = 1;

export async function loadTransactions() {
  try {
    state.transactionsCache = await apiCall(
      `/api/transactions?t=${Date.now()}`,
    );
    updateTransactionStats(state.transactionsCache);
    transactionPage = 1; 
    renderTransactions();
    renderRecurringBills(state.transactionsCache);
    renderSpendingChart(state.transactionsCache);

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch {}
}

export function updateTransactionStats(transactions = []) {
  const balanceEl = document.getElementById("totalBalance");
  const incomeEl = document.getElementById("monthlyIncome");
  const expensesEl = document.getElementById("monthlyExpenses");

  let totalBalance = 0;
  let income = 0;
  let expenses = 0;

  transactions.forEach((t) => {
    const amount = Number(t.amount) || 0;
    if (t.type === "income") {
      income += amount;
      totalBalance += amount;
    } else {
      expenses += amount;
      totalBalance -= amount;
    }
  });

  if (balanceEl) balanceEl.textContent = `$${totalBalance.toFixed(2)}`;
  if (incomeEl) incomeEl.textContent = `$${income.toFixed(2)}`;
  if (expensesEl) expensesEl.textContent = `$${expenses.toFixed(2)}`;
}

export function renderTransactions() {
  const list = document.getElementById("recentTransactionsList");
  if (!list) return;

  if (!state.transactionsCache.length) {
    list.innerHTML =
      '<p class="text-center text-slate-400 py-8">No transactions yet.</p>';
    renderSpendingChart([]);
    return;
  }

  const filtered = state.transactionsCache.filter((t) => {
    if (state.transactionFilter === "income") return t.type === "income";
    if (state.transactionFilter === "expense") return t.type !== "income";
    if (state.transactionFilter === "recurring") return t.is_recurring;
    return true;
  });

  const paginationContainer = document.getElementById("transactionPagination");

  
  const page = transactionPage;
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / TRANSACTION_PAGE_SIZE));
  const start = (page - 1) * TRANSACTION_PAGE_SIZE;
  const pageItems = filtered.slice(start, start + TRANSACTION_PAGE_SIZE);

  list.innerHTML = pageItems
    .map((t) => {
      const isIncome = t.type === "income";
      const category = (t.category || "").toLowerCase();
      const iconMap = {
        groceries: "shopping-cart",
        food: "coffee",
        dining: "coffee",
        transport: "truck",
        travel: "map-pin",
        fuel: "truck",
        shopping: "shopping-bag",
        entertainment: "film",
        rent: "home",
        salary: "dollar-sign",
        income: "dollar-sign",
        utilities: "zap",
        subscription: "repeat",
        gift: "gift",
        health: "heart",
        credit: "credit-card",
      };
      const icon =
        iconMap[category] || (isIncome ? "dollar-sign" : "shopping-bag");
      const colorClass = isIncome ? "text-green-600" : "text-orange-600";
      const bgClass = isIncome ? "bg-green-50" : "bg-orange-50";
      const badgeClass = isIncome
        ? "bg-green-100 text-green-700"
        : "bg-orange-100 text-orange-700";
      const sign = isIncome ? "+" : "-";
      const recurringBadge = t.is_recurring
        ? '<span class="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-[var(--theme-primary-soft)] text-[var(--theme-primary-strong)] border border-[var(--theme-primary-border)]">Recurring</span>'
        : "";
      const nextDue = t.next_due_date
        ? ` • Next: ${new Date(t.next_due_date).toLocaleDateString()}`
        : "";
      return `
        <div class="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-white hover:border-[var(--theme-primary-border)] transition">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 ${bgClass} rounded-full flex items-center justify-center">
              <i data-lucide="${icon}" class="w-5 h-5 ${colorClass}"></i>
            </div>
            <div class="min-w-0">
              <p class="font-bold text-slate-900 truncate">${t.description}</p>
              <p class="text-xs text-slate-500">${new Date(t.date).toLocaleDateString()} • ${t.first_name || ""}${nextDue}</p>
              ${recurringBadge ? `<div class="mt-1">${recurringBadge}</div>` : ""}
            </div>
          </div>
          <div class="text-right">
            <div class="font-bold ${colorClass}">${sign}$${Number(t.amount).toFixed(2)}</div>
            <span class="inline-flex mt-1 px-2 py-0.5 text-xs rounded-full ${badgeClass}">${(t.category || "General").charAt(0).toUpperCase() + (t.category || "General").slice(1)}</span>
          </div>
        </div>
      `;
    })
    .join("");

  
  if (paginationContainer) {
    if (totalPages <= 1) {
      paginationContainer.innerHTML = "";
      paginationContainer.parentElement.classList.add("hidden"); 
    } else {
      paginationContainer.parentElement.classList.remove("hidden");

      let pagesHtml = "";
      
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
          pagesHtml += `<button data-page="${i}" class="w-8 h-8 rounded-lg flex items-center justify-center text-sm ${i === page ? "bg-[var(--theme-primary-soft)] text-[var(--theme-primary-strong)] font-semibold" : "bg-white border border-slate-200 hover:bg-slate-50"}">${i}</button>`;
        } else if (i === page - 2 || i === page + 2) {
          pagesHtml += `<span class="text-slate-400">...</span>`;
        }
      }

      paginationContainer.innerHTML = `
            <div class="flex items-center gap-2">
              <button id="transPrev" class="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600" ${page === 1 ? "disabled" : ""}><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
              ${pagesHtml}
              <button id="transNext" class="w-8 h-8 rounded-lg flex items-center justify-center bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600" ${page === totalPages ? "disabled" : ""}><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
            </div>
          `;

      paginationContainer
        .querySelectorAll("button[data-page]")
        .forEach((btn) => {
          btn.addEventListener("click", () => {
            transactionPage = parseInt(btn.dataset.page);
            renderTransactions();
          });
        });

      const prevBtn = document.getElementById("transPrev");
      const nextBtn = document.getElementById("transNext");

      if (prevBtn)
        prevBtn.onclick = () => {
          if (transactionPage > 1) {
            transactionPage--;
            renderTransactions();
          }
        };
      if (nextBtn)
        nextBtn.onclick = () => {
          if (transactionPage < totalPages) {
            transactionPage++;
            renderTransactions();
          }
        };
    }
  }

  if (typeof lucide !== "undefined") lucide.createIcons();
}

export function renderRecurringBills(transactions = []) {
  const recurringList = document.getElementById("recurringBillsList");
  const countEl = document.getElementById("recurringCount");
  if (!recurringList) return;

  const recurring = transactions
    .filter((t) => t.is_recurring)
    .sort(
      (a, b) =>
        new Date(a.next_due_date || a.date) -
        new Date(b.next_due_date || b.date),
    );
  if (countEl) countEl.textContent = recurring.length;

  if (!recurring.length) {
    recurringList.innerHTML =
      '<p class="text-center text-slate-400 py-6">No recurring bills yet.</p>';
    return;
  }

  recurringList.innerHTML = recurring
    .map((t) => {
      const due = t.next_due_date
        ? new Date(t.next_due_date).toLocaleDateString()
        : "No date";
      return `
        <div class="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50">
          <div>
            <p class="font-semibold text-slate-800">${t.description}</p>
            <p class="text-xs text-slate-500">${t.recurrence || "Recurring"} • Next due ${due}</p>
          </div>
          <span class="font-bold text-slate-900">$${Number(t.amount).toFixed(2)}</span>
        </div>
      `;
    })
    .join("");
}

export function initTransactionFilters() {
  const filterContainer = document.getElementById("transactionFilters");
  if (!filterContainer) return;

  filterContainer.querySelectorAll("button[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      filterContainer.querySelectorAll("button[data-filter]").forEach((b) => {
        b.classList.remove(
          "bg-[var(--theme-primary-soft)]",
          "text-[var(--theme-primary-strong)]",
          "border-[var(--theme-primary-border)]",
        );
        b.classList.add("bg-white");
      });
      btn.classList.remove("bg-white");
      btn.classList.add(
        "bg-[var(--theme-primary-soft)]",
        "text-[var(--theme-primary-strong)]",
        "border-[var(--theme-primary-border)]",
      );
      state.transactionFilter = btn.getAttribute("data-filter") || "all";
      renderTransactions();
    });
  });
}

export function initTransactionForm() {
  const recurringToggle = document.getElementById("isRecurringToggle");
  const recurringFields = document.getElementById("recurringFields");
  if (recurringToggle && recurringFields) {
    recurringToggle.addEventListener("change", () => {
      recurringFields.classList.toggle("hidden", !recurringToggle.checked);
    });
  }

  setupForm("addTransactionForm", async (formData, form) => {
    const amount = formData.get("amount");
    const description = formData.get("description");
    const type = formData.get("type");
    const category = formData.get("category");
    
    // Validate amount
    if (!validateAmount(amount, 0, 999999999)) {
      throw new Error("Amount must be between 0 and 999,999,999");
    }
    
    // Validate description
    if (!validateString(description, 1, 500)) {
      throw new Error("Description must be 1-500 characters");
    }
    
    // Validate type
    if (!type || !["income", "expense"].includes(type)) {
      throw new Error("Please select a transaction type");
    }
    
    const data = {
      amount: parseFloat(amount),
      description: description.trim(),
      type: type,
      category: category || "General",
      isRecurring: formData.get("isRecurring") === "on",
      recurrence: formData.get("recurrence"),
      nextDueDate: formData.get("nextDueDate"),
    };

    await apiCall("/api/transactions", "POST", data);
    document.getElementById("addTransactionModal")?.classList.add("hidden");
    form.reset();
    if (recurringFields) recurringFields.classList.add("hidden");
    loadTransactions();
  });
}
