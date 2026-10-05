// Tijdelijke lokale webserver om de vragenhulp te testen.
const http = require("http");
const fs = require("fs");
const path = require("path");

const wortel = path.resolve(__dirname, "..", "prototype");
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".json": "application/json",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain",
};

http
  .createServer((req, res) => {
    let url = decodeURIComponent(req.url.split("?")[0]);
    if (url.endsWith("/")) url += "index.html";
    const bestand = path.normalize(path.join(wortel, url));
    if (!bestand.startsWith(wortel)) {
      res.writeHead(403);
      return res.end();
    }
    fs.readFile(bestand, (fout, data) => {
      if (fout) {
        res.writeHead(404);
        return res.end("niet gevonden");
      }
      res.writeHead(200, { "Content-Type": types[path.extname(bestand)] || "application/octet-stream", "Cache-Control": "no-store" });
      res.end(data);
    });
  })
  .listen(8080, "127.0.0.1", () => console.log("draait op http://localhost:8080"));
