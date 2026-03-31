/**
 * Zoo-PetShop Agent — Shopify Embedded App
 * Render deployment: srv-d75r5endiees73fdmt30
 * 
 * v3.1.0 FIXES:
 * 1. OAuth Token Persistence — SQLite file-based storage (survives Render restarts)
 * 2. "Error: unknown" — Proper error classes + structured error handling
 * 3. ANTHROPIC_API_KEY — Claude integration for product analysis & automation
 */

import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
  SHOPIFY_API_KEY: process.env.SHOPIFY_API_KEY || '296d1b73fac93dd5769744b385ea8409',
  SHOPIFY_API_SECRET: process.env.SHOPIFY_API_SECRET,
  SHOPIFY_SCOPES: process.env.SHOPIFY_SCOPES || 'read_products,write_products,read_orders,write_orders,read_inventory,write_inventory,read_customers',
  APP_URL: process.env.APP_URL || 'https://zoopetshop-agent.onrender.com',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  PORT: process.env.PORT || 3000,
  DB_PATH: process.env.DB_PATH || path.join(__dirname, 'data', 'tokens.db'),
};

// Validate critical env vars at startup
const REQUIRED_ENV = ['SHOPIFY_API_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[WARN] Missing env vars: ${missing.join(', ')}`);
  console.error('Set them in Render Dashboard > Environment');
}

// ============================================================
// ERROR HANDLING — Fix for "Error: unknown"
// ============================================================

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class ShopifyAPIError extends AppError {
  constructor(message, statusCode = 502, shopifyErrors = null) {
    super(message, statusCode, 'SHOPIFY_API_ERROR', shopifyErrors);
    this.name = 'ShopifyAPIError';
  }
}

class OAuthError extends AppError {
  constructor(message, details = null) {
    super(message, 403, 'OAUTH_ERROR', details);
    this.name = 'OAuthError';
  }
}

class AnthropicError extends AppError {
  constructor(message, details = null) {
    super(message, 502, 'ANTHROPIC_API_ERROR', details);
    this.name = 'AnthropicError';
  }
}

/** Wraps async handlers — prevents unhandled rejections that cause "Error: unknown" */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ============================================================
// TOKEN PERSISTENCE — SQLite file-based (survives Render restarts)
// ============================================================

