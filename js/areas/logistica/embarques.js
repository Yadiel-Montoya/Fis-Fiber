/**
 * embarques.js - Modulo Embarques Reprogramados
 * Fuente: GitHub raw (rama data), publicado por la oficina cada 5 min desde el WMS
 * Filtra registros donde NumeroViaje === "Reprogramado"
 */

async function loadEmbarques() {
  try {
    // Prioridad: GitHub raw (siempre disponible). Respaldo: API directa por el dominio.
    var url = (typeof EMBARQUES_DATA_URL !== "undefined" && EMBARQUES_DATA_URL)
      ? EMBARQUES_DATA_URL + "?cb=" + Date.now()
      : (EMBARQUES_PROXY_URL || "") + "/api/reprogramados?cb=" + Date.now();
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const js = await r.json();
    if (js.error && !(js.reprogramados && js.reprogramados.length)) throw new Error(js.error);
    return { data: js.reprogramados || [], timestamp: js.timestamp, cacheAge: js.cache_age, cargando: !!js.cargando, error: null };
  } catch (e) {
    return { data: [], timestamp: null, cacheAge: null, cargando: false, error: e.message };
  }
}

async function renderEmbarques(container) {
  container.innerHTML = "<div class=\"loading-state\"><div class=\"spinner\"></div>Conectando con WMS…</div>";
  const res = await loadEmbarques();
  const data = res.data, timestamp = res.timestamp, cacheAge = res.cacheAge, error = res.error;

  // Carga inicial del WMS en curso: el servidor está armando el caché (~1 min)
  if (!error && res.cargando && !data.length) {
    container.innerHTML =
      "<div class=\"empty-state\">" +
        "<div class=\"empty-icon\"><div class=\"spinner\"></div></div>" +
        "<div class=\"empty-title\">Consultando el WMS…</div>" +
        "<div class=\"empty-desc\">El servidor está armando los reprogramados (toma ~1 min la primera vez). Se actualiza solo.</div>" +
      "</div>";
    clearTimeout(window._reintentoEmbarques);
    window._reintentoEmbarques = setTimeout(function(){ renderEmbarques(container); }, 20000);
    return;
  }

  if (error) {
    container.innerHTML =
      "<div class=\"empty-state\">" +
        "<div class=\"empty-icon\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--red)\" stroke-width=\"1.8\" stroke-linecap=\"round\"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/></svg></div>" +
        "<div class=\"empty-title\">WMS no disponible</div>" +
        "<div class=\"empty-desc\">No se pudieron leer los reprogramados (GitHub/WMS).<br><br>" +
        "<span style=\"color:var(--red);font-size:12px\">" + error + "</span></div>" +
      "</div>";
    return;
  }

  if (!data.length) {
    container.innerHTML =
      "<div class=\"empty-state\">" +
        "<div class=\"empty-icon\"><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"var(--green)\" stroke-width=\"1.8\" stroke-linecap=\"round\"><polyline points=\"20 6 9 17 4 12\"/></svg></div>" +
        "<div class=\"empty-title\">Sin reprogramados activos</div>" +
        "<div class=\"empty-desc\">No hay pedidos con NumeroViaje = \"Reprogramado\" en este momento.</div>" +
      "</div>";
    return;
  }

  /* Deduplicar: el MISMO pedido puede venir en varios folios (a veces con
     estatus distintos). Solo cuentan reprogramados DIFERENTES → uno por Pedido. */
  (function(){
    var vistos = {}, unicos = [];
    for (var i = 0; i < data.length; i++) {
      var ped = String((data[i] && data[i].Pedido) || "").trim();
      var key = ped || ("__sin_pedido_" + i);
      if (vistos[key]) continue;
      vistos[key] = 1; unicos.push(data[i]);
    }
    data = unicos;
  })();

  /* Agrupaciones */
  const porCliente = {}, porFecha = {}, piezasPorCliente = {};

  function fmtFecha(d) {
    if (!d) return "Sin fecha";
    const s = String(d);
    const ms = s.match(/\/Date\((\d+)\)\//);
    if (ms) {
      const dt = new Date(+ms[1]);
      return dt.getFullYear() + "-" + String(dt.getMonth()+1).padStart(2,"0") + "-" + String(dt.getDate()).padStart(2,"0");
    }
    return s.substring(0, 10);
  }

  const MESES_CORTOS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  function fmtDisplay(d) {
    if (!d || d === "Sin fecha") return "—";
    const parts = d.split("-");
    if (parts.length < 3) return d;
    return parts[2] + " " + MESES_CORTOS[+parts[1]-1] + " " + parts[0];
  }

  data.forEach(function(p) {
    const cl  = p.Cliente || "Desconocido";
    const fe  = fmtFecha(p.F_Entrega);
    porCliente[cl]       = (porCliente[cl] || 0) + 1;
    piezasPorCliente[cl] = (piezasPorCliente[cl] || 0) + (parseInt(p.PiezasEntrega) || 0);
    porFecha[fe]         = (porFecha[fe] || 0) + 1;
  });

  const clientesOrden = Object.entries(porCliente).sort(function(a,b){return b[1]-a[1];});
  const topClientes  = clientesOrden.slice(0, 7);
  const fechasOrden  = Object.entries(porFecha).filter(function(e){return e[0]!=="Sin fecha";}).sort(function(a,b){return a[0].localeCompare(b[0]);}).slice(-14);
  const totalPiezas  = data.reduce(function(s,p){return s+(parseInt(p.PiezasEntrega)||0);}, 0);
  const tsStr        = timestamp ? new Date(timestamp).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : "";
  const cacheStr     = cacheAge != null ? " · caché " + cacheAge + "s" : "";

  // Tabla = TOP de clientes (ranking), sin estatus ni detalle por pedido
  var rows = clientesOrden.map(function(e, i) {
    var cl = e[0], n = e[1], pz = piezasPorCliente[cl] || 0;
    return "<tr>" +
      "<td style=\"color:var(--ink3)\">" + (i+1) + "</td>" +
      "<td style=\"font-weight:600\">" + cl + "</td>" +
      "<td class=\"num\">" + n + "</td>" +
      "<td class=\"num\">" + pz.toLocaleString("es-MX") + "</td>" +
    "</tr>";
  }).join("");

  container.innerHTML =
    "<div class=\"banner ok\">✓ WMS conectado · " + data.length + " embarques reprogramados · " + tsStr + cacheStr + "</div>" +
    "<div class=\"kpi-row\">" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--red)\"><div class=\"lbl\">Reprogramados</div><div class=\"val\">" + data.length + "</div><div class=\"sub\">pedidos únicos</div></div>" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--amber)\"><div class=\"lbl\">Clientes afectados</div><div class=\"val\">" + Object.keys(porCliente).length + "</div><div class=\"sub\">" + (topClientes[0] ? topClientes[0][0].substring(0,22) : "—") + "</div></div>" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--teal)\"><div class=\"lbl\">Piezas pendientes</div><div class=\"val\">" + totalPiezas.toLocaleString("es-MX") + "</div><div class=\"sub\">suma PiezasEntrega</div></div>" +
    "</div>" +
    "<div class=\"charts-grid\">" +
      "<div class=\"chart-box\"><div class=\"chart-title\">Top clientes con más reprogramados</div><div style=\"position:relative;height:260px\"><canvas id=\"g-emb-clientes\"></canvas></div></div>" +
      "<div class=\"chart-box\"><div class=\"chart-title\">Reprogramados por fecha de entrega <span class=\"chart-badge\">por F_Entrega</span></div><div style=\"position:relative;height:260px\"><canvas id=\"g-emb-fechas\"></canvas></div></div>" +
    "</div>" +
    "<div class=\"table-wrap\">" +
      "<div class=\"table-head-bar\"><span class=\"ttl\">Top de clientes reprogramados</span><span class=\"meta\">" + Object.keys(porCliente).length + " clientes · " + data.length + " pedidos</span></div>" +
      "<table><thead><tr>" +
        "<th>#</th><th>Cliente</th><th class=\"num\">Reprogramados</th><th class=\"num\">Piezas</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table>" +
    "</div>";

  window._embData = data;

  /* Graficas */
  setTimeout(function() {
    var tc = "#9A7078", gc = "rgba(0,0,0,0.05)", mf = "JetBrains Mono";

    DC("g-emb-clientes");
    CI["g-emb-clientes"] = new Chart(document.getElementById("g-emb-clientes"), {
      type: "bar",
      data: {
        labels: topClientes.map(function(e){ var c=e[0]; return c.length>24?c.substring(0,22)+"…":c; }),
        datasets: [{ data: topClientes.map(function(e){return e[1];}), backgroundColor: "rgba(192,21,42,0.78)", borderRadius: 5, borderSkipped: false }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: "y",
        plugins: {
          legend: { display: false },
          datalabels: { anchor:"end", align:"end", color:"#9E0E20", font:{ size:11, family:mf, weight:"700" } }
        },
        scales: {
          x: { grid:{color:gc}, ticks:{color:tc,font:{size:10,family:mf}}, border:{color:"transparent"}, beginAtZero:true },
          y: { grid:{display:false}, ticks:{color:"#1A0A0C",font:{size:11,family:"Outfit"}}, border:{color:"transparent"} }
        }
      }
    });

    DC("g-emb-fechas");
    CI["g-emb-fechas"] = new Chart(document.getElementById("g-emb-fechas"), {
      type: "bar",
      data: {
        labels: fechasOrden.map(function(e){ return fmtDisplay(e[0]); }),
        datasets: [{ label:"Reprogramados", data:fechasOrden.map(function(e){return e[1];}), backgroundColor:"rgba(184,122,16,0.78)", borderRadius:4, borderSkipped:false }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        plugins: {
          legend:{display:false},
          datalabels:{ anchor:"end", align:"top", offset:2, color:"#7A5010", font:{size:11,family:mf,weight:"700"} }
        },
        scales: {
          x: { grid:{display:false}, ticks:{color:tc,font:{size:10,family:mf},maxRotation:45,minRotation:45}, border:{color:"transparent"} },
          y: { grid:{color:gc}, ticks:{color:tc,font:{size:11}}, border:{color:"transparent"}, beginAtZero:true }
        }
      }
    });
  }, 60);

  if (window._timerEmbarques) clearInterval(window._timerEmbarques);
  window._timerEmbarques = setInterval(function(){ renderEmbarques(container); }, 5*60*1000);
}
