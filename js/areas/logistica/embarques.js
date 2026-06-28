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

  /* Agrupaciones */
  const porCliente = {}, porEstatus = {}, porFecha = {};

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
    const cl  = p.Cliente      || "Desconocido";
    const est = p.EstatusCarga || p.Estatus || "Sin estatus";
    const fe  = fmtFecha(p.F_Entrega);
    porCliente[cl]  = (porCliente[cl]  || 0) + 1;
    porEstatus[est] = (porEstatus[est] || 0) + 1;
    porFecha[fe]    = (porFecha[fe]    || 0) + 1;
  });

  const topClientes  = Object.entries(porCliente).sort(function(a,b){return b[1]-a[1];}).slice(0, 7);
  const fechasOrden  = Object.entries(porFecha).filter(function(e){return e[0]!=="Sin fecha";}).sort(function(a,b){return a[0].localeCompare(b[0]);}).slice(-14);
  const totalPiezas  = data.reduce(function(s,p){return s+(parseInt(p.PiezasEntrega)||0);}, 0);
  const conCita      = data.filter(function(p){return p.Cita && String(p.Cita).trim() && String(p.Cita).trim()!=="—";}).length;
  const tsStr        = timestamp ? new Date(timestamp).toLocaleTimeString("es-MX",{hour:"2-digit",minute:"2-digit"}) : "";
  const cacheStr     = cacheAge != null ? " · caché " + cacheAge + "s" : "";

  function estatusPill(est) {
    if (est === "FACTURADO")   return "pill-green";
    if (est === "EN TRANSITO") return "pill-blue";
    if (est === "EN STOCK")    return "pill-teal";
    return "pill-amber";
  }

  var rows = data.map(function(p) {
    var est = p.EstatusCarga || p.Estatus || "";
    return "<tr>" +
      "<td><span class=\"pill pill-blue\">" + (p._folio||"—") + "</span></td>" +
      "<td style=\"font-weight:600\">" + (p.Pedido||"—") + "</td>" +
      "<td>" + (p.Cliente||"—") + "</td>" +
      "<td style=\"font-size:12px;color:var(--ink3)\">" + (p.Articulo||"—") + "</td>" +
      "<td class=\"num\">" + (parseInt(p.PiezasEntrega)||0) + "</td>" +
      "<td style=\"font-family:'JetBrains Mono',monospace;font-size:12px\">" + fmtDisplay(fmtFecha(p.F_Entrega)) + "</td>" +
      "<td>" + (p.Unidad||"—") + "</td>" +
      "<td>" + (p.Operador||"—") + "</td>" +
      "<td><span class=\"pill " + estatusPill(est) + "\">" + (est||"—") + "</span></td>" +
      "<td style=\"font-size:12px;color:var(--ink3);max-width:180px;white-space:normal\">" + (p.Comentarios||"—") + "</td>" +
    "</tr>";
  }).join("");

  container.innerHTML =
    "<div class=\"banner ok\">✓ WMS conectado · " + data.length + " embarques reprogramados · " + tsStr + cacheStr + "</div>" +
    "<div class=\"kpi-row\">" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--red)\"><div class=\"lbl\">Total reprogramados</div><div class=\"val\">" + data.length + "</div><div class=\"sub\">" + Object.keys(porFecha).length + " fechas de entrega</div></div>" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--amber)\"><div class=\"lbl\">Clientes afectados</div><div class=\"val\">" + Object.keys(porCliente).length + "</div><div class=\"sub\">" + (topClientes[0] ? topClientes[0][0].substring(0,22) : "—") + "</div></div>" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--teal)\"><div class=\"lbl\">Piezas pendientes</div><div class=\"val\">" + totalPiezas.toLocaleString("es-MX") + "</div><div class=\"sub\">suma PiezasEntrega</div></div>" +
      "<div class=\"ckpi\" style=\"--ck-color:var(--blue)\"><div class=\"lbl\">Con cita asignada</div><div class=\"val\">" + conCita + "</div><div class=\"sub\">" + (data.length-conCita) + " sin cita</div></div>" +
    "</div>" +
    "<div class=\"charts-grid\">" +
      "<div class=\"chart-box\"><div class=\"chart-title\">Top clientes reprogramados</div><div style=\"position:relative;height:240px\"><canvas id=\"g-emb-clientes\"></canvas></div></div>" +
      "<div class=\"chart-box\"><div class=\"chart-title\">Por estatus de carga</div><div style=\"position:relative;height:240px\"><canvas id=\"g-emb-estatus\"></canvas></div></div>" +
      "<div class=\"chart-box full\"><div class=\"chart-title\">Reprogramados por fecha de entrega <span class=\"chart-badge\">por F_Entrega</span></div><div style=\"position:relative;height:200px\"><canvas id=\"g-emb-fechas\"></canvas></div></div>" +
    "</div>" +
    "<div class=\"table-wrap\">" +
      "<div class=\"table-head-bar\"><span class=\"ttl\">Detalle de embarques reprogramados</span><span class=\"meta\">" + data.length + " registros</span></div>" +
      "<table><thead><tr>" +
        "<th>Folio</th><th>Pedido</th><th>Cliente</th><th>Artículo</th>" +
        "<th class=\"num\">Piezas</th><th>F. Entrega</th><th>Unidad</th><th>Operador</th><th>Estatus</th><th>Comentarios</th>" +
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

    DC("g-emb-estatus");
    var estKeys = Object.keys(porEstatus);
    var estColors = ["rgba(192,21,42,0.82)","rgba(26,95,160,0.82)","rgba(26,158,92,0.82)","rgba(26,158,130,0.82)","rgba(184,122,16,0.82)"];
    CI["g-emb-estatus"] = new Chart(document.getElementById("g-emb-estatus"), {
      type: "doughnut",
      data: {
        labels: estKeys,
        datasets: [{ data: estKeys.map(function(k){return porEstatus[k];}), backgroundColor: estColors, borderWidth:1, hoverOffset:6 }]
      },
      options: {
        responsive:true, maintainAspectRatio:false, cutout:"65%",
        plugins: {
          legend: { position:"bottom", labels:{color:"#5C3038",font:{size:11,family:"Outfit"},usePointStyle:true,padding:14} },
          datalabels: {
            color:"#fff", font:{size:12,family:mf,weight:"700"},
            formatter: function(v,ctx){ var t=ctx.dataset.data.reduce(function(a,b){return a+b;},0); return t?Math.round(v/t*100)+"%":""; }
          }
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
