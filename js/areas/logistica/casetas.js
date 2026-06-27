/**
 * casetas.js — Módulo Gastos de Casetas
 * Depende de: config.js, utils.js, slideshow.js
 */

/* ══════════════════════════
   CARGA DE DATOS
══════════════════════════ */
async function loadCasetasMensual() {
  try {
    const res = await fetch(CASETAS_MENSUAL_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('Recibido HTML — URL no es CSV público');
    const lineas = txt.trim().split('\n').filter(l => l.trim());
    if (lineas.length < 2) throw new Error('CSV vacío');

    function parseLine(line) {
      const vals = []; let cur = '', inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') { inQ = !inQ; }
        else if (c === ',' && !inQ) { vals.push(cur.trim().replace(/^"|"$/g,'').replace(/\r/g,'')); cur = ''; }
        else cur += c;
      }
      vals.push(cur.trim().replace(/^"|"$/g,'').replace(/\r/g,'')); return vals;
    }

    const hdr = parseLine(lineas[0]); const totalCols = hdr.length;
    const primeraFila = parseLine(lineas[1] || '');
    const MESES_VALIDOS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    let iMes = 1;
    for (let i = 0; i < primeraFila.length; i++) {
      if (MESES_VALIDOS.includes((primeraFila[i] || '').trim().toUpperCase())) { iMes = i; break; }
    }
    const iC23 = iMes+1, iC24 = iMes+2, iC25 = iMes+3, iC26 = iMes+4, iEst = totalCols-1;
    const debug = { headers: hdr.join(' | '), mesFila1: primeraFila.join(' | '), valoresFila1: `iMes=${iMes} iC23=${iC23} iC24=${iC24} iC25=${iC25} iC26=${iC26} iEst=${iEst} totalCols=${totalCols}` };

    const rows = lineas.slice(1).map(linea => {
      const v = parseLine(linea);
      const mes = (v[iMes] || '').trim().toUpperCase().replace(/[^A-ZÁÉÍÓÚ]/g,'');
      if (!MESES_VALIDOS.includes(mes)) return null;
      const c23 = parseMoney(v[iC23]||'0'), c24 = parseMoney(v[iC24]||'0'),
            c25 = parseMoney(v[iC25]||'0'), c26 = parseMoney(v[iC26]||'0');
      const estatus = v[iEst] && /ahorro/i.test(v[iEst]) ? 'Ahorro'
                    : v[iEst] && /gasto/i.test(v[iEst])  ? 'Gasto'
                    : (c26 > 0 && c26 < c25 ? 'Ahorro' : c26 > 0 && c26 >= c25 ? 'Gasto' : 'Sin dato');
      return { mes, c23, c24, c25, c26, dif2324: c24-c23, dif2425: c25-c24, dif2526: c26-c25, estatus };
    }).filter(Boolean);

    if (!rows.length) throw new Error('Ningún mes válido leído. Primera fila datos: ' + primeraFila.join(' | '));
    return { rows, error: null, debug };
  } catch(e) { return { rows: [], error: e.message, debug: null }; }
}

