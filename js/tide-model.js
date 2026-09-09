/* ============================================================
   TIDAL RESOURCE ASSESSMENT — HARMONIC MODEL
   ------------------------------------------------------------
   This file does three things:
   1. Predicts tidal height by summing three harmonic constituents
      (M2, S2, N2) — the standard tidal-prediction technique.
   2. Approximates current velocity by scaling the same harmonic
      shape against a reference peak velocity (see methodology
      note in index.html — this is a known simplification).
   3. Converts velocity to power density and draws the SVG chart.

   UPDATE: the constants below are no longer representative guesses.
   They were fitted via least-squares regression against 30 days of
   REAL predicted water levels for Burntcoat Head (CHS station 00270,
   Bay of Fundy), pulled live from the Canadian Hydrographic Service
   IWLS API. Fitting against a single day previously failed (M2, S2,
   and N2 are only 12-25 minutes apart in period, so one day of data
   can't statistically separate them) — 30 days covers roughly two
   full M2/S2 "beat cycles" (~14.8 days each), which is enough. RMSE
   against the real data dropped from 1.84 m (old guess) to 0.46 m
   (this fit) — see fit_check.py in the project root for the full
   validation script and numbers.
   ============================================================ */

// ---------- Harmonic constituent definitions ----------
// Each constituent has a period (hours), an amplitude (metres),
// and a phase offset (radians) controlling when its peak occurs
// relative to t = 0. Fitted from real Burntcoat Head data (see note above).
const CONSTITUENTS = [
  { name: "M2", periodHours: 12.42, amplitude: 5.472, phase: -0.024 },  // principal lunar semi-diurnal — dominant driver
  { name: "S2", periodHours: 12.00, amplitude: 1.149, phase: 2.419 },   // principal solar semi-diurnal
  { name: "N2", periodHours: 12.66, amplitude: 0.785, phase: -0.415 },  // larger lunar elliptic semi-diurnal
];

const MEAN_SEA_LEVEL_M = 7.528; // fitted mid-tide reference level for Burntcoat Head, metres

// Seawater density, used in the power density equation below (kg/m^3)
const SEAWATER_DENSITY = 1025;

/**
 * Predicts tidal height (metres) at a given time (in hours since t=0)
 * by summing the contribution of each harmonic constituent.
 * This is literally what "harmonic tide prediction" means: each
 * constituent is a simple cosine wave, and real tides are well
 * approximated by summing several of them together.
 */
function predictHeight(timeHours) {
  let height = MEAN_SEA_LEVEL_M;
  for (const c of CONSTITUENTS) {
    const angularFrequency = (2 * Math.PI) / c.periodHours;
    height += c.amplitude * Math.cos(angularFrequency * timeHours - c.phase);
  }
  return height;
}

/**
 * Approximates current velocity from the tidal height curve.
 * Real current velocity leads/lags height in a way that depends on
 * local channel geometry — for a simple approximation, we use the
 * RATE OF CHANGE of height (its derivative) as a proxy, since fast-
 * rising/falling tide generally corresponds to fast currents in a
 * narrow passage. The result is then scaled so its peak matches the
 * user-supplied reference peak velocity.
 */
function estimateVelocity(timeHours, peakVelocityMs) {
  const dt = 0.01; // small time step (hours) for numerical derivative
  const h1 = predictHeight(timeHours - dt);
  const h2 = predictHeight(timeHours + dt);
  const rateOfChange = (h2 - h1) / (2 * dt); // metres per hour

  // Find the maximum possible rate of change across a full cycle so
  // we can normalize this instant's rate against it.
  let maxRate = 0;
  for (let t = 0; t < 24.8; t += 0.05) {
    const a = predictHeight(t - dt);
    const b = predictHeight(t + dt);
    const r = Math.abs((b - a) / (2 * dt));
    if (r > maxRate) maxRate = r;
  }

  // Scale so the fastest moment in the cycle equals peakVelocityMs.
  return (rateOfChange / maxRate) * peakVelocityMs;
}

/**
 * Converts current velocity to power density using the standard
 * kinetic power flux equation — the same cubic relationship used
 * for wind power, since both are fluid kinetic energy:
 *   P / A = 0.5 * rho * v^3
 * Returns power density in kW per square metre of turbine swept area.
 */
function powerDensity(velocityMs) {
  const wattsPerM2 = 0.5 * SEAWATER_DENSITY * Math.pow(Math.abs(velocityMs), 3);
  return wattsPerM2 / 1000; // convert W to kW
}

