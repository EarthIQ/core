from __future__ import annotations

import logging
import math
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.api.auth.models import User
from app.api.auth.router import get_current_user

logger = logging.getLogger("app.geocode")

router = APIRouter(tags=["geocode"])

NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search"
# Nominatim usage policy: a valid, descriptive User-Agent identifying the app.
USER_AGENT = "EarthIQ/1.0 (self-hosted pluggable geospatial platform)"
MAX_RESULTS = 6
TIMEOUT = 8.0


class GeocodeResult(BaseModel):
    place_id: int
    name: str  # primary display name
    detail: str  # remaining context (rest of the display name)
    lat: float
    lon: float
    category: str  # Nominatim feature class (jsonv2: "category")
    type: str  # Nominatim feature type
    zoom: float  # suggested map zoom derived from the result's bounding box


def _zoom_from_bbox(bbox: Optional[List[str]]) -> float:
    """Suggested zoom that fills a viewport with the bbox (deg SW/N/E/W)."""
    if not bbox or len(bbox) != 4:
        return 14.0
    try:
        south, north, west, east = (float(v) for v in bbox)
    except (TypeError, ValueError):
        return 14.0
    span = max(abs(north - south), abs(east - west), 1e-4)
    zoom = math.log2(360.0 / span)
    return round(min(18.0, max(3.0, zoom)) * 2) / 2


@router.get("", response_model=List[GeocodeResult])
async def search_places(
    q: str = Query(
        ..., min_length=2, max_length=120, description="Free-text place query"
    ),
    lang: Optional[str] = Query(None, max_length=16, description="Accept language"),
    current_user: User = Depends(get_current_user),
) -> List[GeocodeResult]:
    """OSM Nominatim geocoding proxy.

    The public Nominatim API sends no CORS headers and requires a valid
    server-side User-Agent, so the browser never calls it directly — this
    endpoint is the single gateway (and keeps requests rate-friendly).
    """
    params = {
        "q": q,
        "format": "jsonv2",
        "limit": str(MAX_RESULTS),
        "addressdetails": "0",
    }
    if lang:
        params["accept-language"] = lang

    try:
        async with httpx.AsyncClient(
            timeout=TIMEOUT, headers={"User-Agent": USER_AGENT}
        ) as client:
            res = await client.get(NOMINATIM_SEARCH_URL, params=params)
    except httpx.HTTPError as exc:
        logger.warning("Nominatim request failed: %s", exc)
        raise HTTPException(
            status_code=502, detail="Geocoding service unavailable"
        ) from exc

    if res.status_code == 429:
        raise HTTPException(
            status_code=429,
            detail="Geocoding rate limit reached — try again shortly",
        )
    if res.status_code != 200:
        raise HTTPException(
            status_code=502, detail=f"Geocoding service error ({res.status_code})"
        )

    try:
        rows = res.json()
    except ValueError as exc:
        raise HTTPException(
            status_code=502, detail="Geocoding service returned invalid data"
        ) from exc

    results: List[GeocodeResult] = []
    for row in (rows or [])[:MAX_RESULTS]:
        full = str(row.get("display_name") or row.get("addresstext") or "")
        primary = str(row.get("name") or "").strip() or full.split(",")[0].strip() or q
        detail = full.replace(primary, "", 1).strip(" ,")
        try:
            lat = float(row["lat"])
            lon = float(row["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        results.append(
            GeocodeResult(
                place_id=int(row.get("place_id") or 0),
                name=primary,
                detail=detail,
                lat=lat,
                lon=lon,
                # jsonv2 renamed "class" → "category"; accept both.
                category=str(row.get("category") or row.get("class") or ""),
                type=str(row.get("type") or ""),
                zoom=_zoom_from_bbox(row.get("boundingbox")),
            )
        )
    return results