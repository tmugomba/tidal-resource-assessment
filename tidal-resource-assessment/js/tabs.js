/* ============================================================
   TAB NAVIGATION
   ------------------------------------------------------------
   Simple show/hide tab switcher. Each button's data-tab attribute
   matches a panel's id suffix (data-tab="overview" -> #tab-overview).
   ============================================================ */

const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.getAttribute("data-tab");

    // Deactivate all buttons and panels first...
    tabButtons.forEach((b) => {
      b.classList.remove("active");
      b.setAttribute("aria-selected", "false");
    });
    tabPanels.forEach((p) => p.classList.remove("active"));

    // ...then activate only the selected pair.
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    document.getElementById("tab-" + target).classList.add("active");

    // Leaflet needs to recalculate its size once its container becomes
    // visible again, otherwise the map renders grey/blank the first time
    // the Overview tab is revisited after being hidden.
    if (target === "overview" && window.locationMap) {
      window.locationMap.invalidateSize();
    }
  });
});
