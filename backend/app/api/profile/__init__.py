"""Profile / Organization / Preferences domain (core).

This package owns:
  - self-service *user profile* reads + updates (``PUT /me/profile``)
  - *password change* for the signed-in user (``POST /me/password``)
  - *organizations* (workspaces) and the user↔organization membership
  - server-persisted *user preferences* (theme, units, basemap, ...)

It re-exports the core ``Base`` / session helpers and is mounted at
``/api/profile`` (see ``app.main``). It is transport-agnostic and testable.
"""