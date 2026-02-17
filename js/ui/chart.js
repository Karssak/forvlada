import { CATEGORY_COLORS, state } from "../core.js";

export function renderSpendingChart(transactions = []) {
  const ctx = document.getElementById("spendingChart");
  const legend = document.getElementById("spendingLegend");
  const totalDisplay = document.getElementById("chartTotalAmount");
  if (!ctx || !legend) return;

  const expenses = transactions.filter((t) => t.type !== "income");
  const totals = expenses.reduce((acc, tx) => {
    const key = tx.category || "Other";
    acc[key] = (acc[key] || 0) + Math.abs(Number(tx.amount) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalAmount = entries.reduce((sum, [, value]) => sum + value, 0);

  if (totalDisplay) {
    totalDisplay.textContent = `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (!entries.length || totalAmount === 0) {
    if (state.spendingChartInstance) {
      state.spendingChartInstance.destroy();
      state.spendingChartInstance = null;
    }
    legend.innerHTML =
      '<p class="text-slate-400 text-sm text-center py-4">No expense data yet.</p>';
    return;
  }

  const labels = entries.map(([cat]) => cat);
  const capitalize = (s) =>
    typeof s === "string" && s.length
      ? s.charAt(0).toUpperCase() + s.slice(1)
      : s;
  const labelsCap = labels.map(capitalize);
  const data = entries.map(([, val]) => val);

  const themePrimary =
    getComputedStyle(document.documentElement)
      .getPropertyValue("--theme-primary")
      .trim() || CATEGORY_COLORS[0];
  
  const colors = entries.map(([name], idx) => {
    const cat = state.categories && state.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (cat) return cat.color;
    
    return idx === 0 ? themePrimary : CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
  });

  if (state.spendingChartInstance) {
    state.spendingChartInstance.destroy();
  }

  state.spendingChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 0,
        },
      ],
    },
    options: {
      cutout: "75%",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 10 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          position: "nearest",
          caretPadding: 15,
          displayColors: false,
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              const val = context.raw;
              const percent = ((val / totalAmount) * 100).toFixed(1);
              const lbl = capitalize(context.label);
              return ` ${lbl}: $${val.toLocaleString()} (${percent}%)`;
            },
          },
        },
      },
    },
  });

  legend.innerHTML = entries
    .map(([category, value], idx) => {
      const percent = ((value / totalAmount) * 100).toFixed(1);
      
      let color;
      const cat = state.categories && state.categories.find(c => c.name.toLowerCase() === category.toLowerCase());
      if (cat) {
          color = cat.color;
      } else {
        const themePrimary = getComputedStyle(document.documentElement).getPropertyValue("--theme-primary").trim() || CATEGORY_COLORS[0];
        color = idx === 0 ? themePrimary : CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
      }

      const displayLabel = capitalize(category);
      return `
        <div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
                  <span class="font-medium text-slate-600">${displayLabel}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-slate-900">$${value.toLocaleString()}</span>
            <span class="text-[10px] text-slate-400 ml-1">${percent}%</span>
          </div>
        </div>
      `;
    })
    .join("");

  try {
    state.spendingChartInstance.data.labels = labelsCap;
    state.spendingChartInstance.update();
  } catch {}
}

export function renderRoleSpendingChart(transactions = []) {
  const ctx = document.getElementById("roleSpendingChart");
  const legend = document.getElementById("roleSpendingLegend");
  const totalDisplay = document.getElementById("roleChartTotal");
  if (!ctx || !legend) return;

  const expenses = transactions.filter((t) => t.type !== "income");
  const totals = expenses.reduce((acc, tx) => {
    const key = (tx.role || "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + Math.abs(Number(tx.amount) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalAmount = entries.reduce((sum, [, value]) => sum + value, 0);

  if (totalDisplay) {
    totalDisplay.textContent = `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (!entries.length || totalAmount === 0) {
    if (state.roleChartInstance) {
      state.roleChartInstance.destroy();
      state.roleChartInstance = null;
    }
    legend.innerHTML =
      '<p class="text-slate-400 text-sm text-center py-4">No data yet.</p>';
    return;
  }

  const labels = entries.map(([role]) => role);
  const capitalize = (s) =>
    typeof s === "string" && s.length
      ? s.charAt(0).toUpperCase() + s.slice(1)
      : s;
  const labelsCap = labels.map(capitalize);
  const data = entries.map(([, val]) => val);

  const roleColors = ["#6366f1", "#ec4899", "#8b5cf6", "#f59e0b", "#10b981"];
  const colors = entries.map((_, idx) => roleColors[idx % roleColors.length]);

  if (state.roleChartInstance) {
    state.roleChartInstance.destroy();
  }

  state.roleChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labelsCap,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 0,
        },
      ],
    },
    options: {
      cutout: "75%",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 10 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              const val = context.raw;
              const percent = ((val / totalAmount) * 100).toFixed(1);
              return ` ${context.label}: $${val.toLocaleString()} (${percent}%)`;
            },
          },
        },
      },
    },
  });

  legend.innerHTML = entries
    .map(([role, value], idx) => {
      const percent = ((value / totalAmount) * 100).toFixed(1);
      const color = roleColors[idx % roleColors.length];
      const displayLabel = capitalize(role);
      return `
        <div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
            <span class="font-medium text-slate-600">${displayLabel}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-slate-900">$${value.toLocaleString()}</span>
            <span class="text-[10px] text-slate-400 ml-1">${percent}%</span>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderRoleIncomeChart(transactions = []) {
  const ctx = document.getElementById("roleIncomeChart");
  const legend = document.getElementById("roleIncomeLegend");
  const totalDisplay = document.getElementById("roleIncomeTotal");
  if (!ctx || !legend) return;

  const income = transactions.filter((t) => t.type === "income");
  const totals = income.reduce((acc, tx) => {
    const key = (tx.role || "unknown").toLowerCase();
    acc[key] = (acc[key] || 0) + Math.abs(Number(tx.amount) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalAmount = entries.reduce((sum, [, value]) => sum + value, 0);

  if (totalDisplay) {
    totalDisplay.textContent = `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (!entries.length || totalAmount === 0) {
    if (state.roleIncomeChartInstance) {
      state.roleIncomeChartInstance.destroy();
      state.roleIncomeChartInstance = null;
    }
    legend.innerHTML =
      '<p class="text-slate-400 text-sm text-center py-4">No data yet.</p>';
    return;
  }

  const labels = entries.map(([role]) => role);
  const capitalize = (s) =>
    typeof s === "string" && s.length
      ? s.charAt(0).toUpperCase() + s.slice(1)
      : s;
  const labelsCap = labels.map(capitalize);
  const data = entries.map(([, val]) => val);

  const roleColors = ["#6366f1", "#ec4899", "#8b5cf6", "#f59e0b", "#10b981"];
  const colors = entries.map((_, idx) => roleColors[idx % roleColors.length]);

  if (state.roleIncomeChartInstance) {
    state.roleIncomeChartInstance.destroy();
  }

  state.roleIncomeChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labelsCap,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 0,
        },
      ],
    },
    options: {
      cutout: "75%",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 10 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              const val = context.raw;
              const percent = ((val / totalAmount) * 100).toFixed(1);
              return ` ${context.label}: $${val.toLocaleString()} (${percent}%)`;
            },
          },
        },
      },
    },
  });

  legend.innerHTML = entries
    .map(([role, value], idx) => {
      const percent = ((value / totalAmount) * 100).toFixed(1);
      const color = roleColors[idx % roleColors.length];
      const displayLabel = capitalize(role);
      return `
        <div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
          <div class="flex items-center gap-2">
            <div class="w-3 h-3 rounded-full" style="background-color: ${color}"></div>
            <span class="font-medium text-slate-600">${displayLabel}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-slate-900">$${value.toLocaleString()}</span>
            <span class="text-[10px] text-slate-400 ml-1">${percent}%</span>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderChildSpendingStats(transactions = []) {
  const list = document.getElementById("childSpendingList");
  if (!list) return;

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const childExpenses = transactions.filter(t => {
      const d = new Date(t.date);
      const role = (t.role || "").toLowerCase();
      return t.type !== 'income' && 
             role === 'child' &&
             d.getMonth() === currentMonth && 
             d.getFullYear() === currentYear;
  });

  if (!childExpenses.length) {
      list.innerHTML = '<p class="text-center text-slate-400 py-6">No spending for children this month.</p>';
      return;
  }

  const byChild = childExpenses.reduce((acc, t) => {
      const name = t.first_name || 'Unknown Child';
      acc[name] = (acc[name] || 0) + Math.abs(Number(t.amount) || 0);
      return acc;
  }, {});

  const entries = Object.entries(byChild).sort((a,b) => b[1] - a[1]);
  
  const monthName = now.toLocaleString('default', { month: 'long' });

  list.innerHTML = `
    <div class="text-xs text-slate-400 mb-2 uppercase tracking-wide font-bold">Month: ${monthName} ${currentYear}</div>
    ${entries.map(([name, amount]) => `
      <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                ${name.charAt(0).toUpperCase()}
            </div>
            <span class="font-medium text-slate-700">${name}</span>
        </div>
        <span class="font-bold text-slate-900">$${amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
      </div>
  `).join('')}`;
}

export function renderPersonSpendingChart(transactions = []) {
  const ctx = document.getElementById("personSpendingChart");
  const legend = document.getElementById("personSpendingLegend");
  const totalDisplay = document.getElementById("personSpendingTotal");
  if (!ctx || !legend) return;

  const expenses = transactions.filter((t) => t.type !== "income");
  const totals = expenses.reduce((acc, tx) => {
    const name = `${(tx.first_name || "").trim()} ${(tx.last_name || "").trim()}`.trim() || "Unknown";
    acc[name] = (acc[name] || 0) + Math.abs(Number(tx.amount) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalAmount = entries.reduce((sum, [, value]) => sum + value, 0);
  if (totalDisplay) totalDisplay.textContent = `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (!entries.length || totalAmount === 0) {
    if (state.personSpendingChartInstance) {
      state.personSpendingChartInstance.destroy();
      state.personSpendingChartInstance = null;
    }
    legend.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">No expense data yet.</p>';
    return;
  }

  const labels = entries.map(([name]) => name);
  const data = entries.map(([, val]) => val);
  const colors = entries.map((_, idx) => CATEGORY_COLORS[idx % CATEGORY_COLORS.length]);

  if (state.personSpendingChartInstance) state.personSpendingChartInstance.destroy();

  state.personSpendingChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#ffffff" }] },
    options: {
      cutout: "75%",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 10 },
      plugins: { legend: { display: false } },
    },
  });

  legend.innerHTML = entries.map(([name, value], idx) => {
    const percent = ((value / totalAmount) * 100).toFixed(1);
    const color = colors[idx % colors.length];
    return `
      <div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
          <span class="font-medium text-slate-600">${name}</span>
        </div>
        <div class="text-right">
          <span class="font-bold text-slate-900">$${value.toLocaleString()}</span>
          <span class="text-[10px] text-slate-400 ml-1">${percent}%</span>
        </div>
      </div>`;
  }).join("");
}

