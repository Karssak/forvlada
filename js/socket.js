import { SOCKET_URL, state, refreshUserContext } from "./core.js";
import { pushActivityEvent, renderLiveEvents } from "./ui/activity.js";
import { loadFamilyMembers, loadRoles } from "./ui/family.js";
import { loadTransactions } from "./ui/transactions.js";
import { loadGoals } from "./ui/goals.js";
import { loadBudgets } from "./ui/budgets.js";

export function joinSocketRoom(familyId) {
  if (!familyId) return;
  if (!state.socket) {
    state.socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    state.socket.on("connect", () => {
      state.socketReady = true;
      state.socket.emit("join_family_room", { family_id: familyId });
    });
    state.socket.on("disconnect", () => {
      state.socketReady = false;
      pushActivityEvent({
        title: "Live feed disconnected",
        detail: "Reconnecting…",
        category: "info",
        ts: Date.now(),
      });
    });
    state.socket.on("connect_error", (err) => {
      state.socketReady = false;
      pushActivityEvent({
        title: "Live feed error",
        detail: err?.message || "Socket connect error",
        category: "info",
        ts: Date.now(),
      });
    });
  } else {
    state.socket.emit("join_family_room", { family_id: familyId });
  }
}

export function setupSocketListeners() {
  if (!state.socket || !state.currentUser?.familyId) return;
  const familyRoomId = state.currentUser.familyId;

  state.socket.off("update_members");
  state.socket.off("update_transactions");
  state.socket.off("update_goals");
  state.socket.off("update_budgets");
  state.socket.off("update_roles");
  state.socket.off("update_family");
  state.socket.off("activity_event");
  state.socket.off("activity_sync");

  state.socket.on("update_members", (payload) => {
    if (payload.family_id === familyRoomId) {
      loadFamilyMembers();
      loadRoles();
    }
  });
  state.socket.on("update_transactions", (payload) => {
    if (payload.family_id === familyRoomId) loadTransactions();
  });
  state.socket.on("update_goals", (payload) => {
    if (payload.family_id === familyRoomId) loadGoals();
  });
  state.socket.on("update_budgets", (payload) => {
    if (payload.family_id === familyRoomId) loadBudgets();
  });
  state.socket.on("update_roles", (payload) => {
    if (payload.family_id === familyRoomId) loadRoles();
  });
  state.socket.on("update_family", async (payload) => {
    if (payload.family_id === familyRoomId) {
      await refreshUserContext();
      window.dispatchEvent(new CustomEvent("family_updated"));
      loadFamilyMembers();
    }
  });
  state.socket.on("activity_event", (payload) => {
    if (payload.family_id === familyRoomId) {
      pushActivityEvent({ ...payload, ts: payload.ts || Date.now() });
    }
  });
  state.socket.on("activity_sync", (payload) => {
    if (payload.family_id === familyRoomId && Array.isArray(payload.events)) {
      const makeKey = (e) =>
        `${(e.title || "").toString().trim().toLowerCase()}|${(e.detail || "").toString().trim().toLowerCase()}|${(e.category || "").toString().trim().toLowerCase()}`;
      const map = new Map();
      payload.events
        .sort((a, b) => (b.ts || 0) - (a.ts || 0))
        .forEach((e) => {
          const k = makeKey(e);
          if (!map.has(k)) map.set(k, e);
        });
      state.activityFeed = Array.from(map.values()).slice(0, 200);
      renderLiveEvents();
    }
  });
}
