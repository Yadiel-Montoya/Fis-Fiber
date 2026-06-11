/**
 * api/reprogramados.js — Vercel Serverless Function
 * Usa el módulo https nativo para evitar problemas de certificado SSL
 * con servidores DuckDNS (rejectUnauthorized: false).
 */

const https = require('https');

const WMS_HOST    = process.env.WMS_HOST  || 'fisfiberwms.duckdns.org';
const WMS_EMAIL   = process.env.WMS_EMAIL || 'ymontoya@fisfiber.com.mx';
const WMS_PASS    = process.env.WMS_PASS  || '7895';
const BATCH_SIZE  = 15;
const DATA_TTL    = 5 * 60000;
const SESSION_TTL = 20 * 60000;

let _cookies  = null;
let _cookieTs = 0;
let _cache    = { data: null, ts: 0 };

/* ── HTTP helper con https nativo ───────────────── */
function wmsPost(path, params, cookieStr) {
  return new Promise(function(resolve, reject) {
    var body = new URLSearchParams(params).toString();
    var headers = {
      'Content-Type':   'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      'User-Agent':     'FIS-Fiber/1.0',
    };
    if (cookieStr) headers['Cookie'] = cookieStr;

    var req = https.request({
      hostname:          WMS_HOST,
      path:              path,
      method:            'POST',
      rejectUnauthorized: false,   // acepta certificados auto-firmados / DuckDNS
      headers:           headers,
      timeout:           12000,
    }, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        var raw = Buffer.concat(chunks).toString('utf8');
        resolve({
          ok:      res.statusCode >= 200 && res.statusCode < 300,
          status:  res.statusCode,
          headers: res.headers,
          text:    function() { return raw; },
          json:    function() { return JSON.parse(raw); },
        });
      });
    });

    req.on('timeout', function() { req.destroy(new Error('WMS timeout (12s)')); });
    req.on('error',   function(e) { reject(e); });
    req.write(body);
    req.end();
  });
}

/* ── Login ──────────────────────────────────────── */
async function doLogin() {
  var res = await wmsPost('/Login/validarUsuario', { email: WMS_EMAIL, password: WMS_PASS });
  if (!res.ok) throw new Error('WMS login HTTP ' + res.status);
  var text = res.text();
  if (text.trim().startsWith('<')) throw new Error('WMS login fallo — verifica credenciales o URL');
  var setCookie = res.headers['set-cookie'];
  var cookieStr = Array.isArray(setCookie) ? setCookie.join('; ') : (setCookie || '');
  var match = cookieStr.match(/ASP\.NET_SessionId=[^;,]+/i);
  if (!match) throw new Error('WMS no devolvio cookie de sesion');
  return match[0];
}

async function getCookies() {
  var now = Date.now();
  if (_cookies && (now - _cookieTs) < SESSION_TTL) return _cookies;
  _cookies  = await doLogin();
  _cookieTs = now;
  return _cookies;
}

/* ── Folios ─────────────────────────────────────── */
function extractFolios(json) {
  var items = json.data || json.Data || [];
  return (Array.isArray(items) ? items : []).flatMap(function(item) {
    var keys = ['Folio','folio','NumPlan','PlanEmb','planEmb','NoPlan'];
    for (var i = 0; i < keys.length; i++) {
      if (item[keys[i]]) return [String(item[keys[i]]).trim()];
    }
    return [];
  });
}

async function getFolios(cookies) {
  var [r1, r2] = await Promise.all([
    wmsPost('/PlanEmb/GetPlanesEmbGenerados', { draw:1, start:0, length:300 }, cookies),
    wmsPost('/PlanEmb/GetPlanesEmbarques',    { draw:1, start:0, length:5   }, cookies),
  ]);
  return [...new Set([...extractFolios(r1.json()), ...extractFolios(r2.json())])];
}

/* ── Detalles por folio ──────────────────────────── */
async function getReprogramadosDeFolio(folio, cookies) {
  try {
    var r    = await wmsPost('/PlanEmb/GetPlanEmbGeneradosDetails', { folio, draw:1, start:0, length:500 }, cookies);
    var resp = r.json();
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
  var folios = await getFolios(cookies);
  var results = [];
  for (var i = 0; i < folios.length; i += BATCH_SIZE) {
    var batch = folios.slice(i, i + BATCH_SIZE);
    var items = await Promise.all(batch.map(function(f){ return getReprogramadosDeFolio(f, cookies); }));
    results   = results.concat(items.reduce(function(acc,a){ return acc.concat(a); }, []));
  }
  return results;
}

/* ── Handler ────────────────────────────────────── */
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  var now = Date.now();

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
    var data = await fetchTodos(cookies);
    _cache   = { data, ts: now };
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
