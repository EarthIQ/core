"""GeoRSS (RSS/Atom) parser → GeoJSON point features."""
from __future__ import annotations

from typing import Any


def parse_georss_bytes(file_bytes: bytes) -> list[dict[str, Any]]:
    """Parse a GeoRSS feed into GeoJSON point features.

    GeoRSS (RSS/Atom) carries point geometry via ``georss:point``
    ("lat lon") and linearring/polygon via ``georss:linearring``.
    """
    import xml.etree.ElementTree as ET

    try:
        tree = ET.fromstring(file_bytes)
    except ET.ParseError as exc:
        raise ValueError(f"Invalid GeoRSS/XML: {exc}") from exc

    def _local(tag: str) -> str:
        return tag.rsplit("}", 1)[-1]

    features: list[dict[str, Any]] = []
    # Each item/entry element holds a title, description and geo info.
    for item in tree.iter():
        if _local(item.tag) not in ("item", "entry", "event", "kml:Placemark"):
            continue
        props: dict[str, Any] = {}
        point = None
        linearring = None
        for child in item.iter():
            ctag = _local(child.tag)
            if ctag in ("title", "description", "link"):
                if child.text is not None and ctag != "link":
                    props.setdefault(ctag, child.text.strip())
            elif ctag == "point":
                txt = (child.text or "").strip().split()
                if len(txt) >= 2:
                    try:
                        lat = float(txt[0])
                        lon = float(txt[1])
                        point = {"type": "Point", "coordinates": [lon, lat]}
                    except ValueError:
                        pass
            elif ctag in ("linearring", "polygon"):
                coords = []
                for token in (child.text or "").replace("\n", ",").split(","):
                    parts = token.strip().split()
                    if len(parts) >= 2:
                        try:
                            coords.append([float(parts[1]), float(parts[0])])
                        except ValueError:
                            continue
                if coords:
                    linearring = {
                        "type": "LineString",
                        "coordinates": coords,
                    }
        geom = point or linearring
        if geom is None:
            continue
        features.append(
            {"type": "Feature", "geometry": geom, "properties": props}
        )

    if not features:
        raise ValueError("GeoRSS feed contained no usable point geometry.")
    return features


__all__ = ["parse_georss_bytes"]