// ---------- Turbine power output model ----------
// Calibrated against Orbital Marine's O2 turbine (same twin-rotor
// architecture as the O2-X being deployed at FORCE): two 20m rotors,
// 600 m^2 combined swept area, rated at 2 MW at a 2.5 m/s current
// speed. Cp (power coefficient) below was derived to match that
// published rating exactly -- see fit_check.py for the calculation.
// The O2-X's exact swept area isn't separately published; this
// reuses the O2's verified figure as the best available real-world
// calibration, which is an approximation worth flagging honestly.
const TURBINE_SWEPT_AREA_M2 = 600;
const TURBINE_RATED_VELOCITY_MS = 2.5;
const TURBINE_RATED_POWER_KW = 2000; // Orbital O2's documented rating
const TURBINE_POWER_COEFFICIENT = 0.416; // derived to match the rating above at rated velocity

/**
 * Estimates real turbine power output (kW), not just density.
 * Below rated velocity, output follows the cubic P = Cp * 0.5 * rho
 * * A * v^3 relationship. At and above rated velocity, real turbines
 * pitch their blades to cap output at the rated power rather than
 * letting it keep climbing -- Orbital's own technical documentation
 * describes exactly this behaviour for the O2 series. This function
 * reproduces that cap rather than showing an unrealistic runaway curve.
 */
function turbinePowerOutputKw(velocityMs) {
  const v = Math.abs(velocityMs);
  if (v >= TURBINE_RATED_VELOCITY_MS) {
    return TURBINE_RATED_POWER_KW; // pitch-limited, capped at rated power
  }
  const watts = TURBINE_POWER_COEFFICIENT * 0.5 * SEAWATER_DENSITY * TURBINE_SWEPT_AREA_M2 * Math.pow(v, 3);
  return watts / 1000; // convert W to kW
}

// ============================================================
// UI WIRING — connects the model above to the sliders, readouts,
// and SVG chart defined in index.html.
// ============================================================

const timeSlider = document.getElementById("time-slider");
const peakVelocityInput = document.getElementById("peak-velocity-input");
const timeLabel = document.getElementById("time-label");
const peakVelocityLabel = document.getElementById("peak-velocity-label");

const metricLevel = document.getElementById("metric-level");
const metricVelocity = document.getElementById("metric-velocity");
const metricPower = document.getElementById("metric-power");
const metricTurbine = document.getElementById("metric-turbine");
const compareOutput = document.getElementById("compare-output");
const comparePeak = document.getElementById("compare-peak");

const heightPath = document.getElementById("height-path");
const velocityPath = document.getElementById("velocity-path");
const playhead = document.getElementById("playhead");
const realDataPath = document.getElementById("real-data-path");
const realDataDots = document.getElementById("real-data-dots");
const overlayToggle = document.getElementById("overlay-toggle");
const rmseReadout = document.getElementById("rmse-readout");

const CYCLE_HOURS = 24.8; // one full lunar day (two high tides, two low tides)
const CHART_WIDTH = 600;
const CHART_HEIGHT = 220;
const CHART_TOP_PADDING = 20;
const CHART_BOTTOM = 165; // y-position of the zero axis line in the SVG, matches the taller viewBox

/**
 * Draws the full-cycle height and velocity curves as SVG path strings.
 * Runs once on load and again whenever the reference peak velocity
 * changes (since that rescales the velocity curve).
 */
function drawCurves(peakVelocityMs) {
  const heightPoints = [];
  const velocityPoints = [];

  // Sample the model at fine resolution across the full lunar day
  const samples = 120;
  for (let i = 0; i <= samples; i++) {
    const t = (i / samples) * CYCLE_HOURS;
    const x = (i / samples) * CHART_WIDTH;

    const h = predictHeight(t);
    // Map height (roughly 0-16m) onto the chart's vertical space
    const hY = CHART_BOTTOM - (h / 16) * (CHART_BOTTOM - CHART_TOP_PADDING);
    heightPoints.push(`${x.toFixed(1)},${hY.toFixed(1)}`);

    const v = estimateVelocity(t, peakVelocityMs);
    // Map velocity (roughly -peak to +peak) onto the same chart, centred
    const vY = CHART_BOTTOM - (v / peakVelocityMs) * 67; // scaled to match the taller chart area
    velocityPoints.push(`${x.toFixed(1)},${vY.toFixed(1)}`);
  }

  heightPath.setAttribute("d", "M" + heightPoints.join(" L"));
  velocityPath.setAttribute("d", "M" + velocityPoints.join(" L"));
}

/**
 * Updates the metric readouts and playhead position for the
 * currently selected time on the slider.
 */
