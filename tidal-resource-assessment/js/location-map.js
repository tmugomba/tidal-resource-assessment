/* ============================================================
   LOCATION MAP
   ------------------------------------------------------------
   Uses Leaflet.js (loaded via CDN in index.html) with free
   OpenStreetMap tiles — no API key required. Shows the Bay of
   Fundy's funnel shape and marks the FORCE tidal test site in
   Minas Passage. The map container has a CSS filter applied
   (see #location-map in index.html) to recolour the default
   light OSM tiles so they sit naturally on the dark brand
   background instead of clashing with it.
   ============================================================ */

// FORCE test site coordinates, Minas Passage
const FORCE_LAT = 45.333;
const FORCE_LNG = -64.417;

// Initialize the map centred on the Bay of Fundy as a whole, zoomed out
// enough to show its funnel shape between Nova Scotia and New Brunswick
const locationMap = L.map("location-map", {
  scrollWheelZoom: false, // avoid hijacking the page scroll when the user scrolls past the map
}).setView([45.2, -65.0], 7);

// Store on window so tabs.js can call invalidateSize() when this tab
// becomes visible again after being hidden by the tab switcher
window.locationMap = locationMap;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 12,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(locationMap);

// Mark the FORCE site itself
const forceMarker = L.marker([FORCE_LAT, FORCE_LNG]).addTo(locationMap);
forceMarker.bindPopup("<strong>FORCE</strong><br>Fundy Ocean Research Centre for Energy<br>Minas Passage tidal test site");

// Draw a rough outline highlighting the Minas Passage / Minas Basin area,
// since that's the region with the extreme tidal range discussed on this page
const minasBasinOutline = L.polygon(
  [
    [45.42, -64.55],
    [45.38, -64.15],
    [45.30, -63.65],
    [45.20, -63.75],
    [45.28, -64.30],
    [45.32, -64.55],
  ],
  { color: "#f5a623", weight: 2, fillOpacity: 0.08 }
).addTo(locationMap);
minasBasinOutline.bindPopup("Minas Basin — largest tidal range in the world (16+ m)");