async function loadCasetasComparativo() {
  try {
    const res = await fetch(CASETAS_COMPARATIVO_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('Recibido HTML — URL no es CSV público');
    const raw = parseCSV(txt);
    if (!raw.length) throw new Error('CSV vacío o sin filas');
    const headersList = Object.keys(raw[0] || {});
    const debug = { headers: headersList.join(' | '), unidadFila1: Object.values(raw[0] || {}).slice(0,6).join(' / ') };
    const MESES_VALIDOS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    let ord = 0;
    const rows = raw.map(r => {
      const get = makeGet(r);
      const mes    = (get('Mes','MES','mes') || '').toString().trim().toUpperCase();
      const unidad = (get('Unidad','UNIDAD','unidad') || '').toString().trim().toUpperCase();
      if (!MESES_VALIDOS.includes(mes) || !unidad || unidad.length < 1) return null;
      const tipo = (get('Tipo de unidad','tipo','Tipo') || '').toString().trim();
      const c24  = parseMoney(get('caseta 2024','casetas 2024','2024'));
      const c25  = parseMoney(get('casetas 2025','caseta 2025','2025'));
      const c26  = parseMoney(get('caseta 2026','casetas 2026','2026'));
      const dif  = parseMoney(get('Diferencia','diferencia'));
      const pres = parseMoney(get('Presupuesto','presupuesto'));
      const estatus = parseEstatus(get('Estatus','estatus'));
      ord++; return { ord, mes, unidad, tipo, c24, c25, c26, dif, estatus, pres };
    }).filter(Boolean);
    if (!rows.length) throw new Error('Ninguna fila válida. Encabezados: ' + headersList.join(' | '));
    return { rows, error: null, debug };
  } catch(e) { return { rows: [], error: e.message, debug: null }; }
}

/* ══════════════════════════
   RENDER PRINCIPAL
══════════════════════════ */
async function renderCasetas(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Cargando datos de casetas…</div>`;
  const [{ rows: mensual, error: e1, debug: d1 }, { rows: comparativo, error: e2, debug: d2 }] =
    await Promise.all([loadCasetasMensual(), loadCasetasComparativo()]);

  const sinDatosMensual = !mensual.length || !mensual.some(r => r.c23 > 0 || r.c24 > 0 || r.c25 > 0 || r.c26 > 0);
  const sinDatosComp    = !comparativo.length;

  if (e1 || e2 || sinDatosMensual || sinDatosComp) {
    container.innerHTML = `<div style="max-width:680px;margin:0 auto;padding:2rem">
      <div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:1.25rem">⚠ Diagnóstico de conexión — Casetas</div>
      <div style="background:var(--off);border:1px solid ${e1||sinDatosMensual?'var(--red)':'rgba(26,158,92,0.3)'};border-radius:10px;padding:1rem;margin-bottom:1rem;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2">
        <b>📋 HOJA MENSUAL</b><br>Estado: <span style="color:${e1?'var(--red)':sinDatosMensual?'var(--amber)':'var(--green)'}">${e1?'❌ ERROR':sinDatosMensual?'⚠ CONECTADA PERO VALORES EN 0':'✓ OK'}</span><br>
        ${e1?`Error: <b style="color:var(--red)">${e1}</b><br>`:''}Filas: <b>${mensual.length}</b><br>
        ${d1?`Encabezados: <span style="color:var(--blue);word-break:break-all">${d1.headers}</span><br>Posiciones: <span style="color:var(--amber)">${d1.valoresFila1}</span>`:''}
      </div>
      <div style="background:var(--off);border:1px solid ${e2?'var(--red)':'rgba(26,158,92,0.3)'};border-radius:10px;padding:1rem;margin-bottom:1rem;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2">
        <b>📋 HOJA COMPARATIVO</b><br>Estado: <span style="color:${e2?'var(--red)':'var(--green)'}">${e2?'❌ ERROR':'✓ OK'}</span><br>
        ${e2?`Error: <b style="color:var(--red)">${e2}</b><br>`:''}Filas: <b>${comparativo.length}</b><br>
        ${d2?`Encabezados: <span style="color:var(--blue);word-break:break-all">${d2.headers}</span>`:''}
      </div>
      <button id="btn-reintentar-casetas" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif">🔄 Reintentar</button>
    </div>`;
    document.getElementById('btn-reintentar-casetas').onclick = () => renderCasetas(container);
    return;
  }

  container.innerHTML = `
    <div class="submod-tabs">
      <button class="submod-tab active" onclick="switchCasetasTab('anual',this)">📊 Comparativo Anual</button>
      <button class="submod-tab" onclick="switchCasetasTab('unidad',this)">🚛 Detalle por Unidad</button>
    </div>
    <div id="ct-panel-anual" class="submod-panel active"></div>
    <div id="ct-panel-unidad" class="submod-panel"></div>`;

  window._casetasMensual    = mensual;
  window._casetasComparativo = comparativo;
  renderCasetasAnual(document.getElementById('ct-panel-anual'), mensual);

  window.switchCasetasTab = function(id, btn) {
    document.querySelectorAll('#detail-body .submod-tab').forEach(t => t.classList.remove('active'));
    ['anual','unidad'].forEach(p => { const el = document.getElementById('ct-panel-' + p); if (el) el.classList.remove('active'); });
    btn.classList.add('active');
    const panel = document.getElementById('ct-panel-' + id); panel.classList.add('active');
    if (!panel.innerHTML.trim() && id === 'unidad') renderCasetasUnidad(panel, comparativo);
  };

  if (window._timerCasetas) clearInterval(window._timerCasetas);
  window._timerCasetas = setInterval(() => renderCasetas(container), 5 * 60 * 1000);
}

/* ══════════════════════════
   TAB: COMPARATIVO ANUAL
══════════════════════════ */
function renderCasetasAnual(container, CM) {
  if (!CM || !CM.length) { container.innerHTML = `<div class="loading-state">Sin datos.</div>`; return; }
  const mesesCon26  = CM.filter(r => r.c26 > 0).length;
  const ahorroCount = CM.filter(r => r.c26 > 0 && r.c26 < r.c25).length;
  let filtroMes = 'todos';

  function filtrar() { return filtroMes === 'todos' ? CM : CM.filter(r => r.mes === filtroMes); }

  function render() {
    const data = filtrar();
    const ft23 = data.reduce((s,r) => s+r.c23, 0), ft24 = data.reduce((s,r) => s+r.c24, 0),
          ft25 = data.reduce((s,r) => s+r.c25, 0), ft26 = data.reduce((s,r) => s+r.c26, 0);
    const difData = data.filter(r => r.c26 > 0);

    container.innerHTML = `
      <div class="banner ok">✓ Google Sheets conectado · ${CM.length} meses · Comparativa 2023–2026 · Auto-refresco cada 5 min</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span>
          <select class="filter-select" id="ca-mes">
            <option value="todos">Todos los meses</option>
            ${CM.map(r => `<option value="${r.mes}"${filtroMes===r.mes?' selected':''}>${r.mes.charAt(0)+r.mes.slice(1).toLowerCase()}</option>`).join('')}
          </select>
        </div>
        <button class="filter-btn" onclick="applyFiltroAnual()">Aplicar</button>
        <button class="filter-clear" onclick="clearFiltroAnual()">Limpiar</button>
        <span class="filter-period-tag">${filtroMes==='todos'?'Acumulado anual':filtroMes.charAt(0)+filtroMes.slice(1).toLowerCase()}</span>
        <button class="btn-presentar" onclick="abrirSlideshowCasetas()" style="margin-left:auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Presentar
        </button>
      </div>
      <div class="casetas-summary-grid">
        <div class="cs-card" style="--cs-c:#6B7280"><div class="lbl">Casetas 2023</div><div class="val">$${ft23.toLocaleString('es-MX')}</div><div class="sub">Año base</div></div>
        <div class="cs-card" style="--cs-c:var(--blue)"><div class="lbl">Casetas 2024</div><div class="val">$${ft24.toLocaleString('es-MX')}</div><div class="sub">Dif vs 2023: ${fmtDif(ft24-ft23)}</div></div>
        <div class="cs-card" style="--cs-c:var(--amber)"><div class="lbl">Casetas 2025</div><div class="val">$${ft25.toLocaleString('es-MX')}</div><div class="sub">Dif vs 2024: ${fmtDif(ft25-ft24)}</div></div>
        <div class="cs-card" style="--cs-c:var(--red)"><div class="lbl">Casetas 2026</div><div class="val">$${ft26.toLocaleString('es-MX')}</div><div class="sub">Dif vs 2025: ${fmtDif(ft26-ft25)}</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-box full"><div class="chart-title">Comparativo de Gastos por Mes <span class="chart-badge">2023–2026</span></div><div style="position:relative;width:100%;height:320px"><canvas id="ca-bar-comp"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Tendencia anual <span class="chart-badge">líneas</span></div><div style="position:relative;width:100%;height:260px"><canvas id="ca-line-trend"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Diferencia 2025 vs 2026 <span class="chart-badge">ahorro/gasto</span></div><div style="position:relative;width:100%;height:260px"><canvas id="ca-bar-dif"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Comparativo 2025 vs 2026 <span class="chart-badge">${mesesCon26} meses</span></div><div style="position:relative;width:100%;height:260px"><canvas id="ca-dona-estatus"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">% Variación 2025→2026</div><div style="position:relative;width:100%;height:260px"><canvas id="ca-pct-var"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Gasto de casetas acumulado a la fecha <span class="chart-badge">2023–2026</span></div><div style="position:relative;width:100%;height:300px"><canvas id="ca-acum"></canvas></div></div>
      </div>
      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Informe General · Comparativa Anual</span><span class="meta">${data.length} meses</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>#</th><th>Mes</th><th class="num">Casetas 2023</th><th class="num">Casetas 2024</th><th class="num">Casetas 2025</th><th class="num">Casetas 2026</th><th class="num">Dif 23→24</th><th class="num">Dif 24→25</th><th class="num">Dif 25→26</th><th class="center">Estatus</th></tr></thead>
          <tbody>${data.map((r,i) => `<tr>
            <td style="color:var(--ink3);font-size:12px">${i+1}</td>
            <td style="font-weight:600">${r.mes.charAt(0)+r.mes.slice(1).toLowerCase()}</td>
            <td class="num">$${r.c23.toLocaleString('es-MX')}</td>
            <td class="num">$${r.c24.toLocaleString('es-MX')}</td>
            <td class="num">$${r.c25.toLocaleString('es-MX')}</td>
            <td class="num">${r.c26>0?'$'+r.c26.toLocaleString('es-MX'):'<span style="color:var(--ink3)">—</span>'}</td>
            <td class="num">${fmtDif(r.dif2324)}</td>
            <td class="num">${fmtDif(r.dif2425)}</td>
            <td class="num">${r.c26>0?fmtDif(r.dif2526):'<span style="color:var(--ink3)">—</span>'}</td>
            <td class="center">${(()=>{if(!r.c26||r.c26===0)return'<span style="color:var(--ink3)">—</span>';const esAhorro=r.c26<r.c25;return`<span class="estatus-pill ${esAhorro?'estatus-ahorro':'estatus-gasto'}">${esAhorro?'Ahorro':'Gasto'}</span>`;})()}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">TOTALES</td><td class="num">$${ft23.toLocaleString('es-MX')}</td><td class="num">$${ft24.toLocaleString('es-MX')}</td><td class="num">$${ft25.toLocaleString('es-MX')}</td><td class="num">$${ft26.toLocaleString('es-MX')}</td><td class="num">${fmtDif(ft24-ft23)}</td><td class="num">${fmtDif(ft25-ft24)}</td><td class="num">${fmtDif(ft26-ft25)}</td><td class="center">${ahorroCount}/${mesesCon26} Ahorro</td></tr></tfoot>
        </table></div>
      </div>`;

    window.applyFiltroAnual = () => { filtroMes = document.getElementById('ca-mes').value; ['ca-bar-comp','ca-line-trend','ca-bar-dif','ca-dona-estatus','ca-pct-var','ca-acum'].forEach(DC); render(); };
    window.clearFiltroAnual = () => { filtroMes = 'todos'; ['ca-bar-comp','ca-line-trend','ca-bar-dif','ca-dona-estatus','ca-pct-var','ca-acum'].forEach(DC); render(); };
    window._ssDataCasetas   = data;
    window._ssPeriodoCasetas = filtroMes === 'todos' ? 'Acumulado anual' : filtroMes.charAt(0)+filtroMes.slice(1).toLowerCase();

    setTimeout(() => {
      const gc = 'rgba(0,0,0,0.05)', tc = '#9A7078', mf = 'JetBrains Mono';
      const labels = data.map(r => r.mes.substring(0,3));
      const C23 = 'rgba(148,163,184,0.5)', C24 = 'rgba(59,130,246,0.7)', C25 = 'rgba(251,191,36,0.75)';
      const allVals = [...data.map(r=>r.c23),...data.map(r=>r.c24),...data.map(r=>r.c25),...data.map(r=>r.c26)].filter(v=>v>0);
      const yMax = allVals.length ? Math.ceil(Math.max(...allVals)*1.25) : 300000;
      const yFmt = v => { if(v===0)return'$0'; const abs=Math.abs(v); if(abs>=1000000)return'$'+Math.round(abs/1000000)+'M'; if(abs>=1000)return'$'+Math.round(abs/1000)+'k'; return'$'+abs; };

      DC('ca-bar-comp');
      CI['ca-bar-comp'] = new Chart(document.getElementById('ca-bar-comp'), {type:'bar',data:{labels,datasets:[
        {label:'2023',data:data.map(r=>r.c23),backgroundColor:C23,borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(107,114,128,0.8)',font:{size:8,family:mf,weight:'600'},formatter:v=>v>0?'$'+Math.round(v/1000)+'k':''}},
        {label:'2024',data:data.map(r=>r.c24),backgroundColor:C24,borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(59,130,246,0.9)',font:{size:8,family:mf,weight:'600'},formatter:v=>v>0?'$'+Math.round(v/1000)+'k':''}},
        {label:'2025',data:data.map(r=>r.c25),backgroundColor:C25,borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(251,191,36,0.95)',font:{size:8,family:mf,weight:'600'},formatter:v=>v>0?'$'+Math.round(v/1000)+'k':''}},
        {label:'2026',data:data.map(r=>r.c26>0?r.c26:null),backgroundColor:data.map(r=>r.dif2526<0?'rgba(34,197,94,0.82)':'rgba(239,68,68,0.82)'),borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:data.map(r=>r.dif2526<0?'#15803d':'#b91c1c'),font:{size:8,family:mf,weight:'700'},formatter:v=>v!=null?'$'+Math.round(v/1000)+'k':''}}
      ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,pointStyleWidth:14,padding:18}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${(c.parsed.y||0).toLocaleString('es-MX')}`}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:11},callback:yFmt},border:{color:'transparent'},beginAtZero:true,max:yMax}}}});

      DC('ca-line-trend');
      CI['ca-line-trend'] = new Chart(document.getElementById('ca-line-trend'), {type:'line',data:{labels,datasets:[
        {label:'2023',data:data.map(r=>r.c23),borderColor:'rgba(148,163,184,0.55)',backgroundColor:'transparent',borderWidth:1.5,pointRadius:3,tension:0.35,datalabels:{display:false}},
        {label:'2024',data:data.map(r=>r.c24),borderColor:'rgba(59,130,246,0.8)',backgroundColor:'transparent',borderWidth:2,pointRadius:3,tension:0.35,datalabels:{display:false}},
        {label:'2025',data:data.map(r=>r.c25),borderColor:'rgba(251,191,36,0.9)',backgroundColor:'transparent',borderWidth:2,pointRadius:3,tension:0.35,datalabels:{display:false}},
        {label:'2026',data:data.map(r=>r.c26>0?r.c26:null),borderColor:'#22c55e',backgroundColor:'rgba(34,197,94,0.07)',borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#22c55e',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:0.35,datalabels:{display:true,anchor:'end',align:'top',offset:4,color:'#15803d',font:{size:9,family:mf,weight:'700'},formatter:v=>v?'$'+Math.round(v/1000)+'k':''}}
      ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${(c.parsed.y||0).toLocaleString('es-MX')}`}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:yFmt},border:{color:'transparent'},beginAtZero:true,max:yMax}}}});

      const difVals = difData.map(r => Math.abs(r.dif2526)).filter(v => v > 0);
      const difMax  = difVals.length ? Math.ceil(Math.max(...difVals)*1.35) : 50000;
      DC('ca-bar-dif');
      CI['ca-bar-dif'] = new Chart(document.getElementById('ca-bar-dif'), {type:'bar',data:{labels:difData.map(r=>r.mes.substring(0,3)),datasets:[{label:'Diferencia 2025→2026',data:difData.map(r=>r.dif2526),backgroundColor:difData.map(r=>r.dif2526>0?'rgba(239,68,68,0.78)':'rgba(34,197,94,0.78)'),borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',offset:3,color:difData.map(r=>r.dif2526>0?'#b91c1c':'#15803d'),font:{size:10,family:mf,weight:'700'},formatter:v=>(v>0?'▲ +':'▼ ')+'$'+Math.abs(Math.round(v/1000))+'k'}}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.parsed.y>0?'Gasto extra':'Ahorro'}: $${Math.abs(c.parsed.y).toLocaleString('es-MX')}`}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:yFmt},border:{color:'transparent'},max:difMax,min:-difMax}}}});

      const conDato = data.filter(r => r.c26 > 0);
      DC('ca-dona-estatus');
      CI['ca-dona-estatus'] = new Chart(document.getElementById('ca-dona-estatus'), {type:'bar',data:{labels:conDato.map(r=>r.mes.substring(0,3)),datasets:[
        {label:'2025',data:conDato.map(r=>r.c25),backgroundColor:'rgba(251,191,36,0.72)',borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(180,130,0,0.9)',font:{size:8,family:mf,weight:'600'},formatter:v=>'$'+Math.round(v/1000)+'k'}},
        {label:'2026',data:conDato.map(r=>r.c26),backgroundColor:conDato.map(r=>r.dif2526<0?'rgba(34,197,94,0.82)':'rgba(239,68,68,0.82)'),borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:conDato.map(r=>r.dif2526<0?'#15803d':'#b91c1c'),font:{size:8,family:mf,weight:'700'},formatter:(v,ctx)=>{const r=conDato[ctx.dataIndex];const pct=r.c25>0?((r.dif2526/r.c25)*100).toFixed(0):0;return'$'+Math.round(v/1000)+'k\n'+(pct>0?'+':'')+pct+'%';}}}
      ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${c.parsed.y.toLocaleString('es-MX')}`,afterBody:items=>{const r=conDato[items[0]?.dataIndex];if(!r)return[];const pct=r.c25>0?((r.dif2526/r.c25)*100).toFixed(1):0;return[`Variación: ${pct>0?'+':''}${pct}% ($${Math.abs(r.dif2526).toLocaleString('es-MX')})`];}}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:yFmt},border:{color:'transparent'},beginAtZero:true,max:Math.ceil(Math.max(...conDato.map(r=>Math.max(r.c25,r.c26)))*1.3)||100000}}}});

      const pctVals = difData.map(r=>r.c25>0?Math.abs((r.dif2526/r.c25)*100):0).filter(v=>v>0);
      const pctMax  = pctVals.length ? Math.ceil(Math.max(...pctVals)*1.4) : 50;
      DC('ca-pct-var');
      CI['ca-pct-var'] = new Chart(document.getElementById('ca-pct-var'), {type:'bar',data:{labels:difData.map(r=>r.mes.substring(0,3)),datasets:[{label:'% vs 2025',data:difData.map(r=>r.c25>0?+((r.dif2526/r.c25)*100).toFixed(1):0),backgroundColor:difData.map(r=>r.dif2526>0?'rgba(239,68,68,0.75)':'rgba(34,197,94,0.75)'),borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',offset:3,color:difData.map(r=>r.dif2526>0?'#b91c1c':'#15803d'),font:{size:10,family:mf,weight:'700'},formatter:v=>(v>0?'+':'')+v+'%'}}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>v+'%'},border:{color:'transparent'},max:pctMax,min:-pctMax}}}});

      /* GASTO ACUMULADO POR MES (corrida anual) */
      const acumC = key => { const v=data.map(r=>r[key]||0); let last=-1; v.forEach((x,i)=>{if(x>0)last=i;}); let s=0; return v.map((x,i)=>i<=last?(s+=x):null); };
      DC('ca-acum');
      CI['ca-acum'] = new Chart(document.getElementById('ca-acum'), {type:'line',data:{labels,datasets:[
        {label:'2023',data:acumC('c23'),borderColor:'rgba(148,163,184,0.75)',backgroundColor:'transparent',borderWidth:1.8,borderDash:[4,3],pointRadius:2.5,tension:0.3,datalabels:{display:false}},
        {label:'2024',data:acumC('c24'),borderColor:'rgba(59,130,246,0.8)',backgroundColor:'transparent',borderWidth:1.8,borderDash:[4,3],pointRadius:2.5,tension:0.3,datalabels:{display:false}},
        {label:'2025',data:acumC('c25'),borderColor:'rgba(251,191,36,0.9)',backgroundColor:'transparent',borderWidth:1.8,borderDash:[4,3],pointRadius:2.5,tension:0.3,datalabels:{display:false}},
        {label:'2026',data:acumC('c26'),borderColor:'#C0152A',backgroundColor:'rgba(192,21,42,0.07)',borderWidth:2.6,pointRadius:3,fill:true,tension:0.3,datalabels:{display:false}},
      ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${(c.parsed.y||0).toLocaleString('es-MX')}`}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:yFmt},border:{color:'transparent'},beginAtZero:true}}}});
    }, 80);
  }
  render();
}

/* ══════════════════════════
   TAB: DETALLE POR UNIDAD
══════════════════════════ */
function renderCasetasUnidad(container, CC) {
  if (!CC || !CC.length) { container.innerHTML = `<div class="loading-state">Sin datos.</div>`; return; }
  let filtroMes = 'ENERO', filtroTipo = 'todos', filtroEstatus = 'todos';
  const mesesDisp = [...new Set(CC.map(r => r.mes))];
  const tiposDisp = [...new Set(CC.map(r => r.tipo))];

  function tipoBadge(t) { const cl = t==='Camioneta'?'badge-camioneta':t==='Camión'?'badge-camion':'badge-quinta'; return `<span class="${cl}">${t}</span>`; }
  function filtrar() { return CC.filter(r=>filtroMes==='todos'||r.mes===filtroMes).filter(r=>filtroTipo==='todos'||r.tipo===filtroTipo).filter(r=>filtroEstatus==='todos'||r.estatus===filtroEstatus).sort((a,b)=>a.ord-b.ord); }

  function render() {
    const data = filtrar();
    const tot24 = data.reduce((s,r)=>s+r.c24,0), tot25 = data.reduce((s,r)=>s+r.c25,0),
          tot26 = data.reduce((s,r)=>s+r.c26,0), totDif = tot26-tot25;
    const maxC26 = Math.max(...data.map(r=>r.c26), 1);
    const porTipo = {}; data.forEach(r => { porTipo[r.tipo] = (porTipo[r.tipo] || 0) + r.c26; });
    const tiposKeys  = Object.keys(porTipo);
    const gastosTop  = [...data].filter(r=>r.c26>0).sort((a,b)=>b.c26-a.c26).slice(0,8);

    container.innerHTML = `
      <div class="banner ok">✓ Google Sheets conectado · ${data.length} unidades · Comparativa 2024–2026</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span><select class="filter-select" id="cu-mes">${mesesDisp.map(m=>`<option value="${m}"${filtroMes===m?' selected':''}>${m.charAt(0)+m.slice(1).toLowerCase()}</option>`).join('')}</select></div>
        <div class="filter-group"><span class="filter-label">Tipo unidad</span><select class="filter-select" id="cu-tipo"><option value="todos">Todos</option>${tiposDisp.map(t=>`<option value="${t}"${filtroTipo===t?' selected':''}>${t}</option>`).join('')}</select></div>
        <div class="filter-group"><span class="filter-label">Estatus</span><select class="filter-select" id="cu-est"><option value="todos">Todos</option><option value="Ahorro"${filtroEstatus==='Ahorro'?' selected':''}>Ahorro</option><option value="Gasto"${filtroEstatus==='Gasto'?' selected':''}>Gasto</option></select></div>
        <button class="filter-btn" onclick="applyFiltroUnidad()">Aplicar</button>
        <button class="filter-clear" onclick="clearFiltroUnidad()">Limpiar</button>
        <span class="filter-period-tag">${filtroMes==='todos'?'Todos':filtroMes.charAt(0)+filtroMes.slice(1).toLowerCase()} · ${filtroTipo==='todos'?'Todas':filtroTipo}</span>
      </div>
      <div class="casetas-summary-grid">
        <div class="cs-card" style="--cs-c:var(--blue)"><div class="lbl">Caseta 2024</div><div class="val">$${tot24.toLocaleString('es-MX')}</div><div class="sub">${data.length} unidades</div></div>
        <div class="cs-card" style="--cs-c:var(--amber)"><div class="lbl">Casetas 2025</div><div class="val">$${tot25.toLocaleString('es-MX')}</div><div class="sub">Dif vs 2024: ${fmtDif(tot25-tot24)}</div></div>
        <div class="cs-card" style="--cs-c:var(--red)"><div class="lbl">Caseta 2026</div><div class="val">$${tot26.toLocaleString('es-MX')}</div><div class="sub">Dif vs 2025: ${fmtDif(totDif)}</div></div>
        <div class="cs-card" style="--cs-c:var(--green)"><div class="lbl">Diferencia total</div><div class="val" style="color:${totDif>0?'var(--red)':'var(--green)'}">${totDif>0?'+':''}$${Math.abs(totDif).toLocaleString('es-MX')}</div><div class="sub">${totDif<=0?'✓ Ahorro':'⚠ Sobre presupuesto'}</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-box"><div class="chart-title">Top gasto 2026 <span class="chart-badge">Top ${gastosTop.length}</span></div><div style="position:relative;width:100%;height:280px"><canvas id="cu-bar-top"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Por tipo unidad <span class="chart-badge">2026</span></div><div style="position:relative;width:100%;height:280px"><canvas id="cu-dona-tipo"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Comparativo 2024/2025/2026 por unidad</div><div style="position:relative;width:100%;overflow-x:auto"><canvas id="cu-bar-comp" style="height:300px"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Diferencia 2025 vs 2026 por unidad</div><div style="position:relative;width:100%;height:280px"><canvas id="cu-bar-dif"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Estatus ahorro/gasto <span class="chart-badge">${data.length} unidades</span></div><div style="position:relative;width:100%;height:280px"><canvas id="cu-dona-est"></canvas></div></div>
      </div>
      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Detalle por Unidad</span><span class="meta">${data.length} registros</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>#</th><th>Mes</th><th>Tipo</th><th>Unidad</th><th class="num">2024</th><th class="num">2025</th><th class="num">2026</th><th class="num">Diferencia</th><th class="num">Presupuesto</th><th class="center">Estatus</th></tr></thead>
          <tbody>${data.map((r,i) => `<tr>
            <td style="color:var(--ink3);font-size:12px">${i+1}</td>
            <td style="font-size:12px;color:var(--ink3)">${r.mes.charAt(0)+r.mes.slice(1).toLowerCase()}</td>
            <td>${tipoBadge(r.tipo)}</td>
            <td style="font-weight:700;font-family:'JetBrains Mono',monospace">${r.unidad}</td>
            <td class="num">$${r.c24.toLocaleString('es-MX')}</td>
            <td class="num">$${r.c25.toLocaleString('es-MX')}</td>
            <td class="num"><div class="minibar-wrap" style="justify-content:flex-end"><div class="minibar-track"><div class="minibar-fill total" style="width:${Math.round(r.c26/maxC26*100)}%;background:${r.estatus==='Gasto'?'rgba(192,21,42,0.6)':'rgba(26,158,92,0.6)'}"></div></div><span class="minibar-val">$${r.c26.toLocaleString('es-MX')}</span></div></td>
            <td class="num">${fmtDif(r.dif)}</td>
            <td class="num"><span class="pill pill-amber">$${Math.round(r.pres).toLocaleString('es-MX')}</span></td>
            <td class="center"><span class="estatus-pill estatus-${r.estatus.toLowerCase()}">${r.estatus}</span></td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="4">TOTALES</td><td class="num">$${tot24.toLocaleString('es-MX')}</td><td class="num">$${tot25.toLocaleString('es-MX')}</td><td class="num">$${tot26.toLocaleString('es-MX')}</td><td class="num">${fmtDif(totDif)}</td><td class="num">$${Math.round(data.reduce((s,r)=>s+r.pres,0)).toLocaleString('es-MX')}</td><td class="center">${data.filter(r=>r.estatus==='Ahorro').length}/${data.length} Ahorro</td></tr></tfoot>
        </table></div>
      </div>`;

    window.applyFiltroUnidad = () => { filtroMes=document.getElementById('cu-mes').value; filtroTipo=document.getElementById('cu-tipo').value; filtroEstatus=document.getElementById('cu-est').value; ['cu-bar-top','cu-dona-tipo','cu-bar-comp','cu-bar-dif','cu-dona-est'].forEach(DC); render(); };
    window.clearFiltroUnidad = () => { filtroMes='ENERO'; filtroTipo='todos'; filtroEstatus='todos'; ['cu-bar-top','cu-dona-tipo','cu-bar-comp','cu-bar-dif','cu-dona-est'].forEach(DC); render(); };

    setTimeout(() => {
      const gc='rgba(0,0,0,0.05)',tc='#9A7078',mf='JetBrains Mono';
      const tipoColors = {'Camioneta':'rgba(26,158,130,0.82)','Camión':'rgba(26,95,160,0.82)','Quinta':'rgba(184,122,16,0.82)'};
      DC('cu-bar-top'); CI['cu-bar-top']=new Chart(document.getElementById('cu-bar-top'),{type:'bar',data:{labels:gastosTop.map(r=>r.unidad),datasets:[{label:'2025',data:gastosTop.map(r=>r.c25),backgroundColor:'rgba(184,122,16,0.6)',borderRadius:3,borderSkipped:false,datalabels:{display:false}},{label:'2026',data:gastosTop.map(r=>r.c26),backgroundColor:gastosTop.map(r=>r.estatus==='Gasto'?'rgba(192,21,42,0.82)':'rgba(26,158,92,0.82)'),borderRadius:3,borderSkipped:false,datalabels:{anchor:'end',align:'end',offset:1,color:'#5C3038',font:{size:9,family:mf,weight:'700'},formatter:v=>v?'$'+Math.round(v/1000)+'k':''}}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${c.parsed.y.toLocaleString('es-MX')}`}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>'$'+Math.round(v/1000)+'k'},border:{color:'transparent'},beginAtZero:true,grace:'15%'}}}});
      DC('cu-dona-tipo'); CI['cu-dona-tipo']=new Chart(document.getElementById('cu-dona-tipo'),{type:'doughnut',data:{labels:tiposKeys,datasets:[{data:tiposKeys.map(t=>porTipo[t]),backgroundColor:tiposKeys.map(t=>tipoColors[t]||'rgba(150,150,150,0.75)'),borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:14}},tooltip:{callbacks:{label:c=>`${c.label}: $${c.parsed.toLocaleString('es-MX')}`}},datalabels:{color:'#fff',font:{size:11,family:mf,weight:'700'},formatter:(v,ctx)=>{const tot=ctx.dataset.data.reduce((a,b)=>a+b,0);return tot&&v?Math.round(v/tot*100)+'%':''}}}}});
      const wd=data.filter(r=>r.c24||r.c25||r.c26); const cw=Math.max(600,wd.length*58+80);
      DC('cu-bar-comp'); const cc=document.getElementById('cu-bar-comp'); cc.width=cw; cc.style.width=cw+'px';
      CI['cu-bar-comp']=new Chart(cc,{type:'bar',data:{labels:wd.map(r=>r.unidad),datasets:[{label:'2024',data:wd.map(r=>r.c24),backgroundColor:'rgba(107,114,128,0.55)',borderRadius:3,borderSkipped:false,datalabels:{display:false}},{label:'2025',data:wd.map(r=>r.c25),backgroundColor:'rgba(184,122,16,0.65)',borderRadius:3,borderSkipped:false,datalabels:{display:false}},{label:'2026',data:wd.map(r=>r.c26),backgroundColor:wd.map(r=>r.estatus==='Gasto'?'rgba(192,21,42,0.82)':'rgba(26,158,92,0.75)'),borderRadius:3,borderSkipped:false,datalabels:{display:false}}]},options:{responsive:false,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:14}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${c.parsed.y.toLocaleString('es-MX')}`}},datalabels:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf},maxRotation:45,minRotation:45},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>'$'+Math.round(v/1000)+'k'},border:{color:'transparent'},beginAtZero:true}}}});
      const difU=data.filter(r=>r.c26>0);
      DC('cu-bar-dif'); CI['cu-bar-dif']=new Chart(document.getElementById('cu-bar-dif'),{type:'bar',data:{labels:difU.map(r=>r.unidad),datasets:[{label:'Diferencia',data:difU.map(r=>r.dif),backgroundColor:difU.map(r=>r.dif>0?'rgba(192,21,42,0.75)':'rgba(26,158,92,0.75)'),borderRadius:4,borderSkipped:false,datalabels:{anchor:'end',align:'end',offset:1,color:'#5C3038',font:{size:9,family:mf,weight:'600'},formatter:v=>(v>0?'+':'')+('$'+Math.round(Math.abs(v)/1000)+'k')}}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`Dif: $${c.parsed.y.toLocaleString('es-MX')}`}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf},maxRotation:45},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:10},callback:v=>'$'+Math.round(v/1000)+'k'},border:{color:'transparent'},grace:'15%'}}}});
      const aU=data.filter(r=>r.estatus==='Ahorro').length, gU=data.filter(r=>r.estatus==='Gasto').length;
      DC('cu-dona-est'); CI['cu-dona-est']=new Chart(document.getElementById('cu-dona-est'),{type:'doughnut',data:{labels:['Ahorro','Gasto'],datasets:[{data:[aU,gU],backgroundColor:['rgba(26,158,92,0.82)','rgba(192,21,42,0.82)'],borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'65%',plugins:{legend:{position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:14}},tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed}`}},datalabels:{color:'#fff',font:{size:13,family:mf,weight:'700'},formatter:(v,ctx)=>{const t=ctx.dataset.data.reduce((a,b)=>a+b,0);return t?Math.round(v/t*100)+'%':''}}}}});
    }, 80);
  }
  render();
}

