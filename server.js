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
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code: code })
  }).then(function(r) { return r.json(); }).then(function(data) {
    if (data.access_token) { tokenStore[shop] = data.access_token; res.redirect("https://" + shop + "/admin/apps/" + SHOPIFY_API_KEY); }
    else res.status(400).send("Token error");
  }).catch(function(e) { res.status(500).send("OAuth error: " + e.message); });
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
  var qs = Object.keys(req.query).filter(function(k){return k!=="shop"}).map(function(k){return k+"="+req.query[k]}).join("&");
  fetch("https://" + shop + "/admin/api/2026-01/" + req.params.resource + ".json?" + qs, {
    headers: { "X-Shopify-Access-Token": token }
  }).then(function(r){return r.json()}).then(function(d){res.json(d)}).catch(function(e){res.status(500).json({error:e.message})});
});

app.post("/api/claude/analyze", function(req, res) {
  var key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(400).json({ error: "No ANTHROPIC_API_KEY" });
  fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-opus-4-6", max_tokens: 1000, system: req.body.system || "AI agent", messages: [{ role: "user", content: req.body.prompt }] })
  }).then(function(r){return r.json()}).then(function(d){
    var t = (d.content||[]).map(function(c){return c.text||""}).join("\n");
    res.json({text:t});
  }).catch(function(e){res.status(500).json({error:e.message})});
});

app.post("/api/log", function(req, res) { console.log("[LOG]", req.body); res.json({ ok: true }); });

