/* ============================================================
   VALIDATION DATA
   ------------------------------------------------------------
   Real predicted water levels for Burntcoat Head (CHS station
   00270), pulled live from the Canadian Hydrographic Service IWLS
   API via fetch_iwls_data.py. This is the SAME 30-day dataset used
   offline in fit_check.py to derive the M2/S2/N2 constants now
   baked into tide-model.js — embedding it here lets the page show
   the real data next to the model's prediction, rather than asking
   the reader to trust the fit_check.py numbers on faith.

   VALIDATION_HOURS is normalized so hour 0 lines up with the
   chart's x-axis start (the raw IWLS data started at 0.283h past
   midnight; that offset is subtracted here).
   ============================================================ */

const VALIDATION_HOURS = [0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 11.0, 12.0,
  13.0, 14.0, 15.0, 16.0, 17.0, 18.0, 19.0, 20.0, 21.0, 22.0, 23.0, 24.0, 25.0];

const VALIDATION_LEVELS = [13.311, 11.948, 9.569, 7.043, 4.829, 2.936, 1.803, 2.275, 4.297,
  6.875, 9.364, 11.515, 12.725, 12.38, 10.609, 8.217, 5.943, 3.945, 2.404, 2.145, 3.648, 6.21,
  8.938, 11.481, 13.35, 13.761];

/* ============================================================
   REAL VELOCITY DATA — FORCE seabed ADCP, Minas Passage
   ------------------------------------------------------------
   Genuine current speed measurements (not modelled) from a seabed
   ADCP deployed at the FORCE Crown Lease Area, 45.363°N 64.427°W,
   at ~25.5m depth. Source: CIOOS Atlantic / FORCE, CC BY 4.0.
   One 24-hour slice (15-minute resolution) of the full week-long
   pull, covering 2018-04-01 00:00 to 23:45 UTC.

   IMPORTANT: this is presented as a STANDALONE real reference, not
   overlaid against the harmonic height model's velocity curve. The
   height model's M2/S2/N2 fit is anchored to an arbitrary "hours
   since data-pull start" clock (Sept 2026), not real calendar time,
   so it cannot yet predict for an arbitrary historical date like
   April 2018. Overlaying the two without fixing that mismatch would
   show them out of phase for no physical reason -- misleading, not
   validating. See the methodology note in index.html.
   ============================================================ */

const VALIDATION_VELOCITY_HOURS = [0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5,
  2.75, 3.0, 3.25, 3.5, 3.75, 4.0, 4.25, 4.5, 4.75, 5.0, 5.25, 5.5, 5.75, 6.0, 6.25, 6.5, 6.75,
  7.0, 7.25, 7.5, 7.75, 8.0, 8.25, 8.5, 8.75, 9.0, 9.25, 9.5, 9.75, 10.0, 10.25, 10.5, 10.75,
  11.0, 11.25, 11.5, 11.75, 12.0, 12.25, 12.5, 12.75, 13.0, 13.25, 13.5, 13.75, 14.0, 14.25,
  14.5, 14.75, 15.0, 15.25, 15.5, 15.75, 16.0, 16.25, 16.5, 16.75, 17.0, 17.25, 17.5, 17.75,
  18.0, 18.25, 18.5, 18.75, 19.0, 19.25, 19.5, 19.75, 20.0, 20.25, 20.5, 20.75, 21.0, 21.25,
  21.5, 21.75, 22.0, 22.25, 22.5, 22.75, 23.0, 23.25, 23.5, 23.75];

const VALIDATION_VELOCITY_SPEEDS = [2.471, 2.906, 3.645, 4.018, 4.303, 4.576, 4.558, 4.633,
  4.598, 4.792, 4.612, 4.404, 3.967, 4.015, 3.896, 3.6, 3.135, 2.749, 2.267, 1.703, 0.992,
  0.472, 0.404, 2.044, 3.168, 2.863, 3.133, 3.404, 3.354, 3.444, 3.582, 3.536, 3.459, 3.437,
  3.272, 3.023, 2.988, 2.728, 2.539, 2.278, 2.007, 1.726, 1.461, 1.016, 0.574, 0.246, 0.745,
  1.291, 1.66, 2.318, 2.509, 3.339, 3.657, 4.09, 4.521, 4.646, 4.759, 4.589, 4.88, 4.831, 4.541,
  4.411, 4.541, 4.272, 3.584, 3.239, 2.973, 2.578, 2.129, 1.445, 0.874, 0.303, 1.001, 2.906,
  2.937, 3.022, 3.431, 3.518, 3.483, 3.502, 3.618, 3.689, 3.519, 3.445, 3.071, 3.038, 2.852,
  2.728, 2.46, 2.236, 1.959, 1.626, 1.341, 0.912, 0.51, 0.185];
