"""CSV / TSV parsing + coordinate-column detection + row→point features."""
from __future__ import annotations

import csv
import io
from typing import Any, Tuple


def detect_coord_columns(rows: list[dict[str, Any]]) -> Tuple[str | None, str | None]:
    """Heuristically find (lon, lat) column names from a header row."""
    if not rows:
        return None, None
    headers = [str(h).strip().lower() for h in rows[0].keys()]

    def find(candidates: list[str]) -> str | None:
        for cand in candidates:
            if cand in headers:
                return cand
        return None

    lon = find(["lon", "lng", "longitude", "x"])
    lat = find(["lat", "latitude", "y"])
    # Disambiguate the x/y shortcut (only if lon/lat weren't explicitly present)
    if lon in ("x",) and lat in ("y",):
        if not any(h in ("lon", "lng", "longitude", "lat", "latitude") for h in headers):
            pass  # keep x/y
    return lon, lat


def parse_csv_bytes(file_bytes: bytes) -> Tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Parse a CSV file into ``(rows, header)``.

    ``rows`` is a list of ``{column: value}`` dicts (values kept as strings,
    except obviously numeric ones). ``header`` is the ordered column list.
    """
    try:
        decoded = file_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        decoded = file_bytes.decode("latin-1")

    dialect = csv.Sniffer().sniff(decoded[:4096], delimiters=",;\t|")
    reader = csv.DictReader(io.StringIO(decoded), dialect=dialect)
    rows: list[dict[str, Any]] = []
    for raw in reader:
        row: dict[str, Any] = {}
        for k, v in raw.items():
            if k is None:
                continue
            row[str(k)] = _coerce_scalar(v)
        rows.append(row)
    header = [str(c) for c in (reader.fieldnames or [])]
    return rows, header


def _coerce_scalar(v: Any) -> Any:
    if v is None or (isinstance(v, str) and v.strip() == ""):
        return None
    if isinstance(v, (int, float, bool)):
        return v
    s = v.strip()
    try:
        if any(ch in s for ch in ".eE") and all(ch in "0123456789.+-eE" for ch in s):
            return float(s)
        return int(s)
    except ValueError:
        return v


def _rows_to_features(
    rows: list[dict[str, Any]], lon: str | None, lat: str | None
) -> list[dict[str, Any]]:
    """Turn tabular rows into point features (when a coordinate pair exists)."""
    if not lon or not lat:
        return []
    features: list[dict[str, Any]] = []
    for row in rows:
        try:
            x = float(row.get(lon))
            y = float(row.get(lat))
        except (TypeError, ValueError):
            continue
        props = {k: v for k, v in row.items() if k not in (lon, lat)}
        features.append(
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [x, y]},
                "properties": props,
            }
        )
    return features


__all__ = [
    "detect_coord_columns",
    "parse_csv_bytes",
    "_coerce_scalar",
    "_rows_to_features",
]
