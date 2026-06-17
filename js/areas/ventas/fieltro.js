/**
 * fieltro.js — Submódulo Ventas Fieltro (kilos) · General vs FIS
 * Depende de: datos-ventas.js, config.js (VENTAS_FIELTRO_URL), utils.js
 */

/* Carga Fieltro en vivo. Columnas: 0=Mes 2=g24 3=f24 5=g25 6=f25 7=g26 8=f26 */
async function loadFieltro() {
  if (typeof VENTAS_FIELTRO_URL === 'undefined' || !VENTAS_FIELTRO_URL) return { data: VENTAS_FIELTRO, vivo: false };
  try {
    const res = await fetch(VENTAS_FIELTRO_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('HTML recibido');
    const filas = txt.split('\n').map(parseCSVLine);
    const hi = filas.findIndex(c => (c[0] || '').trim() === 'Mes');
    if (hi < 0) throw new Error('Sin encabezado Mes');
    const data = [];
    for (let i = hi + 1; i < filas.length && data.length < 12; i++) {
      const c = filas[i].map(x => (x || '').trim());
      if (!MESES_VENTAS.includes(c[0])) { if (data.length) break; continue; }
      data.push({ mes:c[0], g2024:parseMoney(c[2]), f2024:parseMoney(c[3]), g2025:parseMoney(c[5]), f2025:parseMoney(c[6]), g2026:parseMoney(c[7])||null, f2026:parseMoney(c[8])||null });
    }
    if (!data.length) throw new Error('Sin meses');
    return { data, vivo: true };
  } catch (e) { console.warn('Fieltro: datos embebidos (', e.message, ')'); return { data: VENTAS_FIELTRO, vivo: false }; }
}

async function renderFieltro(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Conectando con Google Sheets…</div>`;
  const carga = await loadFieltro();
  const ALL = carga.data;
  let filtroMes = 'todos';

  const kg = n => n == null ? '—' : Math.round(n).toLocaleString('es-MX') + ' kg';
  const filtrar = () => filtroMes === 'todos' ? ALL : ALL.filter(r => r.mes === filtroMes);
  const periodo = () => filtroMes === 'todos' ? 'Todos los meses' : filtroMes;

  function render() {
    const D = filtrar();
    const sum = k => D.reduce((s,r) => s + (r[k]||0), 0);
    const g26 = sum('g2026'), g25 = sum('g2025'), g24 = sum('g2024'), f26 = sum('f2026');
    const conDato = D.filter(r => r.g2026);
    const prom26 = conDato.length ? g26 / conDato.length : 0;
    const varGen = g25 ? ((g26 - g25) / g25 * 100) : 0;
    const pctFis = g26 ? (f26 / g26 * 100) : 0;
    const ultimo = conDato[conDato.length-1] || {};
    const esMes = filtroMes !== 'todos';

    container.innerHTML = `
      <div class="banner ok">${carga.vivo?'✓ Google Sheets conectado':'✓ Datos locales'} · Fieltro en kilos · General vs FIS · Corte ${ultimo.mes||''} 2026</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span>
          <select class="filter-select" id="ft-mes"><option value="todos">Todos los meses</option>${ALL.map(r => `<option value="${r.mes}"${filtroMes===r.mes?' selected':''}>${r.mes}</option>`).join('')}</select>
        </div>
        <button class="filter-btn" onclick="applyFT()">Aplicar</button>
        <button class="filter-clear" onclick="clearFT()">Limpiar</button>
        <span class="filter-period-tag">${periodo()}</span>
      </div>
      <div class="kpi-row">
        <div class="ckpi" style="--ck-color:var(--ink)"><div class="lbl">General 2026${esMes?'':' (YTD)'}</div><div class="val">${Math.round(g26/1000)}<span style="font-size:15px">k kg</span></div><div class="sub">${conDato.length} mes${conDato.length===1?'':'es'}</div></div>
        <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">Promedio mensual</div><div class="val">${Math.round(prom26/1000)}<span style="font-size:15px">k</span></div><div class="sub">kg / mes</div></div>
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">FIS 2026</div><div class="val">${Math.round(pctFis)}%</div><div class="sub">${Math.round(f26/1000)}k kg del general</div></div>
        <div class="ckpi" style="--ck-color:${varGen>=0?'var(--green)':'var(--red)'}"><div class="lbl">General vs 2025</div><div class="val">${varGen>=0?'+':''}${varGen.toFixed(1)}%</div><div class="sub">${Math.round(g25/1000)}k kg en 2025</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-box full"><div class="chart-title">General vs FIS 2026 por mes <span class="chart-badge">kilos</span></div><div style="position:relative;width:100%;height:280px"><canvas id="ft-genfis"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Comparativo General anual <span class="chart-badge">2024–2026</span></div><div style="position:relative;width:100%;height:240px"><canvas id="ft-anual"></canvas></div></div>
      </div>
      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Detalle mensual · Fieltro (kg)</span><span class="meta">${D.length} mes${D.length===1?'':'es'}</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Mes</th><th class="num">2024 Gral</th><th class="num">2024 FIS</th><th class="num">2025 Gral</th><th class="num">2025 FIS</th><th class="num">2026 Gral</th><th class="num">2026 FIS</th><th class="num">% FIS 26</th></tr></thead>
          <tbody>${D.map(r => `<tr>
            <td style="font-weight:600">${r.mes}</td>
            <td class="num">${kg(r.g2024)}</td><td class="num">${kg(r.f2024)}</td>
            <td class="num">${kg(r.g2025)}</td><td class="num">${kg(r.f2025)}</td>
            <td class="num" style="font-weight:700">${kg(r.g2026)}</td><td class="num"><span class="pill pill-teal">${kg(r.f2026)}</span></td>
            <td class="num">${r.g2026?Math.round(r.f2026/r.g2026*100)+'%':'—'}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td>TOTAL</td><td class="num">${kg(g24)}</td><td class="num"></td><td class="num">${kg(g25)}</td><td class="num"></td><td class="num">${kg(g26)}</td><td class="num">${kg(f26)}</td><td class="num">${Math.round(pctFis)}%</td></tr></tfoot>
        </table></div>
      </div>`;

    setTimeout(() => {
      const gc='rgba(0,0,0,0.05)', tc='#9A7078', mf='JetBrains Mono';
      const lbl = D.map(r => r.mes.substring(0,3));
      const kFmt = v => Math.round(v/1000)+'k';

      DC('ft-genfis');
      CI['ft-genfis'] = new Chart(document.getElementById('ft-genfis'), {
        type:'bar', data:{ labels: lbl, datasets:[
          { label:'General', data:D.map(r=>r.g2026), backgroundColor:'rgba(26,58,112,0.85)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
          { label:'FIS', data:D.map(r=>r.f2026), backgroundColor:'rgba(26,158,130,0.85)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
        ]},
        options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:16}}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${Math.round(c.parsed.y).toLocaleString('es-MX')} kg`}}, datalabels:{display:false} },
          scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:10,family:mf},callback:kFmt},border:{color:'transparent'},beginAtZero:true} } }
      });

      DC('ft-anual');
      CI['ft-anual'] = new Chart(document.getElementById('ft-anual'), {
        type:'line', data:{ labels: lbl, datasets:[
          { label:'2024', data:D.map(r=>r.g2024), borderColor:'rgba(59,130,246,0.8)', borderWidth:1.8, pointRadius:3, tension:0.35, datalabels:{display:false} },
          { label:'2025', data:D.map(r=>r.g2025), borderColor:'rgba(251,191,36,0.9)', borderWidth:1.8, pointRadius:3, tension:0.35, datalabels:{display:false} },
          { label:'2026', data:D.map(r=>r.g2026), borderColor:'#C0152A', backgroundColor:'rgba(192,21,42,0.07)', borderWidth:2.5, pointRadius:4, pointBackgroundColor:'#C0152A', fill:true, tension:0.35, datalabels:{display:false} },
        ]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${Math.round(c.parsed.y).toLocaleString('es-MX')} kg`}}, datalabels:{display:false} },
          scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf}},border:{color:'transparent'}}, y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:kFmt},border:{color:'transparent'}} } }
      });
    }, 60);
  }

  window.applyFT = () => { filtroMes = document.getElementById('ft-mes').value; ['ft-genfis','ft-anual'].forEach(DC); render(); };
  window.clearFT = () => { filtroMes = 'todos'; ['ft-genfis','ft-anual'].forEach(DC); render(); };
  render();
}
