"""
app.api.data.ingest
~~~~~~~~~~~~~~~~~~~
Per-format ingestion strategies for spatial datasets, split out of the old
single-file ``service.py`` (ticket T-09).

Modules
-------
``common``       shared helpers (types, attributes, feature insert, storage)
``geojson``      GeoJSON parser
``shapefile``    zipped Shapefile parser (pyshp)
``kml``          KML parser
``georss``       GeoRSS parser
``csv``          CSV parser + coordinate detection
``dispatcher``   :func:`ingest_dataset` — the public entry point

``app.api.data.service`` remains the stable public facade and re-exports
everything from here so existing imports keep working.
"""
