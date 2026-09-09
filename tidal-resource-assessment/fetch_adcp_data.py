"""
fetch_adcp_data.py
-------------------
Pulls REAL current velocity data from a seabed ADCP deployed at the
FORCE Crown Lease Area (Minas Passage, Bay of Fundy) from March 30 to
May 24, 2018. This is a genuine field measurement, not a model output
-- it's the first real velocity data this project has touched, versus
the derivative-based approximation currently in tide-model.js.

Source: CIOOS Atlantic / FORCE, CC BY 4.0 licensed.
https://catalogue.cioosatlantic.ca/dataset/ca-cioos_db15458d-df2c-4efb-b5a0-791e7561a0cb

The data comes from an ERDDAP server, which is much simpler to query
than the IWLS API used for water levels -- it's a plain HTTP GET
returning CSV directly, no UUID lookups or auth needed.

Usage:
    pip install requests --break-system-packages
    python3 fetch_adcp_data.py
"""
import requests
import csv
import io
import math

ERDDAP_BASE = "https://cioosatlantic.ca/erddap/tabledap/FORCE_Mar2018_ADCP_Currents.csv"

# Pick a mid-water-column depth bin to avoid surface wave noise and
# near-seabed boundary-layer effects -- 25.5 m sits roughly in the
# middle of the instrument's 1.5-50.5 m measurement range.
CELL_RANGE = 25.5

# Pull one week of data. The full deployment spans ~8 weeks; start
# with a week to keep the request small and fast, then widen the
# date range below once this is confirmed working.
START = "2018-04-01T00:00:00Z"
END = "2018-04-08T00:00:00Z"


def fetch_velocity_data():
    params = {
        "eastward_sea_water_velocity": "",
        "northward_sea_water_velocity": "",
    }
    # ERDDAP's query syntax puts variable names as a comma-separated
    # list directly in the query string, then constraints with
    # operators baked into the parameter name -- easiest to just
    # build the URL by hand rather than fight requests' param encoding.
    query = (
        f"time,eastward_sea_water_velocity,northward_sea_water_velocity"
        f"&cell_range={CELL_RANGE}"
        f"&time>={START}"
        f"&time<={END}"
    )
    url = f"{ERDDAP_BASE}?{query}"
    print(f"Requesting: {url}\n")

    resp = requests.get(url)
    resp.raise_for_status()
    return resp.text


def main():
    raw_csv = fetch_velocity_data()

    # ERDDAP CSVs have two header rows: column names, then units.
    # Skip both before parsing the actual data rows.
    reader = csv.reader(io.StringIO(raw_csv))
    rows = list(reader)
    header = rows[0]
    data_rows = rows[2:]  # skip name row and units row

    print(f"Columns: {header}")
    print(f"Total rows: {len(data_rows)}\n")

    timestamps = []
    speeds = []
    for row in data_rows:
        if len(row) < 3:
            continue
        time_str, east_str, north_str = row[0], row[1], row[2]
        if not east_str or not north_str:
            continue  # skip missing values
        east = float(east_str)
        north = float(north_str)
        speed = math.sqrt(east**2 + north**2)  # combine components into scalar current speed
        timestamps.append(time_str)
        speeds.append(round(speed, 3))

    print(f"Parsed {len(speeds)} valid speed measurements")
    if speeds:
        print(f"Speed range: {min(speeds):.2f} to {max(speeds):.2f} m/s")

    # Save to CSV for your own records
    with open("force_adcp_velocity.csv", "w") as f:
        f.write("timestamp,current_speed_ms\n")
        for t, s in zip(timestamps, speeds):
            f.write(f"{t},{s}\n")
    print("\nSaved to force_adcp_velocity.csv")

    # Print arrays ready to paste back for validation, same pattern
    # as fetch_iwls_data.py
    print("\n" + "=" * 60)
    print("COPY THESE BACK FOR THE VELOCITY VALIDATION:")
    print("=" * 60)
    print(f"real_speeds = {speeds[:200]}")  # cap at 200 points to keep the paste manageable
    if len(speeds) > 200:
        print(f"\n(truncated at 200 of {len(speeds)} points -- widen or narrow the date range in the script if you want more or fewer)")


if __name__ == "__main__":
    main()
