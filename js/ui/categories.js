import { apiCall, state, renderMoney } from "../core.js";

export async function loadCategories() {
  try {
    const categories = await apiCall("/api/categories");
    state.categories = categories; // Store in global state for other modules
    renderCategories(categories);
    updateCategoryDropdowns(categories);
  } catch (error) {
    console.error("Failed to load categories:", error);
  }
}

function renderCategories(categories) {
  const container = document.getElementById("categoriesList");
  if (!container) return; // Might be on a page where settings are not loaded? 
  // Actually settings component is loaded in dashboard.
  
  const isChild = state.currentUser?.role === 'child';
  const addBtn = document.getElementById("addCategoryBtn");
  if (addBtn) {
      if (isChild) addBtn.classList.add("hidden");
      else addBtn.classList.remove("hidden");
  }

  if (categories.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-500 col-span-full py-4">No categories found. Add one!</div>`;
    return;
  }

  container.innerHTML = categories
    .map(
      (cat) => `
    <div class="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-lg shadow-sm transition-shadow group">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background-color: ${cat.color || '#CCCCCC'}">
          ${cat.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <p class="font-bold text-slate-900 text-sm">${cat.name}</p>
          <p class="text-xs text-slate-500 capitalize">${cat.type}</p>
        </div>
      </div>
      <div class="flex gap-2 ${isChild ? 'hidden' : ''}">
        <button onclick="window.editCategory(${cat.id})" class="p-1 text-slate-400 hover:text-blue-500" title="Edit">
            <i data-lucide="edit-2" class="w-4 h-4"></i>
        </button>
        <button onclick="window.deleteCategory(${cat.id})" class="p-1 text-slate-400 hover:text-red-500" title="Delete">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `
    )
    .join("");

  if (typeof lucide !== "undefined") lucide.createIcons();
}

function updateCategoryDropdowns(categories) {
  // Update select in transaction modal
  const txSelect = document.getElementById("transactionCategorySelect");
  if (txSelect) {
    txSelect.innerHTML = `<option value="" disabled selected>Select a category</option>` +
      categories.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }

  // Update select in budget modal
  const budgetSelect = document.getElementById("budgetCategorySelect");
  if (budgetSelect) {
      // Filter for expense categories only for budgets, usually? 
      // But maybe users want income budgets (goals?). Default to all or expenses.
      // Budgets are usually for expenses.
      const expenseCats = categories.filter(c => c.type === 'expense');
      budgetSelect.innerHTML = `<option value="" disabled selected>Select a category</option>` + 
        expenseCats.map(c => `<option value="${c.name}">${c.name}</option>`).join("");
  }
}

export function initCategoryForm() {
  const form = document.getElementById("categoryForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const id = data.categoryId;

    try {
      if (id) {
        await apiCall(`/api/categories/${id}`, "PUT", data);
      } else {
        await apiCall("/api/categories", "POST", data);
      }
      window.hideAddCategoryModal();
      await loadCategories();
    } catch (error) {
      alert(error.message || "Failed to save category");
    }
  });

  // Color picker generation
  const colors = [
    "#FF5722", "#03A9F4", "#8BC34A", "#FFC107", "#9C27B0", 
    "#F44336", "#607D8B", "#4CAF50", "#009688", "#E91E63", 
    "#3F51B5", "#795548"
  ];
  const picker = document.getElementById("colorPicker");
  if (picker) {
    picker.innerHTML = colors.map(c => `
        <div onclick="selectColor('${c}')" class="w-6 h-6 rounded-full cursor-pointer border-2 border-transparent hover:scale-110 transition-transform" style="background-color: ${c}" data-color="${c}"></div>
    `).join("");
  }

  // Global handlers
  window.showAddCategoryModal = () => {
    document.getElementById("categoryForm").reset();
    document.getElementById("categoryInputId").value = "";
    document.getElementById("colorPicker").querySelectorAll("div").forEach(d => d.style.borderColor = "transparent");
    document.getElementById("addCategoryModal").classList.remove("hidden");
  };

  // Ensure the Add Category button opens the modal
  const addCategoryBtn = document.getElementById("addCategoryBtn");
  if (addCategoryBtn) {
    addCategoryBtn.addEventListener("click", (e) => {
      e.preventDefault();
      window.showAddCategoryModal();
    });
  }

  window.hideAddCategoryModal = () => {
    document.getElementById("addCategoryModal").classList.add("hidden");
  };
  
  document.getElementById("closeCategoryModalBtn")?.addEventListener("click", window.hideAddCategoryModal);
  document.getElementById("cancelCategoryBtn")?.addEventListener("click", window.hideAddCategoryModal);

  window.editCategory = (id) => {
      const cat = state.categories.find(c => c.id === id);
      if (!cat) return;
      
      document.getElementById("categoryInputId").value = cat.id;
      document.getElementById("categoryInputName").value = cat.name;
      document.getElementById("categoryInputType").value = cat.type;
      document.getElementById("categoryInputColor").value = cat.color;
      
      selectColor(cat.color);
      
      document.getElementById("addCategoryModal").classList.remove("hidden");
  };

  window.deleteCategory = async (id) => {
      if(!confirm("Are you sure? Transactions will be uncategorized.")) return;
      try {
          await apiCall(`/api/categories/${id}`, "DELETE");
          await loadCategories();
      } catch(e) {
          alert(e.message);
      }
  };

  window.selectColor = (color) => {
      document.getElementById("categoryInputColor").value = color;
      document.querySelectorAll("#colorPicker div").forEach(d => {
          d.style.borderColor = d.dataset.color === color ? "#333" : "transparent";
      });
  };
}