const dataDir = path.dirname(CONFIG.DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db;
try {
  db = new Database(CONFIG.DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      shop TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      scope TEXT,
      installed_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS nonces (
      nonce TEXT PRIMARY KEY,
      shop TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS webhook_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic TEXT NOT NULL,
      shop TEXT NOT NULL,
      payload TEXT,
      received_at TEXT DEFAULT (datetime('now'))
    );
  `);
  console.log('[DB] SQLite initialized at', CONFIG.DB_PATH);
} catch (err) {
  console.error('[DB] SQLite file failed, using in-memory:', err.message);
  db = new Database(':memory:');
  db.exec(`
    CREATE TABLE shops (shop TEXT PRIMARY KEY, access_token TEXT NOT NULL, scope TEXT, installed_at TEXT, updated_at TEXT);
    CREATE TABLE nonces (nonce TEXT PRIMARY KEY, shop TEXT NOT NULL, created_at TEXT);
    CREATE TABLE webhook_log (id INTEGER PRIMARY KEY AUTOINCREMENT, topic TEXT, shop TEXT, payload TEXT, received_at TEXT);
  `);
}

const stmts = {
  getShop: db.prepare('SELECT * FROM shops WHERE shop = ?'),
  upsertShop: db.prepare(`
    INSERT INTO shops (shop, access_token, scope, installed_at, updated_at) 
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
    ON CONFLICT(shop) DO UPDATE SET 
      access_token = excluded.access_token, 
      scope = excluded.scope,
      updated_at = datetime('now')
  `),
  deleteShop: db.prepare('DELETE FROM shops WHERE shop = ?'),
  saveNonce: db.prepare("INSERT INTO nonces (nonce, shop) VALUES (?, ?)"),
  getNonce: db.prepare('SELECT * FROM nonces WHERE nonce = ?'),
  deleteNonce: db.prepare('DELETE FROM nonces WHERE nonce = ?'),
  cleanOldNonces: db.prepare("DELETE FROM nonces WHERE created_at < datetime('now', '-1 hour')"),
  logWebhook: db.prepare("INSERT INTO webhook_log (topic, shop, payload) VALUES (?, ?, ?)"),
  listShops: db.prepare('SELECT shop, scope, installed_at, updated_at FROM shops'),
};

setInterval(() => { try { stmts.cleanOldNonces.run(); } catch {} }, 30 * 60 * 1000);

// ============================================================
// SHOPIFY API HELPER
// ============================================================

async function shopifyFetch(shop, endpoint, options = {}) {
  const row = stmts.getShop.get(shop);
  if (!row) {
    throw new AppError(`No access token for ${shop}. Install at /auth?shop=${shop}`, 401, 'NO_TOKEN');
  }

  const url = `https://${shop}/admin/api/2024-10/${endpoint}`;
  const method = options.method || 'GET';

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'X-Shopify-Access-Token': row.access_token,
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    // Rate limit warning
    const rl = response.headers.get('x-shopify-shop-api-call-limit');
    if (rl) {
      const [used, max] = rl.split('/').map(Number);
      if (used / max > 0.8) console.warn(`[RATE] Shopify: ${used}/${max} for ${shop}`);
    }

    if (!response.ok) {
      let body;
      try { body = await response.json(); } catch { body = await response.text(); }
      throw new ShopifyAPIError(
        `Shopify ${method} ${endpoint}: ${response.status} ${response.statusText}`,
        response.status, body
      );
    }

    if (response.status === 204) return null;
    return await response.json();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new ShopifyAPIError(`Shopify unreachable: ${err.message}`, 503, { original: err.message });
  }
}

// ============================================================
// HMAC VERIFICATION
// ============================================================

function verifyHMAC(query) {
  if (!CONFIG.SHOPIFY_API_SECRET) throw new OAuthError('SHOPIFY_API_SECRET not configured');
  const { hmac, ...rest } = query;
  if (!hmac) throw new OAuthError('Missing HMAC parameter');
  const sorted = Object.keys(rest).sort().map(k => `${k}=${rest[k]}`).join('&');
  const computed = crypto.createHmac('sha256', CONFIG.SHOPIFY_API_SECRET).update(sorted).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(computed, 'hex'))) {
    throw new OAuthError('HMAC verification failed');
  }
  return true;
}

function verifyWebhookHMAC(body, hmacHeader) {
  if (!CONFIG.SHOPIFY_API_SECRET) throw new OAuthError('SHOPIFY_API_SECRET not configured');
  const computed = crypto.createHmac('sha256', CONFIG.SHOPIFY_API_SECRET).update(body, 'utf8').digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hmacHeader), Buffer.from(computed));
}

// ============================================================
// CLAUDE API INTEGRATION
// ============================================================

