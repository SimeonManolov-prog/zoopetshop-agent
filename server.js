
function getHTML(shop) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Zoo-PetShop Agent</title>
<script src="https://cdn.shopify.com/shopifycloud/app-bridge/3.7.10/app-bridge.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f6f6f7;color:#1a1a1a}
.app{max-width:1200px;margin:0 auto;padding:20px}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
.header h1{font-size:20px;font-weight:600}
.agents{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:900px){.agents{grid-template-columns:1fr}}
.card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}
.card-h{padding:16px 20px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px}
.av{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px}
.a1{background:#dbeafe;color:#1d4ed8}.a2{background:#fef3c7;color:#92400e}
.badge{font-size:11px;padding:2px 10px;border-radius:12px;font-weight:500}
.bg-s{background:#dcfce7;color:#166534}.bg-i{background:#dbeafe;color:#1e40af}.bg-w{background:#fef3c7;color:#92400e}.bg-d{background:#fee2e2;color:#991b1b}
.tabs{display:flex;gap:4px;padding:8px 16px;border-bottom:1px solid #e5e7eb;flex-wrap:wrap}
.tab{font-size:12px;padding:5px 12px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:#6b7280}
.tab.active{background:#1a1a1a;color:#fff}
.cnt{padding:20px;min-height:280px}
.metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:16px}
.m{background:#f9fafb;border-radius:8px;padding:12px 16px}
.m-l{font-size:11px;color:#6b7280;margin-bottom:4px}.m-v{font-size:20px;font-weight:600}
.log{display:flex;gap:8px;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px}
.log-t{color:#9ca3af;font-family:monospace;font-size:11px;min-width:44px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 6px;font-size:11px;color:#9ca3af;font-weight:400;border-bottom:1px solid #e5e7eb}
td{padding:8px 6px;border-bottom:1px solid #f3f4f6}
.btn{font-size:12px;padding:6px 14px;border-radius:6px;border:1px solid #d1d5db;background:#fff;cursor:pointer}
.btn:hover{background:#f9fafb}.btn-p{background:#1a1a1a;color:#fff;border-color:#1a1a1a}
</style></head><body><div class="app">
<div class="header"><div><h1>Zoo-PetShop Agent</h1><div style="font-size:12px;color:#6b7280">n8n + Shopify + Claude Opus 4.6</div></div><div style="display:flex;gap:8px;align-items:center"><div style="width:8px;height:8px;border-radius:50%;background:#22c55e"></div><span style="font-size:12px;color:#6b7280">Live</span></div></div>
<div class="agents">
<div class="card"><div class="card-h"><div class="av a1">A1</div><div><div style="font-weight:600;font-size:14px">Автоматизатор</div><div style="font-size:11px;color:#6b7280">n8n + Shopify</div></div><span class="badge bg-s" style="margin-left:auto">Online</span></div><div class="tabs" id="at"></div><div class="cnt" id="ac"></div></div>
<div class="card"><div class="card-h"><div class="av a2">A2</div><div><div style="font-weight:600;font-size:14px">Обучител</div><div style="font-size:11px;color:#6b7280">Claude Opus 4.6</div></div><span class="badge bg-i" style="margin-left:auto">Learning</span></div><div class="tabs" id="tt"></div><div class="cnt" id="tc"></div></div>
</div></div>
<script>
var AB=window['app-bridge'];var abApp=AB.createApp({apiKey:'${SHOPIFY_API_KEY}',host:new URLSearchParams(location.search).get('host')});
var S='${shop}',aT='dash',tT='over',logs=[],orders=[],products=[],customers=[];
async function api(e){try{var r=await fetch('/api/shopify/'+e+'?shop='+S);return await r.json()}catch(x){return{error:x.message}}}
async function lO(){var d=await api('orders?status=any&limit=15');if(d.orders){orders=d.orders;aL('success',orders.length+' поръчки','shopify')}else aL('error',d.error||'Err','shopify')}
async function lP(){var d=await api('products?limit=20');if(d.products){products=d.products;aL('success',products.length+' продукти','shopify')}else aL('error',d.error||'Err','shopify')}
async function lC(){var d=await api('customers?limit=15');if(d.customers){customers=d.customers;aL('success',customers.length+' клиенти','shopify')}else aL('error',d.error||'Err','shopify')}
function aL(t,m,s){var d=new Date();logs.unshift({time:d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'),type:t,msg:m,src:s});if(logs.length>50)logs.pop()}
function bg(s,t){var c={success:'bg-s',info:'bg-i',warning:'bg-w',error:'bg-d',danger:'bg-d'};return '<span class="badge '+(c[s]||'bg-i')+'">'+t+'</span>'}
function rAT(){var ts=[['dash','Dashboard'],['ord','Поръчки'],['prod','Продукти'],['cust','Клиенти'],['log','Логове']];document.getElementById('at').innerHTML=ts.map(function(t){return '<button class="tab'+(aT===t[0]?' active':'')+'" onclick="sAT(\''+t[0]+'\')">'+t[1]+'</button>'}).join('')}
function rTT(){var ts=[['over','Обзор'],['anal','Анализ'],['rules','Правила']];document.getElementById('tt').innerHTML=ts.map(function(t){return '<button class="tab'+(tT===t[0]?' active':'')+'" onclick="sTT(\''+t[0]+'\')">'+t[1]+'</button>'}).join('')}
function rAC(){var e=document.getElementById('ac');
if(aT==='dash'){e.innerHTML='<div class="metrics"><div class="m"><div class="m-l">Поръчки</div><div class="m-v">'+orders.length+'</div></div><div class="m"><div class="m-l">Продукти</div><div class="m-v">'+products.length+'</div></div><div class="m"><div class="m-l">Клиенти</div><div class="m-v">'+customers.length+'</div></div><div class="m"><div class="m-l">Модел</div><div class="m-v">Opus 4.6</div></div></div><button class="btn btn-p" onclick="rAll()">Обнови</button><div style="margin-top:12px">'+logs.slice(0,6).map(function(l){return '<div class="log"><span class="log-t">'+l.time+'</span>'+bg(l.type,l.type)+'<span style="color:#4b5563;flex:1;margin:0 8px">'+l.msg+'</span><span class="log-t">'+l.src+'</span></div>'}).join('')+'</div>'}
if(aT==='ord'){e.innerHTML='<button class="btn" onclick="lO().then(rAC)" style="margin-bottom:12px">Обнови</button><table><thead><tr><th>#</th><th>Клиент</th><th>Сума</th><th>Дата</th><th>Статус</th></tr></thead><tbody>'+orders.slice(0,15).map(function(o){var n=o.customer?(o.customer.first_name+' '+o.customer.last_name):'N/A';var s=o.financial_status==='paid'?'success':o.financial_status==='pending'?'warning':'info';return '<tr><td style="font-family:monospace;font-size:12px">#'+o.order_number+'</td><td>'+n+'</td><td style="font-weight:600">'+o.total_price+' '+o.currency+'</td><td style="color:#6b7280">'+new Date(o.created_at).toLocaleDateString('bg')+'</td><td>'+bg(s,o.financial_status||'N/A')+'</td></tr>'}).join('')+'</tbody></table>'}
if(aT==='prod'){e.innerHTML='<button class="btn" onclick="lP().then(rAC)" style="margin-bottom:12px">Обнови</button><table><thead><tr><th>Продукт</th><th>Цена</th><th>Налич.</th><th>Статус</th></tr></thead><tbody>'+products.slice(0,15).map(function(p){var v=p.variants&&p.variants[0];var st=v&&v.inventory_quantity<=0?'danger':v&&v.inventory_quantity<10?'warning':'success';return '<tr><td style="font-weight:500">'+p.title.substring(0,45)+'</td><td>'+(v?v.price:'?')+' BGN</td><td>'+bg(st,v?v.inventory_quantity:'?')+'</td><td>'+bg(p.status==='active'?'success':'warning',p.status)+'</td></tr>'}).join('')+'</tbody></table>'}
if(aT==='cust'){e.innerHTML='<button class="btn" onclick="lC().then(rAC)" style="margin-bottom:12px">Обнови</button><table><thead><tr><th>Клиент</th><th>Имейл</th><th>Поръчки</th><th>Сегмент</th></tr></thead><tbody>'+customers.slice(0,15).map(function(c){var sg=c.orders_count>=10?'VIP':c.orders_count>=3?'Active':'New';var sc=sg==='VIP'?'warning':sg==='Active'?'info':'success';return '<tr><td style="font-weight:500">'+c.first_name+' '+c.last_name+'</td><td style="color:#6b7280;font-size:12px">'+c.email+'</td><td style="text-align:center">'+c.orders_count+'</td><td>'+bg(sc,sg)+'</td></tr>'}).join('')+'</tbody></table>'}
if(aT==='log'){e.innerHTML=logs.map(function(l){return '<div class="log"><span class="log-t">'+l.time+'</span>'+bg(l.type,l.type)+'<span style="color:#4b5563;flex:1;margin:0 8px">'+l.msg+'</span><span class="log-t">'+l.src+'</span></div>'}).join('')}}
function rTC(){var e=document.getElementById('tc');
if(tT==='over'){e.innerHTML='<div class="metrics"><div class="m"><div class="m-l">Правила</div><div class="m-v">3</div></div><div class="m"><div class="m-l">A/B тестове</div><div class="m-v">3</div></div><div class="m"><div class="m-l">Подобрение</div><div class="m-v">+14%</div></div><div class="m"><div class="m-l">Модел</div><div class="m-v">Opus 4.6</div></div></div>'}
if(tT==='anal'){e.innerHTML='<button class="btn btn-p" onclick="runAn()">Стартирай анализ</button><div id="ar" style="margin-top:16px;color:#6b7280;text-align:center;padding:20px">Натисни за анализ с Claude Opus 4.6</div>'}
if(tT==='rules'){e.innerHTML=[{n:'Upsell за VIP',c:94,s:'active',i:'+12% AOV'},{n:'Оптимален час имейли',c:87,s:'testing',i:'+8% open'},{n:'Авто-restock',c:91,s:'active',i:'-45% stockouts'}].map(function(r){return '<div style="display:flex;align-items:center;gap:12px;padding:12px 16px;margin-bottom:8px;background:#f9fafb;border-radius:8px"><div style="flex:1"><div style="font-weight:500;font-size:13px">'+r.n+'</div><div style="font-size:11px;color:#9ca3af">'+r.c+'%</div></div>'+bg('success',r.i)+bg(r.s==='active'?'success':'info',r.s)+'</div>'}).join('')}}
function sAT(t){aT=t;rAT();rAC()}function sTT(t){tT=t;rTT();rTC()}
async function rAll(){aL('info','Обновяване...','system');rAC();await Promise.all([lO(),lP(),lC()]);rAC()}
async function runAn(){var el=document.getElementById('ar');el.innerHTML='<div style="color:#6b7280">Анализира с Opus 4.6...</div>';try{var r=await fetch('/api/claude/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({system:'AI обучител за Zoo-PetShop зоомагазин. Отговори на български.',prompt:'Поръчки:'+orders.length+',Продукти:'+products.length+',Клиенти:'+customers.length})});var d=await r.json();el.innerHTML='<div style="background:#f9fafb;border-radius:8px;padding:16px;font-size:13px;white-space:pre-wrap">'+(d.text||d.error||'Няма')+'</div>';aL('success','Анализ завършен','claude')}catch(x){el.innerHTML='<div style="color:#991b1b">'+x.message+'</div>'}}
async function init(){aL('info','Стартирано','system');rAT();rTT();rAC();rTC();await Promise.all([lO(),lP(),lC()]);rAC()}
init();
<\/script></body></html>`;
}

app.listen(PORT, () => {
  console.log("Zoo-PetShop Agent v2.0 on port " + PORT);
  console.log("Model: " + (process.env.CLAUDE_MODEL || "claude-opus-4-6"));
  console.log("Store: " + SHOPIFY_STORE);
});require("dotenv").config();
const express = require("express");
const crypto = require("crypto");
const cookieParser = require("cookie-parser");
const app = express();
app.use(express.json());
app.use(cookieParser());

const { SHOPIFY_API_KEY, SHOPIFY_API_SECRET, SHOPIFY_SCOPES, SHOPIFY_STORE, APP_URL, PORT = 3000 } = process.env;
const tokenStore = {};

function verifyHmac(query) {
  const { hmac, ...rest } = query;
  if (!hmac) return false;
  const msg = Object.keys(rest).sort().map(k => k + "=" + rest[k]).join("&");
  const digest = crypto.createHmac("sha256", SHOPIFY_API_SECRET).update(msg).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmac));
}

app.get("/auth", (req, res) => {
  const shop = req.query.shop || SHOPIFY_STORE;
  const nonce = crypto.randomBytes(16).toString("hex");
  res.cookie("nonce", nonce, { httpOnly: true, sameSite: "lax" });
  const url = "https://" + shop + "/admin/oauth/authorize?client_id=" + SHOPIFY_API_KEY + "&scope=" + SHOPIFY_SCOPES + "&redirect_uri=" + encodeURIComponent(APP_URL + "/auth/callback") + "&state=" + nonce;
  res.redirect(url);
});

app.get("/auth/callback", async (req, res) => {
  const { shop, code, state } = req.query;
  if (state !== req.cookies.nonce) return res.status(403).send("Invalid state");
  if (!verifyHmac(req.query)) return res.status(403).send("Invalid HMAC");
  try {
    const r = await fetch("https://" + shop + "/admin/oauth/access_token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: SHOPIFY_API_KEY, client_secret: SHOPIFY_API_SECRET, code })
    });
    const data = await r.json();
    if (data.access_token) { tokenStore[shop] = data.access_token; res.redirect("https://" + shop + "/admin/apps/" + SHOPIFY_API_KEY); }
    else res.status(400).send("Token error");
  } catch (e) { res.status(500).send("OAuth error: " + e.message); }
});

app.get("/", (req, res) => {
  const shop = req.query.shop || SHOPIFY_STORE;
  if (!tokenStore[shop]) return res.redirect("/auth?shop=" + shop);
  res.send(getHTML(shop));
});

app.get("/api/shopify/:resource", async (req, res) => {
  const shop = req.query.shop || SHOPIFY_STORE;
  const token = tokenStore[shop];
  if (!token) return res.status(401).json({ error: "Not auth" });
  try {
    const params = new URLSearchParams(req.query); params.delete("shop");
    const r = await fetch("https://" + shop + "/admin/api/2026-01/" + req.params.resource + ".json?" + params, { headers: { "X-Shopify-Access-Token": token } });
    res.json(await r.json());
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/claude/analyze", async (req, res) => {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(400).json({ error: "No API key" });
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: process.env.CLAUDE_MODEL || "claude-opus-4-6", max_tokens: 1000, system: req.body.system || "AI agent for Zoo-PetShop", messages: [{ role: "user", content: req.body.prompt }] })
    });
    const d = await r.json();
    res.json({ text: d.content?.map(c => c.text || "").join("\n") || "" });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/log", (req, res) => { console.log("[LOG]", req.body); res.json({ ok: true }); });

function getHTML(shop) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Zoo-PetShop Agent</title><script src="https://cdn.shopify.com/shopifycloud/app-bridge/3.7.10/app-bridge.js"><\/script><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,sans-serif;background:#f6f6f7;color:#1a1a1a}.app{max-width:1100px;margin:0 auto;padding:20px}h1{font-size:20px;font-weight:600;margin-bottom:4px}.sub{font-size:12px;color:#6b7280;margin-bottom:20px}.agents{display:grid;grid-template-columns:1fr 1fr;gap:16px}@media(max-width:800px){.agents{grid-template-columns:1fr}}.card{background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden}.ch{padding:14px 18px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px}.av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:12px}.av1{background:#dbeafe;color:#1d4ed8}.av2{background:#fef3c7;color:#92400e}.bd{font-size:11px;padding:2px 8px;border-radius:10px}.bs{background:#dcfce7;color:#166534}.bi{background:#dbeafe;color:#1e40af}.bw{background:#fef3c7;color:#92400e}.be{background:#fee2e2;color:#991b1b}.tabs{display:flex;gap:4px;padding:8px 14px;border-bottom:1px solid #e5e7eb}.tab{font-size:12px;padding:4px 10px;border-radius:6px;border:none;cursor:pointer;background:transparent;color:#6b7280}.tab.a{background:#1a1a1a;color:#fff}.ct{padding:16px;min-height:200px}.m{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px}.mc{background:#f9fafb;border-radius:8px;padding:10px 14px}.ml{font-size:11px;color:#6b7280}.mv{font-size:20px;font-weight:600}.log{display:flex;gap:6px;padding:6px 0;border-bottom:1px solid #f3f4f6;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}th{text-align:left;padding:6px;font-size:11px;color:#9ca3af;border-bottom:1px solid #e5e7eb}td{padding:6px;border-bottom:1px solid #f3f4f6}.btn{font-size:12px;padding:5px 12px;border-radius:6px;border:1px solid #d1d5db;background:#1a1a1a;color:#fff;cursor:pointer}</style></head><body><div class="app"><h1>Zoo-PetShop Agent</h1><div class="sub">n8n + Shopify + Claude Opus 4.6 | ' + shop + '</div><div class="agents"><div class="card"><div class="ch"><div class="av av1">A1</div><div><b>Автоматизатор</b><div style="font-size:11px;color:#6b7280">n8n + Shopify</div></div><span class="bd bs" style="margin-left:auto">Online</span></div><div class="tabs" id="at"></div><div class="ct" id="ac"></div></div><div class="card"><div class="ch"><div class="av av2">A2</div><div><b>Обучител</b><div style="font-size:11px;color:#6b7280">Claude Opus 4.6</div></div><span class="bd bi" style="margin-left:auto">Learning</span></div><div class="tabs" id="tt"></div><div class="ct" id="tc"></div></div></div></div><script>var S="' + shop + '",at="dash",tt="over",L=[],O=[],P=[],C=[];function bd(c,t){return "<span class=bd "+c+">"+t+"</span>"}async function api(e){var r=await fetch("/api/shopify/"+e+"?shop="+S);return r.json()}async function lo(){var d=await api("orders?status=any&limit=12");if(d.orders){O=d.orders;al("s","Orders:"+O.length,"shopify")}}async function lp(){var d=await api("products?limit=15");if(d.products){P=d.products;al("s","Products:"+P.length,"shopify")}}async function lc(){var d=await api("customers?limit=12");if(d.customers){C=d.customers;al("s","Customers:"+C.length,"shopify")}}function al(t,m,s){L.unshift({y:t,m:m,s:s});if(L.length>30)L.pop()}function sat(id){at=id;ra()}function stt(id){tt=id;rt()}function ra(){var ts=[["dash","Dashboard"],["orders","Поръчки"],["products","Продукти"],["customers","Клиенти"]];document.getElementById("at").innerHTML=ts.map(function(t){return "<button class=\"tab"+(at===t[0]?" a":"")+"\" onclick=\"sat(\\\""+t[0]+"\\\")\">"+t[1]+"</button>"}).join("");var el=document.getElementById("ac");if(at==="dash")el.innerHTML="<div class=m><div class=mc><div class=ml>Поръчки</div><div class=mv>"+O.length+"</div></div><div class=mc><div class=ml>Продукти</div><div class=mv>"+P.length+"</div></div><div class=mc><div class=ml>Клиенти</div><div class=mv>"+C.length+"</div></div><div class=mc><div class=ml>Модел</div><div class=mv>Opus4.6</div></div></div><button class=btn onclick=init()>Обнови</button>";if(at==="orders")el.innerHTML="<table><tr><th>#</th><th>Клиент</th><th>Сума</th><th>Статус</th></tr>"+O.map(function(o){var n=o.customer?(o.customer.first_name+" "+o.customer.last_name):"N/A";return "<tr><td>#"+o.order_number+"</td><td>"+n+"</td><td><b>"+o.total_price+" "+o.currency+"</b></td><td>"+bd(o.financial_status==="paid"?"bs":"bw",o.financial_status)+"</td></tr>"}).join("")+"</table>";if(at==="products")el.innerHTML="<table><tr><th>Продукт</th><th>Цена</th><th>Налич.</th></tr>"+P.map(function(p){var v=p.variants&&p.variants[0];var s=v?v.inventory_quantity:0;return "<tr><td>"+p.title.substring(0,40)+"</td><td>"+(v?v.price:"?")+"</td><td>"+bd(s<=0?"be":s<10?"bw":"bs",s<=0?"Изчерпан":s)+"</td></tr>"}).join("")+"</table>";if(at==="customers")el.innerHTML="<table><tr><th>Клиент</th><th>Поръчки</th><th>Сегмент</th></tr>"+C.map(function(c){var seg=c.orders_count>=10?"VIP":c.orders_count>=3?"Active":"New";return "<tr><td>"+c.first_name+" "+c.last_name+"</td><td>"+c.orders_count+"</td><td>"+bd(seg==="VIP"?"bw":"bs",seg)+"</td></tr>"}).join("")+"</table>"}function rt(){var ts=[["over","Обзор"],["analysis","Анализ"]];document.getElementById("tt").innerHTML=ts.map(function(t){return "<button class=\"tab"+(tt===t[0]?" a":"")+"\" onclick=\"stt(\\\""+t[0]+"\\\")\">"+t[1]+"</button>"}).join("");var el=document.getElementById("tc");if(tt==="over")el.innerHTML="<div class=m><div class=mc><div class=ml>Правила</div><div class=mv>3</div></div><div class=mc><div class=ml>Подобрение</div><div class=mv>+14%</div></div></div>";if(tt==="analysis")el.innerHTML="<button class=btn onclick=analyze()>Анализирай</button><div id=ar style=\"margin-top:12px;color:#6b7280\">Натисни за анализ</div>"}async function analyze(){document.getElementById("ar").innerHTML="Анализира...";try{var r=await fetch("/api/claude/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:"Products:"+P.length+" Orders:"+O.length})});var d=await r.json();document.getElementById("ar").innerHTML="<div style=\"background:#f9fafb;border-radius:8px;padding:12px;font-size:13px\">"+(d.text||d.error)+"</div>"}catch(e){document.getElementById("ar").innerHTML=e.message}}async function init(){ra();rt();await Promise.all([lo(),lp(),lc()]);ra()}init();<\/script></body></html>';
}

app.listen(PORT, () => console.log("Zoo-PetShop Agent v2.0 on port " + PORT));
