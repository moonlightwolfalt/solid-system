"use strict";

const { createServer } = require("node:http");
const { createReadStream } = require("node:fs");
const { realpath, stat } = require("node:fs/promises");
const path = require("node:path");

const staticRoot = path.resolve(__dirname, process.env.STATIC_DIR || "mope-download");
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
const mimeTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".mp4": "video/mp4",
  ".ogg": "audio/ogg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
};

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError(`Invalid PORT: ${process.env.PORT}`);
}

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(data));
}

function isInsideRoot(filePath, rootPath) {
  return filePath === rootPath || filePath.startsWith(`${rootPath}${path.sep}`);
}

async function serveStatic(request, response, rootPath) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    sendJson(response, 400, { error: "Invalid URL path" });
    return;
  }

  const requestedPath = path.resolve(rootPath, `.${pathname}`);
  if (!isInsideRoot(requestedPath, rootPath) || pathname.includes("\0")) {
    sendJson(response, 403, { error: "Forbidden" });
    return;
  }

  try {
    const realRoot = await realpath(rootPath);
    let filePath = await realpath(requestedPath);
    if (!isInsideRoot(filePath, realRoot)) {
      sendJson(response, 403, { error: "Forbidden" });
      return;
    }

    let fileInfo = await stat(filePath);
    if (fileInfo.isDirectory()) {
      filePath = await realpath(path.join(filePath, "index.html"));
      if (!isInsideRoot(filePath, realRoot)) {
        sendJson(response, 403, { error: "Forbidden" });
        return;
      }
      fileInfo = await stat(filePath);
    }

    if (!fileInfo.isFile()) {
      sendJson(response, 404, { error: "Not found" });
      return;
    }

    response.writeHead(200, {
      "content-length": fileInfo.size,
      "content-type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
    });

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    createReadStream(filePath)
      .on("error", (error) => {
        console.error("Failed while streaming static file:", error);
        if (!response.headersSent) {
          sendJson(response, 500, { error: "Internal server error" });
        } else {
          response.destroy(error);
        }
      })
      .pipe(response);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      sendJson(response, 404, { error: "Not found" });
      return;
    }
    throw error;
  }
}

async function main() {
  const realRoot = await realpath(staticRoot);
  const server = createServer(async (request, response) => {
    try {
      if (request.method !== "GET" && request.method !== "HEAD") {
        response.writeHead(405, { allow: "GET, HEAD" });
        response.end();
        return;
      }

      const pathname = new URL(request.url, "http://localhost").pathname;
      if (pathname === "/api/health") {
        sendJson(response, 200, { status: "ok" });
        return;
      }

      await serveStatic(request, response, realRoot);
    } catch (error) {
      console.error("Request failed:", error);
      if (!response.headersSent) {
        sendJson(response, 500, { error: "Internal server error" });
      } else {
        response.destroy(error);
      }
    }
  });

  server.listen(port, host, () => {
    console.log(`Local backend serving ${realRoot} at http://${host}:${port}`);
  });
}

main().catch((error) => {
  console.error("Could not start the local backend:", error);
  process.exitCode = 1;
});
