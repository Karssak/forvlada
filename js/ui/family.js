import { fetchFamilySnapshot, apiCall, state, showToast } from "../core.js";

export async function loadFamilyMembers() {
  try {
    const data = await fetchFamilySnapshot();
    if (!data) return;

    const inviteEl = document.getElementById("familyInviteCode");
    if (inviteEl && data.invite_code) inviteEl.textContent = data.invite_code;

    const list = document.getElementById("familyMembersList");
    if (!list) return;

    // Handle Admin delete family button
    const dangerZone = document.getElementById("familySettingsArea");
    if (dangerZone) {
      if (state.currentUser?.role === 'admin') {
        dangerZone.classList.remove('hidden');
        const delBtn = document.getElementById("deleteFamilyBtn");
        if (delBtn) delBtn.onclick = () => openDeleteFamilyModal();
        // ensure modal handlers are attached when admin view is active
        setupDeleteFamilyHandlers();
      } else {
        dangerZone.classList.add('hidden');
      }
    }

    const members = data.members || [];
    if (!members.length) {
      list.innerHTML =
        '<div class="col-span-full text-center py-8 text-slate-500">No members yet.</div>';
      return;
    }

    list.innerHTML = members
      .map((member) => {
        const canRemove =
          state.currentUser?.role === "admin" && member.role !== "admin";
        const roleLabel = member.role
          ? member.role.charAt(0).toUpperCase() + member.role.slice(1)
          : "Member";
        return `
          <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-700">${(member.first_name || "U").charAt(0)}</div>
              <div>
                <p class="font-semibold text-slate-900">${member.first_name || ""} ${member.last_name || ""}</p>
                <p class="text-xs text-slate-500">${member.email}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-3 py-1 text-xs rounded-full theme-pill border">${roleLabel}</span>
              ${canRemove ? `<button class="text-slate-400 hover:text-red-500" data-member-id="${member.id}" aria-label="Remove member"><i data-lucide="x" class="w-4 h-4"></i></button>` : ""}
            </div>
          </div>
        `;
      })
      .join("");

    list.querySelectorAll("button[data-member-id]").forEach((btn) => {
      btn.addEventListener("click", () =>
        removeFamilyMember(btn.getAttribute("data-member-id")),
      );
    });

    if (typeof lucide !== "undefined") lucide.createIcons();
  } catch (err) {
    console.error("Failed to load members:", err.message);
  }
}

async function removeFamilyMember(memberId) {
  if (!memberId || !confirm("Remove this member from the family?")) return;
  try {
    await apiCall(`/api/family/members/${memberId}`, "DELETE");
    loadFamilyMembers();
    loadRoles();
    showToast("Member removed successfully", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

export async function loadRoles() {
  try {
    const data = await fetchFamilySnapshot();
    const list = document.getElementById("memberRolesList");
    if (!data || !list) return;

    const isAdmin = state.currentUser?.role === "admin";
    const currentUserId = state.currentUser?.id;

    list.innerHTML = (data.members || [])
      .map(
        (m) => {
           const isSelf = m.id == currentUserId;
           return `
      <div class="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
        <div>
          <p class="font-bold text-slate-900">${m.first_name || ""} ${m.last_name || ""}</p>
          <p class="text-xs text-slate-500">${m.email}</p>
        </div>
        <div class="relative">
          <select ${!isAdmin || (isSelf && m.role === 'admin') ? "disabled" : ""} class="appearance-none px-3 py-2 pr-10 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-400" data-role-user-id="${m.id}">
            ${["admin", "parent", "child"].map((r) => `<option value="${r}" ${m.role === r ? "selected" : ""}>${r.charAt(0).toUpperCase() + r.slice(1)}</option>`).join("")}
          </select>
          <i data-lucide="chevron-down" class="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
        </div>
      </div>`
        },
      )
      .join("");

    list
      .querySelectorAll("select")
      .forEach((s) =>
        s.addEventListener("change", () =>
          assignRole(s.getAttribute("data-role-user-id"), s.value),
        ),
      );
  } catch {}
}

async function assignRole(userId, role) {
  if (state.currentUser?.role === 'admin' && userId == state.currentUser?.id && role !== 'admin') {
      showToast("Cannot remove your own admin role", "error");
      loadRoles();
      return;
  }
  try {
    await apiCall("/api/roles/assign", "POST", { userId, role });
    loadRoles();
    loadFamilyMembers();
    showToast("Role updated successfully", "success");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function deleteFamily() {
  // kept for backward compatibility; prefer using modal
  openDeleteFamilyModal();
}

function openDeleteFamilyModal() {
  const modal = document.getElementById('deleteFamilyModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const pwd = document.getElementById('deleteFamilyPasswordInput');
  if (pwd) pwd.value = '';
}

function setupDeleteFamilyHandlers() {
  const modal = document.getElementById('deleteFamilyModal');
  if (!modal) return;
  const confirmBtn = document.getElementById('confirmDeleteFamilyBtn');
  const closeBtns = modal.querySelectorAll('[onclick]');

  // attach close behavior to any inline close buttons so modal hides
  closeBtns.forEach((b) => {
    // leave existing inline onclicks
  });

  if (confirmBtn) {
    // use onclick to avoid duplicate event handlers
    confirmBtn.onclick = async () => {
      const pwdInput = document.getElementById('deleteFamilyPasswordInput');
      const password = pwdInput?.value;
      if (!password) {
        showToast("Please enter your password", "error");
        return;
      }
      try {
        await apiCall('/api/family_delete', 'DELETE', { password });
        showToast("Family deleted. Redirecting...", "success");
        setTimeout(() => (window.location.href = '/'), 1200);
      } catch (err) {
        showToast(err.message || 'Failed to delete family', 'error');
      }
    };
  }
}
