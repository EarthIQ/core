"""Temporary check: import the app and list share-related routes."""
import app.main as m

routes = [
    (r.path, sorted(getattr(r, "methods", None) or []))
    for r in m.app.routes
    if hasattr(r, "methods") and getattr(r, "methods", None)
]
share = [r for r in routes if "share" in r[0] or "invite" in r[0] or "people" in r[0] or "access" in r[0]]
for path, methods in share:
    print(methods, path)

# Sanity: make sure there are no duplicated (path, method) pairs
from collections import Counter

pairs = Counter((p, mt) for p, mths in routes for mt in mths)
dups = {k: v for k, v in pairs.items() if v > 1}
assert not dups, f"duplicate routes: {dups}"

# Sanity: the new model is registered on the metadata
from app.core.db import Base

assert "access_requests" in Base.metadata.tables, "access_requests table not registered"
print("\nOK — app imported; access_requests model registered; no duplicate routes.")

