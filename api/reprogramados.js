/**
 * api/reprogramados.js — Vercel Serverless Function
 * Proxy entre el frontend (Vercel) y el WMS de FIS FIBER.
 * El frontend no puede llamar directo al WMS (sin CORS); esta función lo hace server-side.
 */

const WMS_BASE     = 'https://fisfiberwms.duckdns.org';
const WMS_EMAIL    = 'ymontoya@fisfiber.com.mx';
const WMS_PASS     = '7895';
const BATCH_SIZE   = 20;          // folios en paralelo por lote
const DATA_TTL     = 5 * 60000;   // 5 min cache de datos
const SESSION_TTL  = 20 * 60000;  // 20 min cache de sesión

// Cache de módulo — persiste entre invocaciones "calientes"
let _cookies  = null;
let _cookieTs = 0;
let _cache    = { data: null, ts: 0 };

/* ── HTTP helper ────────────────────────────────── */
async function wmsPost(path, params, cookies) {
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (cookies) headers['Cookie'] = cookies;
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    return await fetch(WMS_BASE + path, {
      method:  'POST',
      headers,
      body:    new URLSearchParams(params).toString(),
      signal:  ctrl.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/* ── Login ──────────────────────────────────────── */
async function doLogin() {
  const res = await wmsPost('/Login/validarUsuario', { email: WMS_EMAIL, password: WMS_PASS });
  if (!res.ok) throw new Error('WMS login HTTP ' + res.status);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Login WMS fallo — revisa credenciales o URL');
  const cookie = res.headers.get('set-cookie') || '';
  const match  = cookie.match(/ASP\.NET_SessionId=[^;,]+/i);
  if (!match) throw new Error('WMS no devolvio cookie de sesion');
  return match[0];
}

async function getCookies() {
  const now = Date.now();
  if (_cookies && (now - _cookieTs) < SESSION_TTL) return _cookies;
  _cookies  = await doLogin();
  _cookieTs = now;
  return _cookies;
}

/* ── Folios ─────────────────────────────────────── */
function extractFolios(json) {
  const items = json.data || json.Data || [];
  return (Array.isArray(items) ? items : []).flatMap(function(item) {
    for (var k of ['Folio','folio','NumPlan','PlanEmb','planEmb']) {
      if (item[k]) return [String(item[k]).trim()];
    }
    return [];
  });
}

async function getFolios(cookies) {
  var [r1, r2] = await Promise.all([
    wmsPost('/PlanEmb/GetPlanesEmbGenerados', { draw:1, start:0, length:300 }, cookies),
    wmsPost('/PlanEmb/GetPlanesEmbarques',    { draw:1, start:0, length:5   }, cookies),
  ]);
  var [j1, j2] = await Promise.all([r1.json(), r2.json()]);
  return [...new Set([...extractFolios(j1), ...extractFolios(j2)])];
}

/* ── Detalles por folio ──────────────────────────── */
async function getReprogramadosDeFolio(folio, cookies) {
  try {
    var r    = await wmsPost('/PlanEmb/GetPlanEmbGeneradosDetails', { folio, draw:1, start:0, length:500 }, cookies);
    var resp = await r.json();
    var raw  = resp.Data || resp.data || '[]';
    var list = typeof raw === 'string' ? JSON.parse(raw) : (Array.isArray(raw) ? raw : []);
    return list
      .filter(function(p){ return String(p.NumeroViaje||'').trim().toLowerCase() === 'reprogramado'; })
      .map(function(p){ return Object.assign({}, p, { _folio: folio }); });
  } catch(e) {
    return [];
  }
}

async function fetchTodos(cookies) {
  var folios   = await getFolios(cookies);
  var results  = [];
  for (var i = 0; i < folios.length; i += BATCH_SIZE) {
    var batch  = folios.slice(i, i + BATCH_SIZE);
    var items  = await Promise.all(batch.map(function(f){ return getReprogramadosDeFolio(f, cookies); }));
    results    = results.concat(items.reduce(function(acc, a){ return acc.concat(a); }, []));
  }
  return results;
}

/* ── Handler ────────────────────────────────────── */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  var now = Date.now();

  // Servir desde caché si está vigente
  if (_cache.data && (now - _cache.ts) < DATA_TTL) {
    return res.json({
      reprogramados: _cache.data,
      total:         _cache.data.length,
      timestamp:     new Date(_cache.ts).toISOString(),
      cache_age:     Math.round((now - _cache.ts) / 1000),
    });
  }

  try {
    var cookies;
    try {
      cookies = await getCookies();
    } catch(loginErr) {
      _cookies = null;
      throw loginErr;
    }

    var data  = await fetchTodos(cookies);
    _cache    = { data, ts: now };

    return res.json({
      reprogramados: data,
      total:         data.length,
      timestamp:     new Date(now).toISOString(),
      cache_age:     0,
    });
  } catch(e) {
    _cookies = null;
    return res.status(500).json({ error: e.message });
  }
};
