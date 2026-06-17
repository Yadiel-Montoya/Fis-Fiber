/**
 * pedidos.js — Submódulo Pedidos Reprogramados (ventas)
 * Depende de: datos-ventas.js, utils.js
 */
function renderPedidos(container) {
  const D = VENTAS_PEDIDOS.meses;
  const dg = VENTAS_PEDIDOS.desgloseUltimoMes;
  const con26 = D.filter(r => r.a2026 != null);
  const tot26 = con26.reduce((s,r) => s + r.a2026, 0);
  const tot25 = D.filter((r,i) => i < con26.length).reduce((s,r) => s + (r.a2025||0), 0);
  const prom26 = con26.length ? tot26 / con26.length : 0;
  const variacion = tot25 ? ((tot26 - tot25) / tot25 * 100) : 0;
  const ultimo = con26[con26.length-1] || {};

  container.innerHTML = `
    <div class="banner ok">✓ Pedidos reprogramados · Conteo mensual · Corte ${ultimo.mes||''} 2026</div>
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
