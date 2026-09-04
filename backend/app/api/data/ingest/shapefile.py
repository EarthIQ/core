"""Zipped Shapefile parser (pure-python ``pyshp``, no GDAL required)."""
from __future__ import annotations

import os
import tempfile
import zipfile
from typing import Any, Tuple

from app.api.data.ingest.common import _geometry_to_geojson


def parse_shapefile_bytes(file_bytes: bytes) -> Tuple[list[dict[str, Any]], dict[str, str]]:
    """Parse a zipped Shapefile into GeoJSON-style features + a CRS hint.

    Uses pure-python ``pyshp`` (imported as ``shapefile``) — no GDAL required.
    Returns ``(features, info)`` where ``info`` may contain a detected CRS.
    """
    import shapefile  # noqa: F401 — imported here to keep the base image light

    info: dict[str, str] = {}

    try:
        import io
        zf = zipfile.ZipFile(io.BytesIO(file_bytes))
    except zipfile.BadZipFile as exc:
        raise ValueError(
            "Shapefile upload is not a valid ZIP archive. "
            "Ensure the .shp is zipped together with its .shx/.dbf side files."
        ) from exc

    # Identify the primary .shp inside the archive (search recursively).
    shp_name = next(
        (n for n in zf.namelist() if n.lower().endswith(".shp")), None
    )
    if not shp_name:
        raise ValueError("No .shp file found inside the uploaded Shapefile archive.")

    # Read an optional .prj (WKT) for a CRS hint.
    prj_name = next(
        (
            n
            for n in zf.namelist()
            if n.lower().endswith(".prj")
            and n.rsplit("/", 1)[0] == shp_name.rsplit("/", 1)[0]
        ),
        None,
    )
    if prj_name:
        try:
            prj_wkt = zf.read(prj_name).decode("utf-8", errors="ignore").strip()
            if prj_wkt:
                info["prj"] = prj_wkt[:256]
        except Exception:
            pass

    # pyshp needs the shapefile's sibling files (.shp/.shx/.dbf) on a local
    # filesystem. Extract the whole archive to a temp dir and open by path.
    features: list[dict[str, Any]] = []
    with tempfile.TemporaryDirectory() as tmpdir:
        zf.extractall(tmpdir)
        shp_path = os.path.join(tmpdir, shp_name)
        reader = shapefile.Reader(
            shp_path, encoding="utf-8", encodingErrors="ignore"
        )
        # `reader.fields[0]` is the "DeletionFlag" pseudo-field; the real
        # attribute fields follow it.
        field_names = [f["name"] for f in reader.fields[1:]]
        for shape, rec in zip(reader.shapes(), reader.records()):
            geo_json = _geometry_to_geojson(shape)
            if geo_json is None:
                continue
            props = dict(zip(field_names, rec))
            features.append(
                {"type": "Feature", "geometry": geo_json, "properties": props}
            )

    if not features:
        raise ValueError("Shapefile contained no usable geometries.")
    return features, info


__all__ = ["parse_shapefile_bytes"]
