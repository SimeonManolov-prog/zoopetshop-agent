require("dotenv").config();
var express = require("express");
var crypto = require("crypto");
var cookieParser = require("cookie-parser");
var app = express();
app.use(express.json());
app.use(cookieParser());

var SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY;
var SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;
var SHOPIFY_SCOPES = process.env.SHOPIFY_SCOPES;
var SHOPIFY_STORE = process.env.SHOPIFY_STORE;
var APP_URL = process.env.APP_URL;
var PORT = process.env.PORT || 3000;
var tokenStore = {};

app.get("/auth", function(req, res) {
  var shop = req.query.shop || SHOPIFY_STORE;
  var nonce = crypto.randomBytes(16).toString("hex");
  res.cookie("nonce", nonce, { httpOnly: true, sameSite: "lax" });
  var url = "https://" + shop + "/admin/oauth/authorize?client_id=" + SHOPIFY_API_KEY + "&scope=" + SHOPIFY_SCOPES + "&redirect_uri=" + encodeURIComponent(APP_URL + "/auth/callback") + "&state=" + nonce;
  res.redirect(url);
});

app.get("/auth/callback", function(req, res) {
  var shop = req.query.shop;
  var code = req.query.code;
  var state = req.query.state;
  if (state !== req.cookies.nonce) return res.status(403).send("Invalid state");
  fetch("https://" + shop + "/admin/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code: code })
  })
  .then(function(r) { return r.json(); })
  .then(function(data) {
    if (data.access_token) {
      tokenStore[shop] = data.access_token;
      res.redirect("https://" + shop + "/admin/apps/" + SHOPIFY_API_KEY);
    } else {
      res.status(400).send("Token error: " + JSON.stringify(data));
    }
  })
  .catch(function(e) { res.status(500).send("OAuth error: " + e.message); });
});

app.get("/", function(req, res) {
  var shop = req.query.shop || SHOPIFY_STORE;
  if (!tokenStore[shop]) return res.redirect("/auth?shop=" + shop);
  res.send(getHTML(shop));
});

app.get("/api/shopify/:resource", function(req, res) {
  var shop = req.query.shop || SHOPIFY_STORE;
  var token = tokenStore[shop];
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  var qs = "";
  Object.keys(req.query).forEach(function(k) {
    if (k !== "shop") qs += (qs ? "&" : "") + k + "=" + req.query[k];
  });
  fetch("https://" + shop + "/admin/api/2026-01/" + req.params.resource + ".json?" + qs, {
    headers: { "X-Shopify-Access-Token": token }
  })
  .then(function(r) { return r.json(); })
  .then(function(d) { res.json(d); })
  .catch(function(e) { res.status(500).json({ error: e.message }); });
});

app.post("/api/claude/analyze", function(req, res) {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(400).json({ error: "No ANTHROPIC_API_KEY" });
  fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: process.env.CLAUDE_MODEL || "claude-opus-4-6",
      max_tokens: 1000,
      system: req.body.system || "AI agent for Zoo-PetShop",
      messages: [{ role: "user", content: req.body.prompt }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    var t = (d.content || []).map(function(c) { return c.text || ""; }).join("\n");
    res.json({ text: t });
  })
  .catch(function(e) { res.status(500).json({ error: e.message }); });
});