async function callClaude(prompt, options = {}) {
  if (!CONFIG.ANTHROPIC_API_KEY) {
    throw new AnthropicError('ANTHROPIC_API_KEY not set. Add it in Render Dashboard > Environment.');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model || 'claude-sonnet-4-20250514',
        max_tokens: options.maxTokens || 1024,
        system: options.system || 'You are Zoo-PetShop AI assistant. Analyze pet supply products, optimize listings, provide actionable e-commerce insights. Be concise and data-driven.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      let body;
      try { body = await response.json(); } catch { body = await response.text(); }
      throw new AnthropicError(`Claude API ${response.status}: ${response.statusText}`, { status: response.status, body });
    }

    const data = await response.json();
    const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    return { text, usage: data.usage, model: data.model };
  } catch (err) {
    if (err instanceof AnthropicError) throw err;
    throw new AnthropicError(`Claude API unreachable: ${err.message}`);
  }
}

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/health', (req, res) => {
  const shopCount = db.prepare('SELECT COUNT(*) as count FROM shops').get().count;
  res.json({
    status: 'ok',
    service: 'Zoo-PetShop Agent',
    version: '3.1.0',
    timestamp: new Date().toISOString(),
    config: {
      shopify_key: CONFIG.SHOPIFY_API_KEY ? 'set' : 'MISSING',
      shopify_secret: CONFIG.SHOPIFY_API_SECRET ? 'set' : 'MISSING',
      anthropic_key: CONFIG.ANTHROPIC_API_KEY ? 'set' : 'MISSING',
      app_url: CONFIG.APP_URL,
    },
    persistence: {
      type: db.name === ':memory:' ? 'in-memory' : 'sqlite-file',
      shops_installed: shopCount,
    },
  });
});

// OAuth install
app.get('/auth', asyncHandler(async (req, res) => {
  const { shop } = req.query;
  if (!shop || !/^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(shop)) {
    throw new AppError('Invalid shop parameter. Use: /auth?shop=store.myshopify.com', 400, 'INVALID_SHOP');
  }
  if (!CONFIG.SHOPIFY_API_SECRET) {
    throw new AppError('SHOPIFY_API_SECRET not configured', 500, 'CONFIG_ERROR');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  stmts.saveNonce.run(nonce, shop);

  const url = `https://${shop}/admin/oauth/authorize?` + new URLSearchParams({
    client_id: CONFIG.SHOPIFY_API_KEY,
    scope: CONFIG.SHOPIFY_SCOPES,
    redirect_uri: `${CONFIG.APP_URL}/auth/callback`,
    state: nonce,
  }).toString();

  console.log(`[AUTH] OAuth started for ${shop}`);
  res.redirect(url);
}));

// OAuth callback
app.get('/auth/callback', asyncHandler(async (req, res) => {
  const { shop, code, state, hmac } = req.query;
  if (!shop || !code || !state || !hmac) {
    throw new OAuthError('Missing OAuth callback parameters');
  }

  verifyHMAC(req.query);

  const nonceRow = stmts.getNonce.get(state);
  if (!nonceRow) throw new OAuthError('Invalid or expired nonce. Restart install.');
  stmts.deleteNonce.run(state);

  // Exchange code for token
  const tokenResp = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CONFIG.SHOPIFY_API_KEY,
      client_secret: CONFIG.SHOPIFY_API_SECRET,
      code,
    }),
  });

  if (!tokenResp.ok) {
    let body;
    try { body = await tokenResp.json(); } catch { body = await tokenResp.text(); }
    throw new OAuthError(`Token exchange failed: ${tokenResp.status}`, body);
  }

  const tokenData = await tokenResp.json();
  stmts.upsertShop.run(shop, tokenData.access_token, tokenData.scope);
  console.log(`[AUTH] Token persisted for ${shop}`);

  res.redirect(`https://${shop}/admin/apps/${CONFIG.SHOPIFY_API_KEY}`);
}));

// Shopify data endpoints
app.get('/api/shop', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  res.json(await shopifyFetch(shop, 'shop.json'));
}));

app.get('/api/products', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  const limit = Math.min(parseInt(req.query.limit) || 50, 250);
  res.json(await shopifyFetch(shop, `products.json?limit=${limit}`));
}));

app.get('/api/products/:id', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  res.json(await shopifyFetch(shop, `products/${req.params.id}.json`));
}));

app.get('/api/orders', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  const status = req.query.status || 'any';
  const limit = Math.min(parseInt(req.query.limit) || 50, 250);
  res.json(await shopifyFetch(shop, `orders.json?status=${status}&limit=${limit}`));
}));

