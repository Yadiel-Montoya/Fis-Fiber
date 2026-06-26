/**
 * cargas.js — Módulo Cargas Anticipadas
 * Depende de: config.js, utils.js, slideshow.js
 * Columnas: Fecha, Anticipadas, Nocturnas, Rentados (desde mayo)
 */

/* ══════════════════════════
   CARGA DE DATOS
══════════════════════════ */
async function loadData() {
  try {
    const res = await fetch(SHEETS_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('HTML recibido');
    const raw = parseCSV(txt);
    if (!raw.length) throw new Error('CSV vacío');
    const rows = raw.map(r => ({
      Fecha:       normDate(r.Fecha || r.fecha || r.FECHA || ''),
      Anticipadas: parseInt((r.Anticipadas || r.anticipadas || '0').replace(/[^\d]/g,'')) || 0,
      Nocturnas:   parseInt((r.Nocturnas  || r.nocturnas  || '0').replace(/[^\d]/g,'')) || 0,
      Rentados:    parseInt((r.Rentados   || r.rentados   || r.RENTADOS || '0').replace(/[^\d]/g,'')) || 0,
    })).filter(r => r.Fecha && r.Fecha.length >= 8 && !isNaN(new Date(r.Fecha)));
    if (!rows.length) throw new Error('Sin fechas válidas.');
    return { rows, error: null };
  } catch(e) { return { rows: [], error: e.message }; }
}

/* ══════════════════════════
   RENDER PRINCIPAL
══════════════════════════ */
async function renderCargas(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Conectando con Google Sheets…</div>`;
  const { rows, error } = await loadData();
  if (!rows.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div><div class="empty-title">Sin datos</div><div class="empty-desc">${error || 'Verifica la URL CSV'}</div></div>`;
    return;
  }

  const mesesSet = new Set(); rows.forEach(r => { const [y,m] = r.Fecha.split('-'); mesesSet.add(`${y}-${m}`); });
  const mesesList = [...mesesSet].sort();
  let filtroMes = 'todos', filtroDesde = '', filtroHasta = '';

  function filtrar() {
    let d = [...rows];
    if (filtroMes !== 'todos') d = d.filter(r => r.Fecha.startsWith(filtroMes));
    if (filtroDesde) d = d.filter(r => r.Fecha >= filtroDesde);
    if (filtroHasta) d = d.filter(r => r.Fecha <= filtroHasta);
    return d.sort((a,b) => a.Fecha.localeCompare(b.Fecha));
  }
  function periodLabel() {
    if (filtroMes !== 'todos') { const [y,m] = filtroMes.split('-'); return `${MESES[+m-1]} ${y}`; }
    if (filtroDesde || filtroHasta) return `${filtroDesde||'inicio'} → ${filtroHasta||'hoy'}`;
    return 'Todos los períodos';
  }
  function kpis(d) {
    const ant = d.reduce((s,r)=>s+r.Anticipadas,0);
    const noc = d.reduce((s,r)=>s+r.Nocturnas,0);
    const ren = d.reduce((s,r)=>s+r.Rentados,0);
    const tot = ant+noc+ren;
    const pctAnt = tot ? Math.round(ant/tot*100) : 0;
    const pctNoc = tot ? Math.round(noc/tot*100) : 0;
    const pctRen = tot ? 100 - pctAnt - pctNoc : 0;
    return { ant, noc, ren, tot, pct: pctAnt, pctNoc, pctRen, prom: d.length?(tot/d.length).toFixed(1):0, dias: d.length };
  }

  const CHART_IDS = ['g-bar','g-dona','g-dow','g-acum'];

  function render() {
    const data = filtrar(), k = kpis(data);
    const bD=[0,0,0,0,0,0,0], bN=[0,0,0,0,0,0,0], bR=[0,0,0,0,0,0,0], bC=[0,0,0,0,0,0,0];
    data.forEach(r => { const dow = new Date(r.Fecha+'T12:00:00').getDay(); bD[dow]+=r.Anticipadas; bN[dow]+=r.Nocturnas; bR[dow]+=r.Rentados; bC[dow]++; });
    let ac = 0;
    const acL = data.map(r => { const d = new Date(r.Fecha+'T12:00:00'); return `${d.getDate()}/${d.getMonth()+1}`; });
    const acD = data.map(r => { ac += r.Anticipadas+r.Nocturnas+r.Rentados; return ac; });
    const barH = 260;

    container.innerHTML = `
      <div class="banner ok">✓ Google Sheets conectado · ${rows.length} registros · Auto-refresco cada 5 min</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span><select class="filter-select" id="f-mes"><option value="todos">Todos los meses</option>${mesesList.map(m=>{const[y,mm]=m.split('-');return`<option value="${m}"${filtroMes===m?' selected':''}>${MESES[+mm-1]} ${y}</option>`;}).join('')}</select></div>
        <div class="filter-group"><span class="filter-label">Desde</span><input type="date" class="filter-input" id="f-desde" value="${filtroDesde}"></div>
        <div class="filter-group"><span class="filter-label">Hasta</span><input type="date" class="filter-input" id="f-hasta" value="${filtroHasta}"></div>
        <button class="filter-btn" onclick="applyFiltersCargas()">Aplicar</button>
        <button class="filter-clear" onclick="clearFiltersCargas()">Limpiar</button>
        <span class="filter-period-tag">${periodLabel()}</span>
        <button class="btn-presentar" onclick="abrirSlideshowCargas()" style="margin-left:auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Presentar
        </button>
      </div>
      <div class="kpi-row">
        <div class="ckpi" style="--ck-color:var(--ink)"><div class="lbl">Total cargas</div><div class="val">${k.tot}</div><div class="sub">${k.dias} días</div></div>
        <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">Anticipadas</div><div class="val">${k.ant}</div><div class="sub">${k.pct}% del total</div></div>
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">Nocturnas</div><div class="val">${k.noc}</div><div class="sub">${k.pctNoc}% del total</div></div>
        <div class="ckpi" style="--ck-color:var(--amber)"><div class="lbl">Rentados</div><div class="val">${k.ren}</div><div class="sub">${k.pctRen}% del total</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-box full"><div class="chart-title">Cargas por día <span class="chart-badge">${data.length} días</span></div><div style="position:relative;width:100%;height:${barH}px"><canvas id="g-bar"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Distribución total</div><div style="position:relative;width:100%;height:220px"><canvas id="g-dona"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Promedio por día de semana</div><div style="position:relative;width:100%;height:220px"><canvas id="g-dow"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Cargas acumuladas a la fecha <span class="chart-badge">corrida del período</span></div><div style="position:relative;width:100%;height:200px"><canvas id="g-acum"></canvas></div></div>
      </div>
      <div class="table-wrap"><div class="table-head-bar"><span class="ttl">Detalle por día</span><span class="meta">${data.length} registros</span></div>
      <table><thead><tr><th>Fecha</th><th>Día</th><th class="num">Anticipadas</th><th class="num">Nocturnas</th><th class="num">Rentados</th><th class="num">Total</th><th class="num">% Antic.</th></tr></thead>
      <tbody>${data.map(r => {
        const tot2=r.Anticipadas+r.Nocturnas+r.Rentados, pct2=tot2?Math.round(r.Anticipadas/tot2*100):0;
        const d2=new Date(r.Fecha+'T12:00:00');
        return`<tr><td>${String(d2.getDate()).padStart(2,'0')}/${String(d2.getMonth()+1).padStart(2,'0')}/${d2.getFullYear()}</td><td style="color:var(--ink3);font-size:12px">${DIAS[d2.getDay()]}</td><td class="num"><span class="pill pill-blue">${r.Anticipadas}</span></td><td class="num"><span class="pill pill-teal">${r.Nocturnas}</span></td><td class="num">${r.Rentados?`<span class="pill pill-amber">${r.Rentados}</span>`:'<span style="color:var(--ink3)">—</span>'}</td><td class="num"><span class="pill pill-green">${tot2}</span></td><td class="num">${pct2}%</td></tr>`;
      }).join('')}</tbody>
      <tfoot><tr><td colspan="2">TOTAL</td><td class="num">${k.ant}</td><td class="num">${k.noc}</td><td class="num">${k.ren}</td><td class="num">${k.tot}</td><td class="num">${k.pct}%</td></tr></tfoot></table></div>`;

    window._cargasData    = data;
    window._cargasKpis    = k;
    window._cargasPeriodo = periodLabel();
    window.applyFiltersCargas = () => { filtroMes=document.getElementById('f-mes').value; filtroDesde=document.getElementById('f-desde').value; filtroHasta=document.getElementById('f-hasta').value; if(filtroMes!=='todos'){filtroDesde='';filtroHasta='';} CHART_IDS.forEach(DC); render(); };
    window.clearFiltersCargas = () => { filtroMes='todos'; filtroDesde=''; filtroHasta=''; CHART_IDS.forEach(DC); render(); };

    setTimeout(() => {
      const gc='rgba(0,0,0,0.05)', tc='#9A7078', mf='JetBrains Mono';
      const barLabels = data.map(r => { const d=new Date(r.Fecha+'T12:00:00'); return `${String(d.getDate()).padStart(2,'0')}-${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][d.getMonth()]}`; });
      const totalesData = data.map(r => r.Anticipadas+r.Nocturnas+r.Rentados);

      DC('g-bar'); const bc=document.getElementById('g-bar');
      CI['g-bar'] = new Chart(bc, {
        data:{
          labels: barLabels,
          datasets:[
            {type:'bar',label:'Anticipadas',data:data.map(r=>r.Anticipadas),backgroundColor:'rgba(26,58,112,0.85)',borderRadius:3,borderSkipped:false,order:2,datalabels:{display:false}},
            {type:'bar',label:'Nocturnas',  data:data.map(r=>r.Nocturnas),  backgroundColor:'rgba(26,158,130,0.85)',borderRadius:3,borderSkipped:false,order:2,datalabels:{display:false}},
            {type:'bar',label:'Rentados',   data:data.map(r=>r.Rentados),   backgroundColor:'rgba(184,122,16,0.85)',borderRadius:3,borderSkipped:false,order:2,datalabels:{display:false}},
            {type:'line',label:'Total',data:totalesData,borderColor:'#E8892F',backgroundColor:'rgba(232,137,47,0.08)',borderWidth:2.5,pointRadius:4,pointBackgroundColor:'#E8892F',pointBorderColor:'#fff',pointBorderWidth:1.5,fill:false,tension:0.35,order:1,yAxisID:'y',datalabels:{display:false}}
          ]
        },
        options:{
          responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},
          plugins:{
            legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,pointStyleWidth:14,padding:20}},
            tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y}`}},
            datalabels:{display:false}
          },
          scales:{
            x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf},maxRotation:45,minRotation:45,autoSkip:true,maxTicksLimit:18},border:{color:'transparent'}},
            y:{grid:{color:gc},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'},beginAtZero:true,grace:'15%'}
          }
        }
      });

      DC('g-dona');
      CI['g-dona']=new Chart(document.getElementById('g-dona'),{
        type:'doughnut',
        data:{
          labels:['Anticipadas','Nocturnas','Rentados'],
          datasets:[{data:[k.ant,k.noc,k.ren],backgroundColor:['rgba(26,58,112,0.85)','rgba(26,158,130,0.85)','rgba(184,122,16,0.85)'],borderWidth:1,hoverOffset:6}]
        },
        options:{
          responsive:true,maintainAspectRatio:false,cutout:'68%',
          plugins:{
            legend:{position:'bottom'},
            tooltip:{callbacks:{label:c=>`${c.label}: ${c.parsed} (${k.tot?Math.round(c.parsed/k.tot*100):0}%)`}},
            datalabels:{display:false}
          }
        }
      });

      DC('g-dow');
      CI['g-dow']=new Chart(document.getElementById('g-dow'),{
        type:'bar',
        data:{
          labels:DIAS,
          datasets:[
            {label:'Anticipadas',data:bD.map((v,i)=>bC[i]?+(v/bC[i]).toFixed(1):0),backgroundColor:'rgba(26,58,112,0.75)',borderRadius:4,borderSkipped:false},
            {label:'Nocturnas',  data:bN.map((v,i)=>bC[i]?+(v/bC[i]).toFixed(1):0),backgroundColor:'rgba(26,158,130,0.75)',borderRadius:4,borderSkipped:false},
            {label:'Rentados',   data:bR.map((v,i)=>bC[i]?+(v/bC[i]).toFixed(1):0),backgroundColor:'rgba(184,122,16,0.75)',borderRadius:4,borderSkipped:false}
          ]
        },
        options:{
          responsive:true,maintainAspectRatio:false,
          plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},datalabels:{display:false}},
          scales:{
            x:{grid:{display:false},ticks:{color:tc,font:{size:11,family:mf}},border:{color:'transparent'}},
            y:{grid:{color:gc},ticks:{color:tc,font:{size:11}},border:{color:'transparent'},beginAtZero:true}
          }
        }
      });

      DC('g-acum'); CI['g-acum']=new Chart(document.getElementById('g-acum'),{type:'line',data:{labels:acL,datasets:[{label:'Acumulado',data:acD,borderColor:'#C0152A',backgroundColor:'rgba(192,21,42,0.07)',borderWidth:2,pointRadius:2,pointBackgroundColor:'#C0152A',fill:true,tension:0.35}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf},maxTicksLimit:14,autoSkip:true},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:11}},border:{color:'transparent'},beginAtZero:true}}}});
    }, 60);
  }
  render();
  if (window._timerCargas) clearInterval(window._timerCargas);
  window._timerCargas = setInterval(async () => {
    const { rows: nr } = await loadData();
    if (nr.length) { rows.splice(0, rows.length, ...nr); CHART_IDS.forEach(DC); render(); }
  }, 5*60*1000);
}

/* ══════════════════════════
   SLIDESHOW CARGAS
══════════════════════════ */
function abrirSlideshowCargas() {
  const data    = window._cargasData  || [];
  const k       = window._cargasKpis  || { tot:0, ant:0, noc:0, ren:0, pct:0, prom:0, dias:0 };
  const periodo = window._cargasPeriodo || 'Sin período';
  if (!data.length) { alert('Sin datos de cargas disponibles.'); return; }

  const bD=[0,0,0,0,0,0,0], bN=[0,0,0,0,0,0,0], bR=[0,0,0,0,0,0,0], bC=[0,0,0,0,0,0,0];
  data.forEach(r => { const dow=new Date(r.Fecha+'T12:00:00').getDay(); bD[dow]+=r.Anticipadas; bN[dow]+=r.Nocturnas; bR[dow]+=r.Rentados; bC[dow]++; });

  ssSlides = [
    `<div class="ss-slide active" id="ss-slide-0"><div class="ss-cover"><div class="ss-cover-line"></div><div class="ss-cover-eyebrow">Logística · FIS FIBER</div><div class="ss-cover-title">Cargas <span>Anticipadas</span></div><div class="ss-cover-sub">Análisis de cargas anticipadas, nocturnas y rentados</div><div class="ss-cover-period">📅 ${periodo} · ${data.length} días registrados</div><div class="ss-cover-line"></div></div></div>`,
    `<div class="ss-slide" id="ss-slide-1"><div class="ss-slide-eyebrow">Resumen ejecutivo</div><div class="ss-slide-heading">KPIs del <span>período</span></div><div class="ss-filtro-badge">🗓 <b>${periodo}</b> · ${k.dias} días</div><div class="ss-kpi-grid"><div class="ss-kpi" style="--sskpi-c:#fff"><div class="lbl">Total cargas</div><div class="val">${k.tot}</div><div class="sub">prom ${k.prom}/día</div></div><div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">Anticipadas</div><div class="val">${k.ant}</div><div class="sub">${k.pct}%</div></div><div class="ss-kpi" style="--sskpi-c:rgba(26,158,130,0.9)"><div class="lbl">Nocturnas</div><div class="val">${k.noc}</div><div class="sub">${k.tot?Math.round(k.noc/k.tot*100):0}%</div></div><div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">Rentados</div><div class="val">${k.ren}</div><div class="sub">${k.tot?Math.round(k.ren/k.tot*100):0}%</div></div></div><div class="ss-two-col"><div class="ss-chart-wrap"><div class="ss-chart-title">Distribución</div><div class="ss-chart-inner"><canvas id="ss-c-dona"></canvas></div></div><div class="ss-chart-wrap"><div class="ss-chart-title">Promedio por día</div><div class="ss-chart-inner"><canvas id="ss-c-dow"></canvas></div></div></div></div>`,
    `<div class="ss-slide" id="ss-slide-2"><div class="ss-slide-eyebrow">Tendencia</div><div class="ss-slide-heading">Acumulado <span>${periodo}</span></div><div class="ss-full-col"><div class="ss-chart-wrap" style="flex:1"><div class="ss-chart-title">Total acumulado · ${periodo}</div><div class="ss-chart-inner"><canvas id="ss-c-acum"></canvas></div></div></div></div>`,
    `<div class="ss-slide" id="ss-slide-3"><div class="ss-end"><div class="ss-end-badge">FIS FIBER · Logística</div><div class="ss-end-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div><div class="ss-end-title">Cargas Anticipadas</div><div class="ss-end-stat"><div class="ss-end-stat-item"><div class="ss-end-stat-val">${k.tot}</div><div class="ss-end-stat-lbl">Total</div></div><div class="ss-end-stat-item"><div class="ss-end-stat-val">${k.ant}</div><div class="ss-end-stat-lbl">Anticipadas</div></div><div class="ss-end-stat-item"><div class="ss-end-stat-val">${k.ren}</div><div class="ss-end-stat-lbl">Rentados</div></div></div><div class="ss-end-sub">${periodo}</div></div></div>`,
  ];

  _abrirSS('FIS <span>FIBER</span> · Cargas');
  setTimeout(() => {
    DC('ss-c-dona');
    CI['ss-c-dona']=new Chart(document.getElementById('ss-c-dona'),{
      type:'doughnut',
      data:{labels:['Anticipadas','Nocturnas','Rentados'],datasets:[{data:[k.ant,k.noc,k.ren],backgroundColor:['rgba(26,95,160,0.82)','rgba(26,158,130,0.82)','rgba(184,122,16,0.82)'],borderWidth:0}]},
      options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'rgba(255,255,255,0.45)',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},datalabels:{color:'#fff',font:{size:13,family:SS_MF,weight:'700'},formatter:(v,ctx)=>{const t=ctx.dataset.data.reduce((a,b)=>a+b,0);return t?Math.round(v/t*100)+'%':'';}}}}}
    );
    DC('ss-c-dow');
    CI['ss-c-dow']=new Chart(document.getElementById('ss-c-dow'),{
      type:'bar',
      data:{labels:DIAS,datasets:[
        {label:'Ant.',data:bD.map((v,i)=>bC[i]?+(v/bC[i]).toFixed(1):0),backgroundColor:'rgba(26,95,160,0.7)',borderRadius:4,borderSkipped:false},
        {label:'Noc.',data:bN.map((v,i)=>bC[i]?+(v/bC[i]).toFixed(1):0),backgroundColor:'rgba(26,158,130,0.7)',borderRadius:4,borderSkipped:false},
        {label:'Ren.',data:bR.map((v,i)=>bC[i]?+(v/bC[i]).toFixed(1):0),backgroundColor:'rgba(184,122,16,0.7)',borderRadius:4,borderSkipped:false}
      ]},
      options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{color:'rgba(255,255,255,0.4)',font:{size:10,family:'Outfit'},usePointStyle:true,padding:10}},datalabels:{display:false}},scales:{x:{grid:{display:false},ticks:{color:SS_TC,font:{size:10,family:SS_MF}},border:{color:'transparent'}},y:{grid:{color:SS_GC},ticks:{color:SS_TC,font:{size:9}},border:{color:'transparent'},beginAtZero:true}}}
    });
    DC('ss-c-acum');
    let ac2=0;
    const acL2 = data.map(r => { const d=new Date(r.Fecha+'T12:00:00'); return `${d.getDate()}/${d.getMonth()+1}`; });
    const acD2 = data.map(r => { ac2+=r.Anticipadas+r.Nocturnas+r.Rentados; return ac2; });
    CI['ss-c-acum']=new Chart(document.getElementById('ss-c-acum'),{type:'line',data:{labels:acL2,datasets:[{label:'Acumulado',data:acD2,borderColor:'#C0152A',backgroundColor:'rgba(192,21,42,0.08)',borderWidth:2.5,pointRadius:1.5,fill:true,tension:0.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},datalabels:{display:false}},scales:{x:{grid:{display:false},ticks:{color:SS_TC,font:{size:9,family:SS_MF},maxTicksLimit:14,autoSkip:true},border:{color:'transparent'}},y:{grid:{color:SS_GC},ticks:{color:SS_TC,font:{size:9}},border:{color:'transparent'},beginAtZero:true}}}});
  }, 300);
}