export function renderPersonIncomeChart(transactions = []) {
  const ctx = document.getElementById("personIncomeChart");
  const legend = document.getElementById("personIncomeLegend");
  const totalDisplay = document.getElementById("personIncomeTotal");
  if (!ctx || !legend) return;

  const incomes = transactions.filter((t) => t.type === "income");
  const totals = incomes.reduce((acc, tx) => {
    const name = `${(tx.first_name || "").trim()} ${(tx.last_name || "").trim()}`.trim() || "Unknown";
    acc[name] = (acc[name] || 0) + Math.abs(Number(tx.amount) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalAmount = entries.reduce((sum, [, value]) => sum + value, 0);
  if (totalDisplay) totalDisplay.textContent = `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  if (!entries.length || totalAmount === 0) {
    if (state.personIncomeChartInstance) {
      state.personIncomeChartInstance.destroy();
      state.personIncomeChartInstance = null;
    }
    legend.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">No income data yet.</p>';
    return;
  }

  const labels = entries.map(([name]) => name);
  const data = entries.map(([, val]) => val);
  const colors = entries.map((_, idx) => CATEGORY_COLORS[(idx + 3) % CATEGORY_COLORS.length]);

  if (state.personIncomeChartInstance) state.personIncomeChartInstance.destroy();

  state.personIncomeChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#ffffff" }] },
    options: {
      cutout: "75%",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 10 },
      plugins: { legend: { display: false } },
    },
  });

  legend.innerHTML = entries.map(([name, value], idx) => {
    const percent = ((value / totalAmount) * 100).toFixed(1);
    const color = colors[idx % colors.length];
    return `
      <div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
        <div class="flex items-center gap-2">
          <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
          <span class="font-medium text-slate-600">${name}</span>
        </div>
        <div class="text-right">
          <span class="font-bold text-slate-900">$${value.toLocaleString()}</span>
          <span class="text-[10px] text-slate-400 ml-1">${percent}%</span>
        </div>
      </div>`;
  }).join("");
}

export function renderIncomeChart(transactions = []) {
  const ctx = document.getElementById("incomeChart");
  const legend = document.getElementById("incomeLegend");
  const totalDisplay = document.getElementById("incomeChartTotal");
  if (!ctx || !legend) return;

  const income = transactions.filter((t) => t.type === "income");
  const totals = income.reduce((acc, tx) => {
    const key = tx.category || "Other";
    acc[key] = (acc[key] || 0) + Math.abs(Number(tx.amount) || 0);
    return acc;
  }, {});

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalAmount = entries.reduce((sum, [, value]) => sum + value, 0);

  if (totalDisplay) {
    totalDisplay.textContent = `$${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  if (!entries.length || totalAmount === 0) {
    if (state.incomeChartInstance) {
      state.incomeChartInstance.destroy();
      state.incomeChartInstance = null;
    }
    legend.innerHTML =
      '<p class="text-slate-400 text-sm text-center py-4">No income data yet.</p>';
    return;
  }

  const labels = entries.map(([cat]) => cat);
  const capitalize = (s) =>
    typeof s === "string" && s.length
      ? s.charAt(0).toUpperCase() + s.slice(1)
      : s;
  const labelsCap = labels.map(capitalize);
  const data = entries.map(([, val]) => val);

  const incomeColors = ["#10b981", "#059669", "#34d399", "#6ee7b7", "#a7f3d0"];
  const colors = entries.map(([name], idx) => {
    const cat = state.categories && state.categories.find(c => c.name.toLowerCase() === name.toLowerCase());
    return cat ? cat.color : incomeColors[idx % incomeColors.length];
  });

  if (state.incomeChartInstance) {
    state.incomeChartInstance.destroy();
  }

  state.incomeChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labelsCap,
      datasets: [
        {
          data: data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: "#ffffff",
          hoverOffset: 0,
        },
      ],
    },
    options: {
      cutout: "75%",
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      layout: { padding: 10 },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: "#1e293b",
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: (context) => {
              const val = context.raw;
              const percent = ((val / totalAmount) * 100).toFixed(1);
              return ` ${context.label}: $${val.toLocaleString()} (${percent}%)`;
            },
          },
        },
      },
    },
  });

  legend.innerHTML = entries
    .map(([category, value], idx) => {
      const percent = ((value / totalAmount) * 100).toFixed(1);
      
      let color;
      const cat = state.categories && state.categories.find(c => c.name.toLowerCase() === category.toLowerCase());
      if (cat) color = cat.color;
      else color = incomeColors[idx % incomeColors.length];

      const displayLabel = capitalize(category);
      return `
        <div class="flex items-center justify-between p-2 border-b border-slate-50 last:border-0">
          <div class="flex items-center gap-2">
            <div class="w-2 h-2 rounded-full" style="background-color: ${color}"></div>
            <span class="font-medium text-slate-600">${displayLabel}</span>
          </div>
          <div class="text-right">
            <span class="font-bold text-slate-900">$${value.toLocaleString()}</span>
            <span class="text-[10px] text-slate-400 ml-1">${percent}%</span>
          </div>
        </div>
      `;
    })
    .join("");
}

