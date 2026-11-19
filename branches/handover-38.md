
## The world stays awake — 19 November (patch38.server.js)

Render's free instance stops after 15 minutes with no request, so the world
only went forward while somebody had the page open — `world.json` commits
since September fall on a handful of single days. The README called that a
principle. Asked again, for a piece meant to run for years, Jeff chose:
*"Keep it awake, free"*.

* The server asks itself for `/stats` every ten minutes, at
  `RENDER_EXTERNAL_URL` (or `SELF_URL`). That is an ordinary inbound request,
  which is all Render counts. Free allowance: 750 instance hours a month per
  workspace; a month is at most 744, so one service all month fits. Render
  may restart a free service at any time; it comes back and carries on. Never
  `/join` with an id — that counts a visitor and breeds a machine.
* The world is written to GitHub every **six hours** (was five minutes) and on
  every stop. Each save is a ~190 kB commit to the Pages repository: awake all
  the time, five minutes would be ~55 MB a day. Six hours is ~280 MB a year. A
  crash loses at most six hours; a restart or deploy loses nothing, because
  Render signals first and the server writes the world down then.
* Still on the free instance's speed: `speed` 0.6, about a quarter of
  `TIME_MUL` 2.4.

To check it is working without waking it yourself: leave it alone for half
an hour, then `/join` (no id) — `up` should be longer than the gap.
