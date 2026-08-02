import { router } from "./js/router.js";
import { loadComponent } from "./js/core.js";

document.addEventListener("DOMContentLoaded", async () => {
  await Promise.all(
    ["nav", "footer"].map((c) => loadComponent(c, `${c}-container`)),
  );

  window.addEventListener("popstate", router);
  router();

  document.querySelectorAll('nav a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      if (window.location.pathname !== "/") {
        e.preventDefault();
        window.location.href = "/" + this.getAttribute("href");
      }
    });
  });
});