/* ══════════════════════════
   SLIDESHOW CASETAS
══════════════════════════ */
function abrirSlideshowCasetas() {
  const CM = window._casetasMensual || [], CC = window._casetasComparativo || [];
  if (!CM.length) { alert('Carga los datos primero desde el módulo de Casetas.'); return; }
  const data      = window._ssDataCasetas || CM;
  const tot23     = data.reduce((s,r)=>s+r.c23,0), tot24=data.reduce((s,r)=>s+r.c24,0);
  const tot25     = data.reduce((s,r)=>s+r.c25,0), tot26=data.reduce((s,r)=>s+r.c26,0);
  const dif2526   = tot26-tot25, dif2425=tot25-tot24;
  const mesesCon26 = data.filter(r=>r.c26>0);
  const ahorros   = mesesCon26.filter(r=>r.estatus==='Ahorro').length;
  const periodo   = window._ssPeriodoCasetas || 'Acumulado anual';
  const pct2526   = tot25>0?((dif2526/tot25)*100).toFixed(1):'—';
  const pct2425   = tot24>0?((dif2425/tot24)*100).toFixed(1):'—';

  ssSlides = [
    `<div class="ss-slide active" id="ss-slide-0"><div class="ss-cover">
      <div class="ss-cover-line"></div>
      <div class="ss-cover-eyebrow">Logística · FIS FIBER</div>
      <div class="ss-cover-title">Gastos de <span>Casetas</span></div>
      <div class="ss-cover-sub">Informe comparativo anual 2023 / 2024 / 2025 / 2026</div>
      <div class="ss-cover-period">📅 ${periodo} · ${new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}</div>
      <div class="ss-cover-line"></div>
    </div></div>`,
    `<div class="ss-slide" id="ss-slide-1">
      <div class="ss-slide-eyebrow">Resumen ejecutivo</div>
      <div class="ss-slide-heading">Gasto acumulado <span>${periodo}</span></div>
      <div class="ss-filtro-badge">🗓 Período: <b>${periodo}</b> · ${data.length} meses · ${mesesCon26.length} con dato 2026</div>
      <div class="ss-kpi-grid">
        <div class="ss-kpi" style="--sskpi-c:rgba(107,114,128,0.9)"><div class="lbl">Casetas 2023</div><div class="val">${ss$(tot23)}</div><div class="sub">Año base</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">Casetas 2024</div><div class="val">${ss$(tot24)}</div><div class="sub">vs 2023</div><div class="trend">${ssTrend(tot24-tot23)}</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">Casetas 2025</div><div class="val">${ss$(tot25)}</div><div class="sub">vs 2024</div><div class="trend">${ssTrend(dif2425)} ${pct2425!=='—'?'('+pct2425+'%)':''}</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(192,21,42,0.9)"><div class="lbl">Casetas 2026</div><div class="val">${ss$(tot26)}</div><div class="sub">vs 2025 · ${mesesCon26.length} meses</div><div class="trend">${ssTrend(dif2526)} ${pct2526!=='—'?'('+pct2526+'%)':''}</div></div>
      </div>
      <div class="ss-two-col">
        <div class="ss-chart-wrap"><div class="ss-chart-title">Comparativo mensual 2023–2026</div><div class="ss-chart-inner"><canvas id="ss-bar-comp"></canvas></div></div>
        <div class="ss-chart-wrap"><div class="ss-chart-title">2025 vs 2026 por mes</div><div class="ss-chart-inner"><canvas id="ss-dona-est"></canvas></div></div>
      </div>
    </div>`,
    `<div class="ss-slide" id="ss-slide-2">
      <div class="ss-slide-eyebrow">Comparativo anual</div>
      <div class="ss-slide-heading">Detalle por <span>mes</span></div>
      <div class="ss-filtro-badge">🗓 <b>${periodo}</b> · ${data.length} meses</div>
      <div class="ss-table-wrap"><table class="ss-table">
        <thead><tr><th>Mes</th><th class="r">2023</th><th class="r">2024</th><th class="r">2025</th><th class="r">2026</th><th class="r">Dif $</th><th class="r">Dif %</th><th>Estatus</th></tr></thead>
        <tbody>${data.map(r=>{const difAmt=r.dif2526;const difPct=r.c25>0?((difAmt/r.c25)*100).toFixed(1)+'%':'—';const color=r.c26>0&&difAmt>0?'#ff8896':r.c26>0?'#4ade80':'rgba(255,255,255,0.2)';return`<tr>
          <td><b>${r.mes.charAt(0)+r.mes.slice(1).toLowerCase()}</b></td>
          <td class="r" style="color:rgba(255,255,255,0.45)">${ss$(r.c23)}</td>
          <td class="r" style="color:rgba(255,255,255,0.55)">${ss$(r.c24)}</td>
          <td class="r" style="color:rgba(255,255,255,0.75)">${ss$(r.c25)}</td>
          <td class="r" style="color:#fff;font-weight:700">${r.c26>0?ss$(r.c26):'—'}</td>
          <td class="r" style="color:${color};font-weight:700">${r.c26>0?(difAmt>0?'▲ ':'▼ ')+ss$(Math.abs(difAmt)):'—'}</td>
          <td class="r" style="color:${color};font-weight:700">${r.c26>0?difPct:'—'}</td>
          <td>${r.c26>0?`<span style="padding:3px 8px;border-radius:20px;font-size:10px;font-weight:700;background:${r.estatus==='Ahorro'?'rgba(26,158,92,0.15)':'rgba(192,21,42,0.15)'};color:${color}">${r.estatus}</span>`:'—'}</td>
        </tr>`;}).join('')}</tbody>
        <tfoot><tr><td>TOTAL</td><td class="r">${ss$(tot23)}</td><td class="r">${ss$(tot24)}</td><td class="r">${ss$(tot25)}</td><td class="r" style="color:#fff">${ss$(tot26)}</td><td class="r" style="color:${dif2526>0?'#ff8896':'#4ade80'};font-weight:700">${dif2526>0?'▲ ':'▼ '}${ss$(Math.abs(dif2526))}</td><td class="r" style="color:${dif2526>0?'#ff8896':'#4ade80'};font-weight:700">${pct2526!=='—'?(dif2526>0?'+':'')+pct2526+'%':'—'}</td><td>${ahorros}/${mesesCon26.length} Ahorro</td></tr></tfoot>
      </table></div>
    </div>`,
    `<div class="ss-slide" id="ss-slide-3">
      <div class="ss-slide-eyebrow">Por unidad</div>
      <div class="ss-slide-heading">Gasto por <span>unidad 2026</span></div>
      <div class="ss-kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:1.25rem">
        ${(()=>{const t24=CC.reduce((s,r)=>s+r.c24,0),t25=CC.reduce((s,r)=>s+r.c25,0),t26=CC.reduce((s,r)=>s+r.c26,0);const d=t26-t25;const p=t25>0?((d/t25)*100).toFixed(1):'—';return`
          <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">Total 2024</div><div class="val">${ss$(t24)}</div></div>
          <div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">Total 2025</div><div class="val">${ss$(t25)}</div></div>
          <div class="ss-kpi" style="--sskpi-c:rgba(192,21,42,0.9)"><div class="lbl">Total 2026</div><div class="val">${ss$(t26)}</div><div class="sub">${CC.filter(r=>r.estatus==='Ahorro').length}/${CC.length} en ahorro</div><div class="trend">${ssTrend(d)} ${p!=='—'?'('+p+'%)':''}</div></div>`;})()}
      </div>
      <div class="ss-full-col"><div class="ss-chart-wrap" style="flex:1"><div class="ss-chart-title">Top unidades · 2025 vs 2026</div><div class="ss-chart-inner"><canvas id="ss-top-unidades"></canvas></div></div></div>
    </div>`,
    `<div class="ss-slide" id="ss-slide-4"><div class="ss-end">
      <div class="ss-end-badge">FIS FIBER · Logística</div>
      <div class="ss-end-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0 0 21 18.382V7.618a1 1 0 0 0-.553-.894L15 4m0 13V4m0 0L9 7"/></svg></div>
      <div class="ss-end-title">Gastos de Casetas</div>
      <div class="ss-end-stat">
        <div class="ss-end-stat-item"><div class="ss-end-stat-val">${ss$(tot26)}</div><div class="ss-end-stat-lbl">Acumulado 2026</div></div>
        <div class="ss-end-stat-item"><div class="ss-end-stat-val" style="color:${dif2526>0?'#ff8896':'#4ade80'}">${dif2526>0?'▲':'▼'} ${ss$(Math.abs(dif2526))}</div><div class="ss-end-stat-lbl">vs 2025</div></div>
        <div class="ss-end-stat-item"><div class="ss-end-stat-val">${ahorros}/${mesesCon26.length}</div><div class="ss-end-stat-lbl">Meses en ahorro</div></div>
      </div>
      <div class="ss-end-sub">${periodo}</div>
    </div></div>`,
  ];

  _abrirSS('FIS <span>FIBER</span> · Casetas');
  setTimeout(() => {
    const labels = data.map(r => r.mes.substring(0,3));
    DC('ss-bar-comp');
    CI['ss-bar-comp'] = new Chart(document.getElementById('ss-bar-comp'), {type:'bar',data:{labels,datasets:[
      {label:'2023',data:data.map(r=>r.c23),backgroundColor:'rgba(107,114,128,0.35)',borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(148,163,184,0.75)',font:{size:8,family:SS_MF,weight:'600'},formatter:v=>v>0?'$'+Math.round(v/1000)+'k':''}},
      {label:'2024',data:data.map(r=>r.c24),backgroundColor:'rgba(26,95,160,0.5)',borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(96,165,250,0.85)',font:{size:8,family:SS_MF,weight:'600'},formatter:v=>v>0?'$'+Math.round(v/1000)+'k':''}},
      {label:'2025',data:data.map(r=>r.c25),backgroundColor:'rgba(184,122,16,0.55)',borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(251,191,36,0.9)',font:{size:8,family:SS_MF,weight:'600'},formatter:v=>v>0?'$'+Math.round(v/1000)+'k':''}},
      {label:'2026',data:data.map(r=>r.c26>0?r.c26:null),backgroundColor:data.map(r=>r.c26>0&&r.dif2526<0?'rgba(74,222,128,0.82)':'rgba(255,120,138,0.82)'),borderRadius:3,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:data.map(r=>r.c26>0&&r.dif2526<0?'#4ade80':'#ff8896'),font:{size:8,family:SS_MF,weight:'700'},formatter:v=>v!=null?'$'+Math.round(v/1000)+'k':''}},
    ]},options:{...ssChartDefaults(),plugins:{legend:{display:true,position:'bottom',labels:{color:'rgba(255,255,255,0.4)',font:{size:10,family:'Outfit'},usePointStyle:true,padding:10}},datalabels:{},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${(c.parsed.y||0).toLocaleString('es-MX')}`}}},scales:{x:{grid:{display:false},ticks:{color:SS_TC,font:{size:9,family:SS_MF}},border:{color:'transparent'}},y:{grid:{color:SS_GC},ticks:{color:SS_TC,font:{size:9},callback:v=>{const a=Math.abs(v);return a>=1000?'$'+Math.round(a/1000)+'k':'$'+a;}},border:{color:'transparent'},beginAtZero:true,max:Math.ceil(Math.max(...data.map(r=>Math.max(r.c23,r.c24,r.c25,r.c26||0)))*1.28)||300000}}}});
    DC('ss-dona-est');
    const conDatoSS = data.filter(r => r.c26 > 0);
    CI['ss-dona-est'] = new Chart(document.getElementById('ss-dona-est'), {type:'bar',data:{labels:conDatoSS.map(r=>r.mes.substring(0,3)),datasets:[
      {label:'2025',data:conDatoSS.map(r=>r.c25),backgroundColor:'rgba(251,191,36,0.6)',borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:'rgba(251,191,36,0.85)',font:{size:8,family:SS_MF,weight:'600'},formatter:v=>'$'+Math.round(v/1000)+'k'}},
      {label:'2026',data:conDatoSS.map(r=>r.c26),backgroundColor:conDatoSS.map(r=>r.dif2526<0?'rgba(74,222,128,0.82)':'rgba(255,120,138,0.82)'),borderRadius:4,borderSkipped:false,datalabels:{display:true,anchor:'end',align:'end',clamp:true,offset:1,color:conDatoSS.map(r=>r.dif2526<0?'#4ade80':'#ff8896'),font:{size:8,family:SS_MF,weight:'700'},formatter:(v,ctx)=>{const r=conDatoSS[ctx.dataIndex];const pct=r.c25>0?((r.dif2526/r.c25)*100).toFixed(0):0;return'$'+Math.round(v/1000)+'k\n'+(pct>0?'+':'')+pct+'%';}}}
    ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{color:'rgba(255,255,255,0.4)',font:{size:10,family:'Outfit'},usePointStyle:true,padding:10}},datalabels:{},tooltip:{callbacks:{label:c=>`${c.dataset.label}: $${c.parsed.y.toLocaleString('es-MX')}`}}},scales:{x:{grid:{display:false},ticks:{color:SS_TC,font:{size:9,family:SS_MF}},border:{color:'transparent'}},y:{grid:{color:SS_GC},ticks:{color:SS_TC,font:{size:9},callback:v=>{const a=Math.abs(v);return a>=1000?'$'+Math.round(a/1000)+'k':'$'+a;}},border:{color:'transparent'},beginAtZero:true,max:Math.ceil(Math.max(...conDatoSS.map(r=>Math.max(r.c25,r.c26)))*1.35)||100000}}}});
    DC('ss-top-unidades');
    const topU = [...CC].filter(r=>r.c26>0).sort((a,b)=>b.c26-a.c26).slice(0,10);
    CI['ss-top-unidades'] = new Chart(document.getElementById('ss-top-unidades'), {type:'bar',data:{labels:topU.map(r=>r.unidad),datasets:[
      {label:'2025',data:topU.map(r=>r.c25),backgroundColor:'rgba(184,122,16,0.45)',borderRadius:3,borderSkipped:false,datalabels:{display:false}},
      {label:'2026',data:topU.map(r=>r.c26),backgroundColor:topU.map(r=>r.estatus==='Gasto'?'rgba(255,120,138,0.82)':'rgba(74,222,128,0.72)'),borderRadius:3,borderSkipped:false,datalabels:{anchor:'end',align:'end',offset:1,color:'rgba(255,255,255,0.8)',font:{size:9,family:SS_MF,weight:'700'},formatter:(v,ctx)=>{const r25=topU[ctx.dataIndex].c25;const pct=r25>0?((v-r25)/r25*100).toFixed(0):'—';return'$'+Math.round(v/1000)+'k'+(pct!=='—'?'\n'+(pct>0?'+':'')+pct+'%':'');}}}
    ]},options:{...ssChartDefaults(),plugins:{legend:{display:true,position:'bottom',labels:{color:'rgba(255,255,255,0.4)',font:{size:10,family:'Outfit'},usePointStyle:true,padding:10}},datalabels:{},tooltip:{callbacks:{label:c=>{const r=topU[c.dataIndex];const yr=c.dataset.label;const v=yr==='2025'?r.c25:r.c26;return`${yr}: $${v.toLocaleString('es-MX')}`;}}}},scales:{x:{grid:{display:false},ticks:{color:SS_TC,font:{size:9,family:SS_MF}},border:{color:'transparent'}},y:{grid:{color:SS_GC},ticks:{color:SS_TC,font:{size:9},callback:v=>'$'+Math.round(v/1000)+'k'},border:{color:'transparent'},beginAtZero:true,grace:'18%'}}}});
  }, 300);
}
