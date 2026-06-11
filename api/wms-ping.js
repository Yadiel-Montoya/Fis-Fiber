/**
 * api/wms-ping.js — Diagnóstico de conectividad WMS
 * Abre: /api/wms-ping en el navegador para ver qué falla
 */

const https = require('https');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  var steps = [];
  var startTotal = Date.now();

  // Paso 1: Resolución DNS / TCP
  var loginRes = null;
  var loginErr = null;
  try {
    var t0 = Date.now();
    var body = new URLSearchParams({ email: 'ymontoya@fisfiber.com.mx', password: '7895' }).toString();
    loginRes = await new Promise(function(resolve, reject) {
      var req2 = https.request({
        hostname:           'fisfiberwms.duckdns.org',
        path:               '/Login/validarUsuario',
        method:             'POST',
        rejectUnauthorized: false,
        timeout:            10000,
        headers: {
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
        }
      }, function(r) {
        var chunks = [];
        r.on('data', function(c){ chunks.push(c); });
        r.on('end', function(){
          resolve({
            status:  r.statusCode,
            headers: r.headers,
            body:    Buffer.concat(chunks).toString('utf8').substring(0, 300),
          });
        });
      });
      req2.on('timeout', function(){ req2.destroy(new Error('timeout 10s')); });
      req2.on('error', reject);
      req2.write(body);
      req2.end();
    });
    steps.push({ step: 'login', ms: Date.now()-t0, status: loginRes.status, bodyPreview: loginRes.body, cookies: loginRes.headers['set-cookie'] });
  } catch(e) {
    steps.push({ step: 'login', error: e.message });
    loginErr = e;
  }

  return res.status(200).json({
    host:     'fisfiberwms.duckdns.org',
    totalMs:  Date.now() - startTotal,
    steps,
    verdict:  loginErr ? 'FAIL' : (loginRes && loginRes.status === 200 ? 'OK' : 'WARN'),
  });
};
