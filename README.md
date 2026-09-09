# Tidal Resource Assessment — Bay of Fundy

A single-file, no-build-step web tool that models tidal height and tidal-current
power potential for the Minas Passage, Bay of Fundy — home of the world's
largest tidal range and Canada's lead tidal-stream test site (FORCE).

**Live demo:** add your GitHub Pages link here once deployed.

## What it does

- **Overview** — background on why the Bay of Fundy's tides are so extreme
  (resonance with the ~12.4-hour lunar tidal cycle), plus a Leaflet map of
  Minas Passage and the FORCE test site.
- **Current Status** — a snapshot of what's actually being built at FORCE
  right now (authorized capacity, contracted turbines, PPA terms).
- **Calculator** — an interactive harmonic tide model. Drag the time slider
  to move through a lunar day and watch predicted water level, estimated
  current speed, power density, and a real turbine's output update live,
  including a plain-language readout of roughly how many homes that output
  would power.
- **Resources** — full methodology, data sources, and known limitations,
  written so every number on the page can be traced back to its source.

## Why the numbers can be trusted (or checked)

This project follows the same rule as the rest of the portfolio: flag every
approximation instead of hiding it.

- The M2/S2/N2 harmonic constants used to predict water level weren't
  guessed — they were fitted by least-squares regression against 30 real
  days of predicted water levels for Burntcoat Head (CHS station 00270),
  pulled live from the Canadian Hydrographic Service IWLS API
  (`fetch_iwls_data.py`, fit performed in `fit_check.py`).
- A first attempt using only 1 day of data failed outright — M2, S2, and N2
  are under 30 minutes apart in period, so a single day can't statistically
  separate them, and it produced physically impossible 40+ metre tides.
  That failure is documented rather than swept under the rug.
- Current velocity is **not** measured directly — it's approximated from the
  rate of change of the fitted height curve, since velocity isn't derivable
  from height alone. This is called out explicitly in the Resources tab.
- A real, standalone reference is included: one week of genuine current
  speed measurements from a seabed ADCP at the FORCE Crown Lease Area
  (`fetch_adcp_data.py`, CIOOS Atlantic / FORCE, CC BY 4.0). It's shown next
  to — not blended into — the model chart, because the height model's clock
  isn't yet anchored to real calendar dates, so overlaying them would imply
  a comparison that isn't actually valid.
- Turbine output is calibrated against Orbital Marine's real, published O2
  specifications (600 m² swept area, 2 MW rated at 2.5 m/s), including the
  pitch-control cap that holds output flat above rated speed — matching how
  the real turbine behaves rather than showing an unrealistic runaway curve.

## Project structure

```
tidal-resource-assessment/
├── index.html              # page structure, styles, all four tabs
├── js/
│   ├── tabs.js              # tab-switcher
│   ├── location-map.js      # Leaflet map (Overview tab)
│   ├── tide-model.js        # harmonic model, turbine model, chart drawing, UI wiring
│   └── validation-data.js   # embedded real water-level + ADCP validation data
├── fetch_iwls_data.py       # pulls 30 days of real Burntcoat Head water levels
├── fetch_adcp_data.py       # pulls real FORCE seabed ADCP current-speed data
├── fit_check.py             # fits M2/S2/N2 constants against the real data, validates RMSE
└── force_adcp_velocity.csv  # saved output of fetch_adcp_data.py
```

## Data sources

| Source | Used for | License |
|---|---|---|
| [Canadian Hydrographic Service — IWLS API](https://api-iwls.dfo-mpo.gc.ca) | 30 days of real predicted water levels, Burntcoat Head (station 00270) | Government of Canada, public |
| [CIOOS Atlantic / FORCE — Seabed ADCP Currents](https://catalogue.cioosatlantic.ca/dataset/ca-cioos_db15458d-df2c-4efb-b5a0-791e7561a0cb) | Real measured current speed, FORCE Crown Lease Area | CC BY 4.0 |
| [Orbital Marine Power](https://www.orbitalmarine.com) | O2 turbine swept area & rated power/velocity | Manufacturer published specs |
| [FORCE](https://fundyforce.ca) | Site background & current project status | — |
| OpenStreetMap contributors, via Leaflet.js | Base map tiles | ODbL |

## Running the data pull scripts

```bash
pip install requests --break-system-packages
python3 fetch_iwls_data.py   # -> burntcoat_head_30days.csv + array to paste into fit_check.py
python3 fetch_adcp_data.py   # -> force_adcp_velocity.csv + array to paste into validation-data.js
python3 fit_check.py         # -> fitted M2/S2/N2 constants + RMSE comparison
```

## Running the page locally

No build step — just serve the folder so `js/*.js` loads correctly:

```bash
python3 -m http.server
```

Then open `http://localhost:8000`.

## Known limitations

- Current velocity is derived from the rate of change of height, not from a
  direct current-harmonic fit — a true fit would need a long ADCP time
  series (weeks to months).
- The height model's clock isn't anchored to real epoch time, so it can't
  yet predict for a specific historical or future date.
- The turbine model reuses the O2's published 600 m² swept area as a stand-in
  for the O2-X, since the O2-X's exact figure isn't separately published.

## About the author

**Tendekai Mugomba** — Electrical engineering student in Nova Scotia,
building data-driven tools across solar, wind, hydro, and tidal energy.

- LinkedIn: [linkedin.com/in/tendekai-mugomba](https://www.linkedin.com/in/tendekai-mugomba)
- GitHub: [github.com/tmugomba](https://github.com/tmugomba)
- Email: mugomba.tendekai@gmail.com