function getHTML(shop) {
  var h = "<!DOCTYPE html><html><head><meta charset=UTF-8><title>Zoo-PetShop Agent</title>";
  h += "<scr"+"ipt src=https://cdn.shopify.com/shopifycloud/app-bridge/3.7.10/app-bridge.js></scr"+"ipt>";
  h += "<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f6f6f7;color:#1a1a1a}.app{max-width:1100px;margin:0 auto;padding:20px}.hd{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}.hd h1{font-size:20px;font-weight:600}.agents{display:grid;grid-template-columns:1fr 1fr;gap:20px}@media(max-width:900px){.agents{grid-template-columns:1fr}}.c{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}.ch{padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px}.av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px}.a1{background:#dbeafe;color:#1d4ed8}.a2{background:#fef3c7;color:#92400e}.bg{font-size:11px;padding:2px 10px;border-radius:12px;font-weight:500}.gs{background:#dcfce7;color:#166534}.gi{background:#dbeafe;color:#1e40af}.gw{background:#fef3c7;color:#92400e}.gd{background:#fee2e2;color:#991b1b}.tabs{display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid #e5e7eb}.tab{font-size:12px;padding:5px 12px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:#6b7280}.tab.on{background:#1a1a1a;color:#fff}.cnt{padding:20px;min-height:250px}.ms{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.m{background:#f9fafb;border-radius:8px;padding:12px 16px}.ml{font-size:11px;color:#6b7280;margin-bottom:4px}.mv{font-size:20px;font-weight:600}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:8px 6px;font-size:11px;color:#9ca3af;font-weight:400;border-bottom:1px solid #e5e7eb}td{padding:8px 6px;border-bottom:1px solid #f3f4f6}.log{display:flex;gap:8px;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:13px}.lt{color:#9ca3af;font-family:monospace;font-size:11px;min-width:44px}.lm{color:#4b5563;flex:1}.btn{font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;cursor:pointer}.btn:hover{background:#f9fafb}.bp{background:#1a1a1a;color:#fff;border-color:#1a1a1a}</style></head><body><div class=app>";
  h += "<div class=hd><div><h1>Zoo-PetShop Agent</h1><div style=font-size:12px;color:#6b7280>n8n + Shopify + Claude Opus 4.6</div></div><div style=display:flex;gap:8px;align-items:center><div style=width:8px;height:8px;border-radius:50%;background:#22c55e></div><span style=font-size:12px;color:#6b7280>Connected</span></div></div>";
  h += "<div class=agents><div class=c><div class=ch><div class='av a1'>A1</div><div><b>Automator</b><br><span style=font-size:11px;color:#6b7280>n8n + Shopify</span></div><span class='bg gs' style=margin-left:auto>Online</span></div><div class=tabs id=at></div><div class=cnt id=ac></div></div>";
  h += "<div class=c><div class=ch><div class='av a2'>A2</div><div><b>Trainer</b><br><span style=font-size:11px;color:#6b7280>Claude Opus 4.6</span></div><span class='bg gi' style=margin-left:auto>Learning</span></div><div class=tabs id=tt></div><div class=cnt id=tc></div></div></div></div>";
  h += "<scr"+"ipt>";
  h += "var AB=window['app-bridge'],ap=AB.createApp({apiKey:'" + SHOPIFY_API_KEY + "',host:new URLSearchParams(location.search).get('host')});";
  h += "var S='" + shop + "',aT='dash',tT='over',logs=[],O=[],P=[],Cu=[];";
  h += "function bg(s,t){var c=s==='error'?'gd':s==='warning'?'gw':s==='success'?'gs':'gi';return '<span class="bg '+c+'">'+t+'</span>'}";
  h += "function addL(t,m,s){var d=new Date();logs.unshift({t:d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'),y:t,m:m,s:s});if(logs.length>30)logs.pop()}";
  h += "function api(e){return fetch('/api/shopify/'+e+'?shop='+S).then(function(r){return r.json()}).catch(function(x){return{error:x.message}})}";
  h += "function loadO(){return api('orders?status=any&limit=15').then(function(d){if(d.orders){O=d.orders;addL('success',O.length+' orders','shopify')}else addL('error',d.error||'err','shopify')})}";
  h += "function loadP(){return api('products?limit=20').then(function(d){if(d.products){P=d.products;addL('success',P.length+' products','shopify')}else addL('error',d.error||'err','shopify')})}";
  h += "function loadC(){return api('customers?limit=15').then(function(d){if(d.customers){Cu=d.customers;addL('success',Cu.length+' customers','shopify')}else addL('error',d.error||'err','shopify')})}";
  h += "function rAT(){var ts=[['dash','Dashboard'],['orders','Orders'],['products','Products'],['custs','Customers'],['logs','Logs']];document.getElementById('at').innerHTML=ts.map(function(t){return '<button class="tab'+(aT===t[0]?' on':'')+'" onclick="sAT(\''+t[0]+'\')">' +t[1]+'</button>'}).join('')}";
  h += "function rTT(){var ts=[['over','Overview'],['anl','Analysis'],['cfg','Config']];document.getElementById('tt').innerHTML=ts.map(function(t){return '<button class="tab'+(tT===t[0]?' on':'')+'" onclick="sTT(\''+t[0]+'\')">' +t[1]+'</button>'}).join('')}";
  h += "function rAC(){var e=document.getElementById('ac');";
  h += "if(aT==='dash')e.innerHTML='<div class=ms><div class=m><div class=ml>Orders</div><div class=mv>'+O.length+'</div></div><div class=m><div class=ml>Products</div><div class=mv>'+P.length+'</div></div><div class=m><div class=ml>Customers</div><div class=mv>'+Cu.length+'</div></div><div class=m><div class=ml>Model</div><div class=mv>Opus 4.6</div></div></div><button class="btn bp" onclick=refresh()>Refresh</button><div style=margin-top:12px>'+logs.slice(0,6).map(function(l){return '<div class=log><span class=lt>'+l.t+'</span>'+bg(l.y,l.y)+'<span class=lm>'+l.m+'</span></div>'}).join('')+'</div>';";
  h += "if(aT==='orders')e.innerHTML='<table><tr><th>#</th><th>Customer</th><th>Total</th><th>Status</th></tr>'+O.slice(0,10).map(function(o){var n=o.customer?(o.customer.first_name+' '+o.customer.last_name):'N/A';return '<tr><td>#'+o.order_number+'</td><td>'+n+'</td><td><b>'+o.total_price+' '+o.currency+'</b></td><td>'+bg(o.financial_status==='paid'?'success':'warning',o.financial_status||'?')+'</td></tr>'}).join('')+'</table>';";
  h += "if(aT==='products')e.innerHTML='<table><tr><th>Product</th><th>Price</th><th>Stock</th></tr>'+P.slice(0,10).map(function(p){var v=p.variants&&p.variants[0],s=v?v.inventory_quantity:0;return '<tr><td>'+p.title.substring(0,40)+'</td><td>'+(v?v.price:'?')+'</td><td>'+bg(s<=0?'error':s<10?'warning':'success',s<=0?'Out':String(s))+'</td></tr>'}).join('')+'</table>';";
  h += "if(aT==='custs')e.innerHTML='<table><tr><th>Name</th><th>Email</th><th>Orders</th></tr>'+Cu.slice(0,10).map(function(c){return '<tr><td>'+c.first_name+' '+c.last_name+'</td><td>'+c.email+'</td><td>'+c.orders_count+'</td></tr>'}).join('')+'</table>';";
  h += "if(aT==='logs')e.innerHTML=logs.map(function(l){return '<div class=log><span class=lt>'+l.t+'</span>'+bg(l.y,l.y)+'<span class=lm>'+l.m+'</span></div>'}).join('')}";
  h += "function rTC(){var e=document.getElementById('tc');if(tT==='over')e.innerHTML='<div class=ms><div class=m><div class=ml>Rules</div><div class=mv>3</div></div><div class=m><div class=ml>A/B Tests</div><div class=mv>3</div></div><div class=m><div class=ml>Improvement</div><div class=mv>+14%</div></div><div class=m><div class=ml>Model</div><div class=mv>Opus 4.6</div></div></div>';if(tT==='anl')e.innerHTML='<button class="btn bp" onclick=analyze()>Analyze (Opus 4.6)</button><div id=ar style=margin-top:16px;color:#9ca3af>Click to run</div>';if(tT==='cfg')e.innerHTML='<div style=font-size:12px;padding:12px;background:#dbeafe;color:#1e40af;border-radius:8px>Client ID: " + SHOPIFY_API_KEY + "<br>Store: " + shop + "<br>Model: Claude Opus 4.6</div>'}";
  h += "function sAT(i){aT=i;rAT();rAC()}function sTT(i){tT=i;rTT();rTC()}";
  h += "function refresh(){addL('info','Refreshing...','system');rAC();Promise.all([loadO(),loadP(),loadC()]).then(function(){rAC()})}";
  h += "function analyze(){var el=document.getElementById('ar');el.innerHTML='Analyzing...';fetch('/api/claude/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt:'Orders: '+O.length+', Products: '+P.length+', Customers: '+Cu.length})}).then(function(r){return r.json()}).then(function(d){el.innerHTML='<div style=background:#f9fafb;border-radius:8px;padding:16px;font-size:13px;white-space:pre-wrap>'+(d.text||d.error)+'</div>';addL('success','Analysis done','claude')}).catch(function(x){el.innerHTML=x.message})}";
  h += "addL('info','App started','system');rAT();rTT();rAC();rTC();Promise.all([loadO(),loadP(),loadC()]).then(function(){rAC()});";
  h += "</scr"+"ipt></body></html>";
  return h;
}

app.listen(PORT, function() {
  console.log("Zoo-PetShop Agent v2.0 on port " + PORT);
});
