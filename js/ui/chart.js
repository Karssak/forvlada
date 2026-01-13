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
  const colors = entries.map((_, idx) =>
    idx === 0 ? themePrimary : CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
  );

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
      const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
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

export function highlightChartSegment(index) {
  if (!state.spendingChartInstance) return;
  const meta = state.spendingChartInstance.getDatasetMeta(0);
  const item = meta.data[index];
  if (item) {
    state.spendingChartInstance.setActiveElements([{ datasetIndex: 0, index }]);
    state.spendingChartInstance.tooltip.setActiveElements(
      [{ datasetIndex: 0, index }],
      { x: 0, y: 0 },
    );
    state.spendingChartInstance.update();
  }
}
