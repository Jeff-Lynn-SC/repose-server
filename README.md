# Repose — the world

One simulation, running on this machine, for good. Browsers do not compute the
sand; they ask what it is now and draw it themselves. Each one points its own
camera, so everybody is looking at the same world and nobody at the same thing.

Files: `server.js`, `sim.node.js`, `bench.js`, `repose.service`.
No dependencies. Node 18 or later.

## 1. Will this Pi carry it?

    node bench.js

It reports how fast the world can run. 2.4x is what Repose is tuned for;
anything above 1x is watchable. If it comes out below 2.4, set `TIME_MUL`
in the service file to whatever it suggests.

## 2. Run it

    PORT=8080 node server.js

Then from another machine on your network: `http://<pi>:8080/join?id=test`
should return some JSON.

## 3. Put it on Render (free)

1. Push these files to a repository — `repose-server` is a good name.
2. render.com → New → **Web Service** → connect that repository.
3. Runtime **Node**, Build command **(leave empty)**, Start command **`node server.js`**.
4. Instance type **Free**.
5. Under **Environment**, add:

   | key | value |
   |---|---|
   | `GH_TOKEN` | a GitHub token with `repo` scope |
   | `GH_REPO` | `Jeff-Lynn-SC/repose` |
   | `GH_PATH` | `world.json` |

6. Create. You get an HTTPS address like `https://repose.onrender.com`.

The free instance sleeps after fifteen minutes with nobody there and takes
about a minute to wake. That is the rule, not a fault: Repose works when it is
watched. The sand rests when nobody is looking.

## The world's state

With `GH_TOKEN` and `GH_REPO` set, the world is committed to your repository
every five minutes and on shutdown — visitor count, who has already been, and
the sand itself. Free hosts have no disk that survives a restart, so this is
what makes the world durable. It also means every version is kept: the whole
history of the place is in the commit log, and you could read it back years
later.

Without those variables it falls back to `world.json` on disk, which is what
you want if you ever run it on a machine of your own.

## Endpoints

- `GET /join?id=<something stable per person>` — adds one machine the first
  time that id is seen, and never again. Returns the visitor count.
- `GET /state?since=<version>` — binary. Everything if `since=0`, otherwise
  only what has changed. Gzipped if asked for.