app.get('/api/inventory', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  res.json(await shopifyFetch(shop, 'inventory_levels.json?limit=50'));
}));

// Claude analysis endpoints
app.post('/api/analyze/products', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  const data = await shopifyFetch(shop, 'products.json?limit=50');
  const summary = data.products.map(p => ({
    title: p.title, status: p.status, variants: p.variants.length,
    prices: p.variants.map(v => parseFloat(v.price)), tags: p.tags,
  }));
  const result = await callClaude(
    `Analyze these pet supply products and provide: 1) Pricing optimization 2) Missing categories 3) SEO improvements 4) Inventory alerts\n\nProducts: ${JSON.stringify(summary)}`,
    { maxTokens: 2048 }
  );
  res.json({ analysis: result.text, usage: result.usage, products_analyzed: data.products.length });
}));

app.post('/api/analyze/orders', asyncHandler(async (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  const data = await shopifyFetch(shop, 'orders.json?status=any&limit=50');
  const summary = data.orders.map(o => ({
    total: o.total_price, currency: o.currency, items: o.line_items?.length,
    created: o.created_at, status: o.financial_status, fulfillment: o.fulfillment_status,
  }));
  const result = await callClaude(
    `Analyze these orders and provide: 1) Revenue trends 2) Popular patterns 3) Fulfillment performance 4) Recommendations\n\nOrders: ${JSON.stringify(summary)}`,
    { maxTokens: 2048 }
  );
  res.json({ analysis: result.text, usage: result.usage, orders_analyzed: data.orders.length });
}));

app.post('/api/analyze/custom', asyncHandler(async (req, res) => {
  const { prompt, system } = req.body;
  if (!prompt) throw new AppError('Missing "prompt" in body', 400, 'MISSING_PROMPT');
  const result = await callClaude(prompt, { system, maxTokens: 2048 });
  res.json({ response: result.text, usage: result.usage });
}));

// Webhooks
app.post('/webhooks/:topic', express.raw({ type: 'application/json' }), asyncHandler(async (req, res) => {
  const topic = req.params.topic;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const shopDomain = req.headers['x-shopify-shop-domain'];
  if (!hmacHeader || !shopDomain) throw new AppError('Missing webhook headers', 401, 'WEBHOOK_AUTH_FAILED');

  const rawBody = typeof req.body === 'string' ? req.body : req.body.toString('utf8');
  if (!verifyWebhookHMAC(rawBody, hmacHeader)) {
    throw new AppError('Webhook HMAC invalid', 401, 'WEBHOOK_HMAC_INVALID');
  }

  stmts.logWebhook.run(topic, shopDomain, rawBody);
  console.log(`[WEBHOOK] ${topic} from ${shopDomain}`);

  if (topic === 'app-uninstalled') {
    stmts.deleteShop.run(shopDomain);
    console.log(`[WEBHOOK] Shop uninstalled: ${shopDomain}`);
  }
  res.status(200).send('OK');
}));

// Admin
app.get('/admin/shops', (req, res) => {
  const shops = stmts.listShops.all();
  res.json({ shops, count: shops.length });
});

app.get('/admin/token-status', (req, res) => {
  const shop = req.query.shop || 'g00z01-ua.myshopify.com';
  const row = stmts.getShop.get(shop);
  if (row) {
    res.json({ shop: row.shop, has_token: true, scope: row.scope, installed_at: row.installed_at, updated_at: row.updated_at, token_preview: row.access_token.slice(0, 8) + '...' });
  } else {
    res.json({ shop, has_token: false, install_url: `/auth?shop=${shop}` });
  }
});

