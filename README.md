# mope-v2-expanded

To install dependencies:

```bash
bun install
```

To download all discoverable same-origin files with up to 65 concurrent
requests:

```bash
bun run fetch-mope.ts
```

The downloader follows links and resources found in HTML, CSS, JavaScript, and
directory-index pages. It saves files of any extension under `mope-download/`
by default. On reruns it reuses files already in that directory and scans them
for links, so it does not download those files again. Pass a different output
directory as an optional argument, or add `--refresh` to fetch existing files
again.

To download the game client files, prettify JavaScript, and recursively fetch
same-origin assets referenced by the client:

```bash
python --version  # Python 3.10+
python -m pip install -r requirements.txt
python fetch_mope.py
```

By default, files are saved under `mope-download/`. You can choose another
client page or output directory:

```bash
python fetch_mope.py --url https://mope.io/ --output mope-download
```

## Run the local web server

Node.js 20 or newer is required. From the project root:

```bash
npm start
```

The server listens on `127.0.0.1:3000` by default and serves files from
`mope-download/`. Set `PORT`, `HOST`, or `STATIC_DIR` to override the defaults.
For development with automatic restarts, run `npm run dev`.

The backend provides `GET /api/health` for health checks and serves the
downloaded client and assets. It does not implement the original game's
multiplayer services or game logic.

## Recommended hosting: Railway

Railway can host this Node server and the static client together as one web
service. Create a Railway project from this repository, then configure the
service with `npm install` as the build command and `npm start` as the start
command. Add the variable `HOST=0.0.0.0` so the server is reachable by Railway's
proxy, and set the service health-check path to `/api/health`. Railway provides
the `PORT` environment variable automatically.
