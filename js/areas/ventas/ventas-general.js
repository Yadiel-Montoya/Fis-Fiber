/**
 * ventas-general.js — Submódulo Ventas (millones de pesos)
 * Depende de: datos-ventas.js, utils.js
 */
function renderVentasGeneral(container) {
  const D = VENTAS_GENERAL.meses;
  const con26 = D.filter(r => r.alc26 != null);
  const alc26Tot = con26.reduce((s,r) => s + r.alc26, 0);
  const meta26Tot = con26.reduce((s,r) => s + r.meta26, 0);
  const alc25Tot = D.filter((r,i) => i < con26.length).reduce((s,r) => s + (r.alc25||0), 0);
  const cumpProm = con26.length ? con26.reduce((s,r) => s + r.cump26, 0) / con26.length : 0;
  const variacion = alc25Tot ? ((alc26Tot - alc25Tot) / alc25Tot * 100) : 0;
  const mejor = con26.slice().sort((a,b) => b.alc26 - a.alc26)[0];
  const ultimo = con26[con26.length - 1] || {};

  const fmt = n => n == null ? '—' : '$' + n.toFixed(1) + ' M';
  const cumpCls = c => c >= 1 ? 'pill-green' : c >= 0.9 ? 'pill-teal' : c >= 0.8 ? 'pill-amber' : 'pill-red';

  container.innerHTML = `
    <div class="banner ok">✓ Indicador de Ventas · Meta anual $${VENTAS_GENERAL.metaAnual} M · Corte ${ultimo.mes || ''} 2026</div>
    <div class="kpi-row">
      <div class="ckpi" style="--ck-color:var(--ink)"><div class="lbl">Alcanzado 2026 (YTD)</div><div class="val">$${alc26Tot.toFixed(1)}<span style="font-size:16px">M</span></div><div class="sub">${con26.length} meses</div></div>
      <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">Meta 2026 (YTD)</div><div class="val">$${meta26Tot.toFixed(1)}<span style="font-size:16px">M</span></div><div class="sub">acumulada</div></div>
      <div class="ckpi" style="--ck-color:${cumpProm>=0.95?'var(--green)':cumpProm>=0.85?'var(--amber)':'var(--red)'}"><div class="lbl">Cumplimiento prom.</div><div class="val">${Math.round(cumpProm*100)}%</div><div class="sub">de la meta 2026</div></div>
      <div class="ckpi" style="--ck-color:${variacion>=0?'var(--green)':'var(--red)'}"><div class="lbl">vs 2025 (YTD)</div><div class="val">${variacion>=0?'+':''}${variacion.toFixed(1)}%</div><div class="sub">$${alc25Tot.toFixed(1)} M en 2025</div></div>
    </div>
    <div class="charts-grid">
      <div class="chart-box full"><div class="chart-title">Meta vs Alcanzado 2026 <span class="chart-badge">millones $</span></div><div style="position:relative;width:100%;height:280px"><canvas id="vg-metavsalc"></canvas></div></div>
      <div class="chart-box"><div class="chart-title">Comparativo anual <span class="chart-badge">2023–2026</span></div><div style="position:relative;width:100%;height:240px"><canvas id="vg-anual"></canvas></div></div>
      <div class="chart-box"><div class="chart-title">Cumplimiento mensual 2026</div><div style="position:relative;width:100%;height:240px"><canvas id="vg-cump"></canvas></div></div>
    </div>
    <div class="table-wrap">
      <div class="table-head-bar"><span class="ttl">Detalle mensual de ventas</span><span class="meta">${D.length} meses</span></div>
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Mes</th><th class="num">2023</th><th class="num">2024</th><th class="num">Meta 2025</th><th class="num">Alc. 2025</th><th class="num">Cump. 2025</th><th class="num">Meta 2026</th><th class="num">Alc. 2026</th><th class="center">Cump. 2026</th></tr></thead>
        <tbody>${D.map(r => `<tr>
          <td style="font-weight:600">${r.mes}</td>
          <td class="num">${fmt(r.a2023)}</td>
          <td class="num">${fmt(r.a2024)}</td>
          <td class="num">${fmt(r.meta25)}</td>
          <td class="num">${fmt(r.alc25)}</td>
          <td class="num">${r.cump25!=null?Math.round(r.cump25*100)+'%':'—'}</td>
          <td class="num">${fmt(r.meta26)}</td>
          <td class="num" style="font-weight:700">${fmt(r.alc26)}</td>
          <td class="center">${r.cump26!=null?`<span class="pill ${cumpCls(r.cump26)}">${Math.round(r.cump26*100)}%</span>`:'<span style="color:var(--ink3)">—</span>'}</td>
        </tr>`).join('')}</tbody>
        <tfoot><tr><td>TOTAL YTD 2026</td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num"></td><td class="num">$${meta26Tot.toFixed(1)}M</td><td class="num">$${alc26Tot.toFixed(1)}M</td><td class="center">${Math.round(cumpProm*100)}%</td></tr></tfoot>
      </table></div>
    </div>`;

  setTimeout(() => {
    const gc='rgba(0,0,0,0.05)', tc='#9A7078', mf='JetBrains Mono';
    const lbl = D.map(r => r.mes.substring(0,3));

    DC('vg-metavsalc');
    CI['vg-metavsalc'] = new Chart(document.getElementById('vg-metavsalc'), {
      data:{ labels: lbl, datasets:[
        { type:'bar', label:'Meta 2026', data:D.map(r=>r.meta26), backgroundColor:'rgba(26,95,160,0.35)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
        { type:'bar', label:'Alcanzado 2026', data:D.map(r=>r.alc26), backgroundColor:D.map(r=>r.cump26>=1?'rgba(26,158,92,0.85)':r.cump26>=0.9?'rgba(26,158,130,0.85)':'rgba(192,21,42,0.85)'), borderRadius:3, borderSkipped:false, datalabels:{display:false} },
      ]},
      options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false},
        plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:16}}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${(c.parsed.y||0).toFixed(2)} M`}}, datalabels:{display:false} },
        scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:11,family:mf},callback:v=>'$'+v+'M'},border:{color:'transparent'},beginAtZero:true} } }
    });

    DC('vg-anual');
    CI['vg-anual'] = new Chart(document.getElementById('vg-anual'), {
      type:'line', data:{ labels: lbl, datasets:[
        { label:'2023', data:D.map(r=>r.a2023), borderColor:'rgba(148,163,184,0.6)', borderWidth:1.5, pointRadius:2, tension:0.35, datalabels:{display:false} },
        { label:'2024', data:D.map(r=>r.a2024), borderColor:'rgba(59,130,246,0.8)', borderWidth:1.8, pointRadius:2, tension:0.35, datalabels:{display:false} },
        { label:'2025', data:D.map(r=>r.alc25), borderColor:'rgba(251,191,36,0.9)', borderWidth:1.8, pointRadius:2, tension:0.35, datalabels:{display:false} },
        { label:'2026', data:D.map(r=>r.alc26), borderColor:'#C0152A', backgroundColor:'rgba(192,21,42,0.07)', borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#C0152A', fill:true, tension:0.35, datalabels:{display:false} },
      ]},
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${(c.parsed.y||0).toFixed(1)} M`}}, datalabels:{display:false} },
        scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>'$'+v+'M'},border:{color:'transparent'}} } }
    });

    DC('vg-cump');
    CI['vg-cump'] = new Chart(document.getElementById('vg-cump'), {
      type:'bar', data:{ labels: con26.map(r=>r.mes.substring(0,3)), datasets:[{ label:'Cumplimiento', data:con26.map(r=>Math.round(r.cump26*100)), backgroundColor:con26.map(r=>r.cump26>=1?'rgba(26,158,92,0.82)':r.cump26>=0.9?'rgba(26,158,130,0.82)':'rgba(184,122,16,0.82)'), borderRadius:4, borderSkipped:false, datalabels:{anchor:'end',align:'end',offset:2,color:'#5C3038',font:{size:11,family:mf,weight:'700'},formatter:v=>v+'%'} }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},datalabels:{}}, scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>v+'%'},border:{color:'transparent'},beginAtZero:true,max:110,grace:'5%'} } }
    });
  }, 60);
}