window.toggleChartSource = function(type, source) {
  
  const groupContainer = document.getElementById(`${type}GroupContainer`);
  const individualContainer = document.getElementById(`${type}IndividualContainer`);
  const btnGroup = document.getElementById(`${type}ToggleGroup`);
  const btnIndividual = document.getElementById(`${type}ToggleIndividual`);

  if (!groupContainer || !individualContainer || !btnGroup || !btnIndividual) return;

  if (source === 'group') {
    groupContainer.classList.remove('hidden');
    individualContainer.classList.add('hidden');
    
    btnGroup.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
    btnGroup.classList.remove('text-slate-500', 'hover:text-slate-700');
    
    btnIndividual.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
    btnIndividual.classList.add('text-slate-500', 'hover:text-slate-700');

    if (type === 'income' && state.roleIncomeChartInstance) state.roleIncomeChartInstance.resize();
    if (type === 'spending' && state.roleChartInstance) state.roleChartInstance.resize();

  } else {
    groupContainer.classList.add('hidden');
    individualContainer.classList.remove('hidden');
    
    btnGroup.classList.remove('bg-white', 'shadow-sm', 'text-slate-900');
    btnGroup.classList.add('text-slate-500', 'hover:text-slate-700');
    
    btnIndividual.classList.add('bg-white', 'shadow-sm', 'text-slate-900');
    btnIndividual.classList.remove('text-slate-500', 'hover:text-slate-700');

    if (type === 'income' && state.personIncomeChartInstance) state.personIncomeChartInstance.resize();
    if (type === 'spending' && state.personSpendingChartInstance) state.personSpendingChartInstance.resize();
  }
};
