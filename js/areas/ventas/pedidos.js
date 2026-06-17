/**
 * pedidos.js — Submódulo Pedidos Reprogramados (ventas)
 * Depende de: datos-ventas.js, config.js (VENTAS_PEDIDOS_URL), utils.js
 */

/* Carga Pedidos en vivo. Meses: 0=mes 2=2024 5=2025 7=2026.
   Desglose por retraso: col 15 (rango) / col 16 (valor). */
async function loadPedidos() {
  if (typeof VENTAS_PEDIDOS_URL === 'undefined' || !VENTAS_PEDIDOS_URL)
    return { meses: VENTAS_PEDIDOS.meses, desglose: VENTAS_PEDIDOS.desgloseUltimoMes, vivo: false };
  try {
    const res = await fetch(VENTAS_PEDIDOS_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('HTML recibido');
    const filas = txt.split('\n').map(parseCSVLine);
    const hi = filas.findIndex(c => (c[0] || '').trim() === 'Mes');
    if (hi < 0) throw new Error('Sin encabezado Mes');
    const meses = [];
    for (let i = hi + 1; i < filas.length && meses.length < 12; i++) {
      const c = filas[i].map(x => (x || '').trim());
      if (!MESES_VENTAS.includes(c[0])) { if (meses.length) break; continue; }
      const v26 = parseMoney(c[7]);
      meses.push({ mes:c[0], a2024:parseMoney(c[2])||null, a2025:parseMoney(c[5])||null, a2026: c[7]!=='' ? v26 : null });
    }
    if (!meses.length) throw new Error('Sin meses');
    // Desglose por días de retraso (col 15 = rango, col 16 = valor)
    const rangos = [];
    for (const f of filas) {
      const r = (f[15] || '').trim(), v = parseMoney(f[16] || '');
      if (/1\s*a\s*3|4\s*a\s*10|m[aá]s\s*de\s*10/i.test(r) && v) rangos.push({ rango:r, valor:v });
      if (rangos.length === 3) break;
    }
    const ultimoMes = (meses.filter(m => m.a2026 != null).slice(-1)[0] || {}).mes || '';
    const desglose = rangos.length
      ? { mes: ultimoMes, rangos, total: rangos.reduce((s,r)=>s+r.valor,0) }
      : VENTAS_PEDIDOS.desgloseUltimoMes;
    return { meses, desglose, vivo: true };
  } catch (e) {
    console.warn('Pedidos: datos embebidos (', e.message, ')');
    return { meses: VENTAS_PEDIDOS.meses, desglose: VENTAS_PEDIDOS.desgloseUltimoMes, vivo: false };
  }
}

async function renderPedidos(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Conectando con Google Sheets…</div>`;
  const carga = await loadPedidos();
  const D = carga.meses;
  const dg = carga.desglose;
  const con26 = D.filter(r => r.a2026 != null);
  const tot26 = con26.reduce((s,r) => s + r.a2026, 0);
  const tot25 = D.filter((r,i) => i < con26.length).reduce((s,r) => s + (r.a2025||0), 0);
  const prom26 = con26.length ? tot26 / con26.length : 0;
  const variacion = tot25 ? ((tot26 - tot25) / tot25 * 100) : 0;
  const ultimo = con26[con26.length-1] || {};

  container.innerHTML = `
    <div class="banner ok">${carga.vivo?'✓ Google Sheets conectado':'✓ Datos locales'} · Pedidos reprogramados · Conteo mensual · Corte ${ultimo.mes||''} 2026</div>
    <div class="kpi-row">
      <div class="ckpi" style="--ck-color:var(--ink)"><div class="lbl">Total 2026 (YTD)</div><div class="val">${tot26}</div><div class="sub">${con26.length} meses</div></div>
      <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">Promedio mensual</div><div class="val">${prom26.toFixed(0)}</div><div class="sub">pedidos / mes</div></div>
      <div class="ckpi" style="--ck-color:var(--amber)"><div class="lbl">Último mes (${ultimo.mes||''})</div><div class="val">${ultimo.a2026||0}</div><div class="sub">reprogramados</div></div>
      <div class="ckpi" style="--ck-color:${variacion<=0?'var(--green)':'var(--red)'}"><div class="lbl">vs 2025 (YTD)</div><div class="val">${variacion>=0?'+':''}${variacion.toFixed(0)}%</div><div class="sub">${tot25} en 2025 · ${variacion<=0?'menos = mejor':'más reprog.'}</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-box full"><div class="chart-title">Comparativo mensual <span class="chart-badge">2024–2026</span></div><div style="position:relative;width:100%;height:280px"><canvas id="pd-anual"></canvas></div></div>
      <div class="chart-box"><div class="chart-title">Desglose por retraso <span class="chart-badge">${dg.mes} 2026</span></div><div style="position:relative;width:100%;height:240px"><canvas id="pd-desglose"></canvas></div></div>
      <div class="chart-box"><div class="chart-title">Reprogramados 2026 por mes</div><div style="position:relative;width:100%;height:240px"><canvas id="pd-2026"></canvas></div></div>
    </div>
    <div class="table-wrap">
      <div class="table-head-bar"><span class="ttl">Detalle mensual · Pedidos reprogramados</span><span class="meta">${D.length} meses</span></div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Mes</th><th class="num">2024</th><th class="num">2025</th><th class="num">2026</th><th class="num">Var. vs 2025</th></tr></thead>
        <tbody>${D.map(r => {
          const v = (r.a2026!=null && r.a2025) ? Math.round((r.a2026-r.a2025)/r.a2025*100) : null;
          return `<tr>
            <td style="font-weight:600">${r.mes}</td>
            <td class="num">${r.a2024??'—'}</td>
            <td class="num">${r.a2025??'—'}</td>
            <td class="num" style="font-weight:700">${r.a2026!=null?`<span class="pill pill-amber">${r.a2026}</span>`:'<span style="color:var(--ink3)">—</span>'}</td>
            <td class="num">${v!=null?`<span style="color:${v<=0?'var(--green)':'var(--red)'}">${v>0?'+':''}${v}%</span>`:'—'}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr><td>TOTAL YTD</td><td class="num"></td><td class="num">${tot25}</td><td class="num">${tot26}</td><td class="num">${variacion>0?'+':''}${variacion.toFixed(0)}%</td></tr></tfoot>
      </table></div>
    </div>
    <div class="table-wrap" style="margin-top:1rem">
      <div class="table-head-bar"><span class="ttl">Desglose por días de retraso · ${dg.mes} 2026</span><span class="meta">${dg.total} pedidos</span></div>
      <table>
        <thead><tr><th>Rango de retraso</th><th class="num">Pedidos</th><th class="num">% del total</th></tr></thead>
        <tbody>${dg.rangos.map(r => `<tr><td style="font-weight:600">${r.rango}</td><td class="num">${r.valor}</td><td class="num">${Math.round(r.valor/dg.total*100)}%</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total</td><td class="num">${dg.total}</td><td class="num">100%</td></tr></tfoot>
      </table>
    </div>`;

  setTimeout(() => {
    const gc='rgba(0,0,0,0.05)', tc='#9A7078', mf='JetBrains Mono';
    const lbl = D.map(r => r.mes.substring(0,3));

    DC('pd-anual');
    CI['pd-anual'] = new Chart(document.getElementById('pd-anual'), {
      type:'bar', data:{ labels: lbl, datasets:[
        { label:'2024', data:D.map(r=>r.a2024), backgroundColor:'rgba(148,163,184,0.6)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
        { label:'2025', data:D.map(r=>r.a2025), backgroundColor:'rgba(251,191,36,0.7)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
        { label:'2026', data:D.map(r=>r.a2026), backgroundColor:'rgba(192,21,42,0.82)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
      ]},
      options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:16}}, tooltip:{}, datalabels:{display:false} },
        scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'},beginAtZero:true} } }
    });

    DC('pd-desglose');
    CI['pd-desglose'] = new Chart(document.getElementById('pd-desglose'), {
      type:'doughnut', data:{ labels: dg.rangos.map(r=>r.rango), datasets:[{ data:dg.rangos.map(r=>r.valor), backgroundColor:['rgba(26,158,92,0.82)','rgba(184,122,16,0.82)','rgba(192,21,42,0.82)'], borderWidth:1, hoverOffset:6 }] },
      options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed} (${Math.round(c.parsed/dg.total*100)}%)`}}, datalabels:{color:'#fff',font:{size:12,family:mf,weight:'700'},formatter:(v)=>Math.round(v/dg.total*100)+'%'} } }
    });

    DC('pd-2026');
    CI['pd-2026'] = new Chart(document.getElementById('pd-2026'), {
      type:'bar', data:{ labels: con26.map(r=>r.mes.substring(0,3)), datasets:[{ label:'2026', data:con26.map(r=>r.a2026), backgroundColor:'rgba(192,21,42,0.82)', borderRadius:4, borderSkipped:false, datalabels:{anchor:'end',align:'end',offset:2,color:'#9E0E20',font:{size:11,family:mf,weight:'700'},formatter:v=>v} }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},datalabels:{}}, scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:10}},border:{color:'transparent'},beginAtZero:true,grace:'15%'} } }
    });
  }, 60);
}
