import { router } from "./js/router.js";
import { loadComponent } from "./js/core.js";

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all(
    ["nav", "footer"].map((c) => loadComponent(c, `${c}-container`)),
  );

  window.addEventListener("popstate", router);
  router();
});