// Landing page
app.get('/', (req, res) => {
  const shop = req.query.shop;
  if (shop) {
    const row = stmts.getShop.get(shop);
    if (!row) return res.redirect(`/auth?shop=${shop}`);
  }
  res.send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Zoo-PetShop Agent</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f6f6f7;color:#1a1a2e}.c{max-width:800px;margin:40px auto;padding:20px}.h{background:linear-gradient(135deg,#1a1a2e,#0f3460);color:#fff;padding:32px;border-radius:16px;margin-bottom:24px}.h h1{font-size:28px;margin-bottom:8px}.h p{opacity:.8;font-size:14px}.card{background:#fff;border-radius:12px;padding:24px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,.08)}.card h3{margin-bottom:12px}.s{display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:500}.ok{background:#d4edda;color:#155724}.warn{background:#fff3cd;color:#856404}.err{background:#f8d7da;color:#721c24}code{background:#f1f3f5;padding:2px 8px;border-radius:4px;font-size:13px}.el li{padding:8px 0;border-bottom:1px solid #f0f0f0;font-size:14px}.el li:last-child{border-bottom:none}.m{display:inline-block;width:50px;font-weight:600;font-size:12px}.get{color:#0f3460}.post{color:#e94560}</style></head><body><div class="c">
<div class="h"><h1>🐾 Zoo-PetShop Agent</h1><p>v3.1.0 — SQLite persistence + Claude AI analysis</p></div>
<div class="card"><h3>Status</h3>
<p style="margin:4px 0">Shopify: <span class="s ${CONFIG.SHOPIFY_API_SECRET ? 'ok' : 'err'}">${CONFIG.SHOPIFY_API_SECRET ? 'Connected' : 'Missing Secret'}</span></p>
<p style="margin:4px 0">Claude AI: <span class="s ${CONFIG.ANTHROPIC_API_KEY ? 'ok' : 'warn'}">${CONFIG.ANTHROPIC_API_KEY ? 'Active' : 'Not configured'}</span></p>
<p style="margin:4px 0">Tokens: <span class="s ok">SQLite Persistent</span></p></div>
<div class="card"><h3>Endpoints</h3><ul class="el" style="list-style:none">
<li><span class="m get">GET</span> <code>/health</code> Health & config</li>
<li><span class="m get">GET</span> <code>/auth?shop=x.myshopify.com</code> OAuth install</li>
<li><span class="m get">GET</span> <code>/api/products</code> Products</li>
<li><span class="m get">GET</span> <code>/api/orders</code> Orders</li>
<li><span class="m get">GET</span> <code>/api/inventory</code> Inventory</li>
<li><span class="m post">POST</span> <code>/api/analyze/products</code> Claude product analysis</li>
<li><span class="m post">POST</span> <code>/api/analyze/orders</code> Claude order analysis</li>
<li><span class="m post">POST</span> <code>/api/analyze/custom</code> Custom Claude prompt</li>
<li><span class="m get">GET</span> <code>/admin/shops</code> Installed shops</li>
<li><span class="m get">GET</span> <code>/admin/token-status</code> Token check</li>
</ul></div></div></body></html>`);
});

// ============================================================
// GLOBAL ERROR HANDLER — Prevents "Error: unknown"
// ============================================================
app.use((err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';

  console.error(`[ERROR] ${code} ${statusCode} ${req.method} ${req.path}: ${message}`);
  if (statusCode === 500) console.error(err.stack);

  res.status(statusCode).json({
    error: { code, message, details: err.details || undefined, path: req.path, timestamp: new Date().toISOString() },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `${req.method} ${req.path} not found` } });
});

// ============================================================
// START
// ============================================================
app.listen(CONFIG.PORT, () => {
  console.log(`\n🐾 Zoo-PetShop Agent v3.1.0`);
  console.log(`   Port: ${CONFIG.PORT} | URL: ${CONFIG.APP_URL}`);
  console.log(`   DB: ${CONFIG.DB_PATH}`);
  console.log(`   Shopify: ${CONFIG.SHOPIFY_API_SECRET ? 'OK' : 'MISSING SECRET'}`);
  console.log(`   Claude: ${CONFIG.ANTHROPIC_API_KEY ? 'OK' : 'not set'}\n`);
});
