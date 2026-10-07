---
"@fadymondy/nasaq": patch
---

MapView tiles send the page's origin as Referer again. They were loaded with `referrerpolicy="no-referrer"`, and tile.openstreetmap.org answers requests with no Referer with a 403 "Access blocked" tile, so OSM maps showed the block notice instead of the map.