app.post("/api/log", function(req, res) {
  console.log("[LOG]", req.body);
  res.json({ ok: true });
});
function getHTML(shop) {
  var css = "*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f6f6f7;color:#1a1a1a}.app{max-width:1100px;margin:0 auto;padding:20px}h1{font-size:20px;font-weight:600;margin-bottom:8px}.cards{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}@media(max-width:800px){.cards{grid-template-columns:1fr}}.card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;padding:20px}.card h2{font-size:16px;margin-bottom:12px}.badge{display:inline-block;font-size:11px;padding:2px 10px;border-radius:12px}.gs{background:#dcfce7;color:#166534}.gi{background:#dbeafe;color:#1e40af}.gw{background:#fef3c7;color:#92400e}.gd{background:#fee2e2;color:#991b1b}.ms{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px}.m{background:#f9fafb;border-radius:8px;padding:10px}.ml{font-size:11px;color:#6b7280}.mv{font-size:18px;font-weight:600}table{width:100%;border-collapse:collapse;font-size:13px;margin-top:8px}th{text-align:left;padding:6px;font-size:11px;color:#9ca3af;font-weight:400;border-bottom:1px solid #e5e7eb}td{padding:6px;border-bottom:1px solid #f3f4f6}.btn{font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid #d1d5db;background:#1a1a1a;color:#fff;cursor:pointer;margin-bottom:12px}#log div{padding:4px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#4b5563}";
  var html = "<!DOCTYPE html><html><head><meta charset=UTF-8><title>Zoo-PetShop Agent</title>";
  html += "<scr" + "ipt src=https://cdn.shopify.com/shopifycloud/app-bridge/3.7.10/app-bridge.js><\/scr" + "ipt>";
  html += "<style>" + css + "</style></head><body><div class=app>";
  html += "<h1>Zoo-PetShop Agent System</h1>";
  html += "<p style=color:#6b7280;font-size:13px;margin-bottom:16px>n8n + Shopify + Claude Opus 4.6 | Store: " + shop + "</p>";
  html += "<div class=cards>";
  html += "<div class=card><h2>Agent 1: Automator <span class=\"badge gs\">Online</span></h2>";
  html += "<div class=ms><div class=m><div class=ml>Orders</div><div class=mv id=oc>...</div></div><div class=m><div class=ml>Products</div><div class=mv id=pc>...</div></div></div>";
  html += "<button class=btn onclick=refresh()>Refresh Data</button>";
  html += "<div id=orders></div><div id=log></div></div>";
  html += "<div class=card><h2>Agent 2: Trainer <span class=\"badge gi\">Learning</span></h2>";
  html += "<div class=ms><div class=m><div class=ml>Rules</div><div class=mv>3</div></div><div class=m><div class=ml>Model</div><div class=mv>Opus 4.6</div></div></div>";
  html += "<button class=btn onclick=analyze()>Run Analysis</button>";
  html += "<div id=analysis style=color:#6b7280;font-size:13px>Click to analyze with Claude Opus 4.6</div>";
  html += "<div style=margin-top:16px;font-size:12px;padding:12px;background:#dbeafe;color:#1e40af;border-radius:8px>Client ID: " + SHOPIFY_API_KEY + "</div>";
  html += "</div></div></div>";
  html += "<scr" + "ipt>";
  html += "var S=\"" + shop + "\";";
  html += "function api(e){return fetch(\"/api/shopify/\"+e+\"?shop=\"+S).then(function(r){return r.json()}).catch(function(x){return{error:x.message}})}";
  html += "function addLog(m){var d=document.createElement(\"div\");d.textContent=new Date().toLocaleTimeString()+\" \"+m;var el=document.getElementById(\"log\");if(el)el.prepend(d)}";
  html += "function refresh(){addLog(\"Refreshing...\");";
  html += "api(\"orders?status=any&limit=10\").then(function(d){if(d.orders){document.getElementById(\"oc\").textContent=d.orders.length;var t=\"<table><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th></tr>\";d.orders.forEach(function(o){var n=o.customer?(o.customer.first_name+\" \"+o.customer.last_name):\"N/A\";t+=\"<tr><td>#\"+o.order_number+\"</td><td>\"+n+\"</td><td>\"+o.total_price+\" \"+o.currency+\"</td><td>\"+o.financial_status+\"</td></tr>\"});t+=\"</table>\";document.getElementById(\"orders\").innerHTML=t;addLog(d.orders.length+\" orders loaded\")}else addLog(\"Error: \"+(d.error||\"unknown\"))});";
  html += "api(\"products?limit=10\").then(function(d){if(d.products){document.getElementById(\"pc\").textContent=d.products.length;addLog(d.products.length+\" products loaded\")}else addLog(\"Error: \"+(d.error||\"unknown\"))})}";
  html += "function analyze(){document.getElementById(\"analysis\").innerHTML=\"Analyzing with Opus 4.6...\";fetch(\"/api/claude/analyze\",{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify({prompt:\"Analyze Zoo-PetShop store data\"})}).then(function(r){return r.json()}).then(function(d){document.getElementById(\"analysis\").innerHTML=\"<pre style=white-space:pre-wrap;font-size:13px>\"+( d.text||d.error)+\"</pre>\"}).catch(function(e){document.getElementById(\"analysis\").innerHTML=e.message})}";
  html += "var AB=window[\"app-bridge\"];if(AB)AB.createApp({apiKey:\"" + SHOPIFY_API_KEY + "\",host:new URLSearchParams(location.search).get(\"host\")});";
  html += "refresh();";
  html += "<\/scr" + "ipt></body></html>";
  return html;
}

app.listen(PORT, function() {
  console.log("Zoo-PetShop Agent v2.0 running on port " + PORT);
  console.log("Store: " + SHOPIFY_STORE);
  console.log("Model: " + (process.env.CLAUDE_MODEL || "claude-opus-4-6"));
});
