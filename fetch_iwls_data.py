"""
fetch_iwls_data.py
------------------
Pulls ~30 days of real predicted water levels for Burntcoat Head
(Bay of Fundy, station code 00270) from the free, public Canadian
Hydrographic Service IWLS API, resamples to hourly, and prints a
Python array ready to paste into fit_check.py for a proper harmonic fit.

Why 30 days: M2 (12.42h) and S2 (12.00h) only fully separate from each
other once you've covered their "beat period" (~14.8 days, the time for
spring tides to cycle back to neap and around again). One day of data
can't tell them apart — that's exactly the failure documented in the
project's methodology note. 30 days gives roughly two full beat cycles,
which is enough for a stable least-squares fit.

Usage:
    pip install requests --break-system-packages
    python3 fetch_iwls_data.py
"""
import requests
import datetime as dt
import time
import json

BASE_URL = "https://api-iwls.dfo-mpo.gc.ca/api/v1"
STATION_CODE = "00270"  # Burntcoat Head
DAYS_TO_FETCH = 30
CHUNK_DAYS = 7  # the API caps how much range you can request per call, so we fetch in weekly chunks


def get_station_uuid(code):
    """
    The IWLS API identifies stations by an internal UUID, not the
    5-digit code used on the public tides.gc.ca website. This looks
    up the UUID for our station code first.
    """
    resp = requests.get(f"{BASE_URL}/stations", params={"code": code})
    resp.raise_for_status()
    stations = resp.json()
    if not stations:
        raise ValueError(f"No station found for code {code}")
    return stations[0]["id"]


def fetch_predictions(station_uuid, start, end):
    """
    Fetches predicted water level (time-series-code=wlp) for one
    date range. Returns a list of {eventDate, value} dicts.
    """
    params = {
        "time-series-code": "wlp",  # "wlp" = water level predictions
        "from": start.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "to": end.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "resolution": "SIXTY_MINUTES",  # ask for hourly directly, no need to resample ourselves
    }
    resp = requests.get(f"{BASE_URL}/stations/{station_uuid}/data", params=params)
    resp.raise_for_status()
    return resp.json()


def main():
    print(f"Looking up station UUID for code {STATION_CODE}...")
    station_uuid = get_station_uuid(STATION_CODE)
    print(f"Found UUID: {station_uuid}")

    all_points = []
    end_date = dt.datetime.utcnow()
    start_date = end_date - dt.timedelta(days=DAYS_TO_FETCH)

    cursor = start_date
    while cursor < end_date:
        chunk_end = min(cursor + dt.timedelta(days=CHUNK_DAYS), end_date)
        print(f"Fetching {cursor.date()} to {chunk_end.date()}...")
        try:
            points = fetch_predictions(station_uuid, cursor, chunk_end)
            all_points.extend(points)
        except requests.HTTPError as e:
            print(f"  Request failed: {e}")
        cursor = chunk_end
        time.sleep(0.5)  # be polite to the free public API, avoid hammering it

    print(f"\nTotal points fetched: {len(all_points)}")

    # Convert to hours-since-start and water level, ready for the fit script
    hours = []
    levels = []
    for p in all_points:
        timestamp = dt.datetime.strptime(p["eventDate"], "%Y-%m-%dT%H:%M:%SZ")
        elapsed_hours = (timestamp - start_date).total_seconds() / 3600
        hours.append(round(elapsed_hours, 3))
        levels.append(p["value"])

    # Save raw data to a CSV as a backup / for your own records
    with open("burntcoat_head_30days.csv", "w") as f:
        f.write("hours_elapsed,water_level_m\n")
        for h, v in zip(hours, levels):
            f.write(f"{h},{v}\n")
    print("Saved full data to burntcoat_head_30days.csv")

    # Print a Python-ready array for pasting straight into fit_check.py
    print("\n" + "=" * 60)
    print("COPY THE TWO LINES BELOW INTO fit_check.py:")
    print("=" * 60)
    print(f"real_hours = np.array({hours})")
    print(f"real_levels = np.array({levels})")


if __name__ == "__main__":
    main()
