// MYTRM prototype — zero-dependency local server.
// Serves /public and generates /js/env.js from your .env file.
const http = require("http");
const fs = require("fs");
const path = require("path");

// --- tiny .env loader (no packages needed) ---
function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m || line.trim().startsWith("#")) continue;
    let v = m[2].replace(/^['"]|['"]$/g, "");
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || "localhost";
const ROOT = path.join(__dirname, "public");

// Only these keys are exposed to the browser. Never add secrets here.
const PUBLIC_ENV = {
  APP_ENV: process.env.APP_ENV || "local",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_xxxxxxxx",
  PAYMENT_MODE: process.env.PAYMENT_MODE || "simulated",
  GST_RATE: Number(process.env.GST_RATE) || 0.18,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "support@mytrm.in"
};

const TYPES = { ".html":"text/html; charset=utf-8", ".css":"text/css; charset=utf-8", ".js":"application/javascript; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp", ".ico":"image/x-icon", ".json":"application/json" };

http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  if (url === "/js/env.js") {
    res.writeHead(200, { "Content-Type": TYPES[".js"], "Cache-Control": "no-store" });
    return res.end("window.MYTRM_ENV = " + JSON.stringify(PUBLIC_ENV, null, 2) + ";\n");
  }
  if (url === "/health") { res.writeHead(200, {"Content-Type":"application/json"}); return res.end(JSON.stringify({ok:true, env:PUBLIC_ENV.APP_ENV})); }
  let file = path.normalize(path.join(ROOT, url === "/" ? "index.html" : url));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) file = path.join(ROOT, "index.html"); // SPA fallback
    fs.readFile(file, (e, data) => {
      if (e) { res.writeHead(500); return res.end("Server error"); }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file).toLowerCase()] || "application/octet-stream" });
      res.end(data);
    });
  });
}).listen(PORT, HOST, () => {
  console.log(`\n  MYTRM prototype running → http://${HOST}:${PORT}`);
  console.log(`  env: ${PUBLIC_ENV.APP_ENV} · payments: ${PUBLIC_ENV.PAYMENT_MODE}\n`);
});