function updateReadouts() {
  const minutes = parseFloat(timeSlider.value);
  const hours = minutes / 60;
  const peakVelocityMs = parseFloat(peakVelocityInput.value);

  const height = predictHeight(hours);
  const velocity = estimateVelocity(hours, peakVelocityMs);
  const power = powerDensity(velocity);

  timeLabel.textContent = hours.toFixed(1);
  peakVelocityLabel.textContent = peakVelocityMs.toFixed(1) + " m/s";

  metricLevel.textContent = height.toFixed(1) + " m";
  metricVelocity.textContent = velocity.toFixed(2) + " m/s";
  metricPower.textContent = powerDensity(velocity).toFixed(1) + " kW/m\u00B2";

  const turbineOutput = turbinePowerOutputKw(velocity);
  metricTurbine.textContent = turbineOutput.toFixed(0) + " kW";
  compareOutput.textContent = turbineOutput.toFixed(0) + " kW";

  comparePeak.textContent = peakVelocityMs.toFixed(1) + " m/s";

  // Move the playhead marker to the current position on the height curve
  const x = (hours / CYCLE_HOURS) * CHART_WIDTH;
  const y = CHART_BOTTOM - (height / 16) * (CHART_BOTTOM - CHART_TOP_PADDING);
  playhead.setAttribute("cx", x.toFixed(1));
  playhead.setAttribute("cy", y.toFixed(1));
}

// Redraw curves and refresh readouts whenever either slider moves
timeSlider.addEventListener("input", updateReadouts);
peakVelocityInput.addEventListener("input", () => {
  drawCurves(parseFloat(peakVelocityInput.value));
  updateReadouts();
});

/**
 * Draws the real Burntcoat Head validation data (see validation-data.js)
 * on top of the model curve, using the same coordinate mapping as
 * drawCurves() above so the two lines are directly comparable.
 * Also computes and displays RMSE between model and real data over
 * this window, so the methodology note's claim is checkable on the
 * page itself rather than only in fit_check.py.
 */
function drawValidationOverlay() {
  if (!overlayToggle.checked) {
    realDataPath.setAttribute("d", "");
    realDataDots.innerHTML = "";
    rmseReadout.textContent = "";
    return;
  }

  const points = [];
  const errors = [];
  let dotsHtml = "";

  for (let i = 0; i < VALIDATION_HOURS.length; i++) {
    const t = VALIDATION_HOURS[i];
    const realLevel = VALIDATION_LEVELS[i];
    const modelLevel = predictHeight(t);
    errors.push((modelLevel - realLevel) ** 2);

    const x = (t / CYCLE_HOURS) * CHART_WIDTH;
    const y = CHART_BOTTOM - (realLevel / 16) * (CHART_BOTTOM - CHART_TOP_PADDING);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    dotsHtml += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="#d4537e"></circle>`;
  }

  realDataPath.setAttribute("d", "M" + points.join(" L"));
  realDataDots.innerHTML = dotsHtml;

  const rmse = Math.sqrt(errors.reduce((sum, e) => sum + e, 0) / errors.length);
  rmseReadout.textContent = `RMSE over this window: ${rmse.toFixed(2)} m (${VALIDATION_HOURS.length} real hourly points, Burntcoat Head, CHS station 00270)`;
}

overlayToggle.addEventListener("change", drawValidationOverlay);

/**
 * Draws the real ADCP velocity data as its own standalone chart
 * (not overlaid against the model -- see the method-note in
 * index.html for why) and computes summary stats from the real
 * measurements.
 */
function drawRealVelocityChart() {
  const realVelocityPath = document.getElementById("real-velocity-path");
  const realVelMax = document.getElementById("real-vel-max");
  const realVelMean = document.getElementById("real-vel-mean");
  const realVelMin = document.getElementById("real-vel-min");

  const width = 600;
  const bottom = 130;
  const topPadding = 15;
  const maxSpeed = Math.max(...VALIDATION_VELOCITY_SPEEDS);
  const cycleHours = 24; // this panel shows exactly one 24-hour day, not the 24.8h lunar day

  const points = VALIDATION_VELOCITY_HOURS.map((t, i) => {
    const x = (t / cycleHours) * width;
    const y = bottom - (VALIDATION_VELOCITY_SPEEDS[i] / maxSpeed) * (bottom - topPadding);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  realVelocityPath.setAttribute("d", "M" + points.join(" L"));

  const sum = VALIDATION_VELOCITY_SPEEDS.reduce((a, b) => a + b, 0);
  realVelMax.textContent = Math.max(...VALIDATION_VELOCITY_SPEEDS).toFixed(2) + " m/s";
  realVelMean.textContent = (sum / VALIDATION_VELOCITY_SPEEDS.length).toFixed(2) + " m/s";
  realVelMin.textContent = Math.min(...VALIDATION_VELOCITY_SPEEDS).toFixed(2) + " m/s";
}
drawRealVelocityChart();

// Initial render on page load
drawCurves(parseFloat(peakVelocityInput.value));
updateReadouts();
drawValidationOverlay();
