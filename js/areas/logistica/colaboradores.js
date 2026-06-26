/**
 * colaboradores.js — Módulo Participación Colaboradores
 * Depende de: config.js, utils.js, slideshow.js
 */

/* ══════════════════════════
   HELPERS LOCALES
══════════════════════════ */

/** Convierte un campo de fecha/mes en 'YYYY-MM' */
function parseMes(raw) {
  const s = (raw||'').toString().trim().replace(/["'\r]/g,'');
  if (!s) return '';
  // Serial Excel
  if (/^\d{5}$/.test(s)) { const d=new Date((parseInt(s)-25569)*86400000); if(!isNaN(d)) return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}`; }
  if (/^\d{4}-\d{2}$/.test(s)) return s;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(s)) { const p=s.split(/[-/]/); return `${p[0]}-${p[1].padStart(2,'0')}`; }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(s)) { const p=s.split(/[/-]/); return `${p[2]}-${p[1].padStart(2,'0')}`; }
  const mMap={ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
  // Mes en texto con año de 4 dígitos: "Junio 2026", "Enero 2026"
  const m=s.toLowerCase().match(/([a-záéíóú]{3})[a-záéíóú.]*\s*(\d{4})/);
  if (m && mMap[m[1]]) return `${m[2]}-${mMap[m[1]]}`;
  // Mes abreviado con año de 2 dígitos: "abr-26", "jun 26", "ene.25"
  const m2=s.toLowerCase().match(/([a-záéíóú]{3})[a-záéíóú.]*[\s\-/]*(\d{2})\b/);
  if (m2 && mMap[m2[1]]) return `20${m2[2]}-${mMap[m2[1]]}`;
  const d=new Date(s); if (!isNaN(d)) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  return '';
}

/**
 * Normaliza porcentajes de la BD a escala 0–100.
 * Maneja:  "45.0" → 45.0 | "0.45" → 45.0 | "4500.8" → 45.008
 */
function parsePct(raw) {
  if (!raw && raw !== 0) return 0;
  const s = (raw||'0').toString().replace(/[%\s\r]/g,'').replace(',','.');
  const n = parseFloat(s) || 0;
  if (n === 0) return 0;
  if (n > 100) return parseFloat((n/100).toFixed(4));   // 4500.8 → 45.008
  if (n > 0 && n < 1) return parseFloat((n*100).toFixed(4)); // 0.45 → 45.0
  return parseFloat(n.toFixed(4));                       // 45.0 → 45.0
}

/* ══════════════════════════
   RENDER PRINCIPAL
══════════════════════════ */
async function renderColaboradores(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Conectando con Google Sheets…</div>`;
  let VD = [];
  try {
    const res = await fetch(VIAJES_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('HTML recibido');
    const raw = parseCSV(txt); if (!raw.length) throw new Error('CSV vacío');
    VD = raw.map(r => ({
      Mes:         parseMes(r.Mes||r.mes||r.MES||r['Mes ']||''),
      Colaborador: (r.Colaborador||r.Nombre||'').toString().trim().toUpperCase(),
      Unidad:      (r.Unidad||'').toString().trim().toUpperCase(),
      Local:       parseInt((r.Local||'0').toString().replace(/[^\d]/g,'')) || 0,
      Foraneo:     parseInt((r.Foraneo||'0').toString().replace(/[^\d]/g,'')) || 0,
      Total:       parseInt((r['Total de viajes']||r.Total||'0').toString().replace(/[^\d]/g,'')) || 0,
      NoViajMin:   parseInt((r['No viajes minimos']||'50').toString().replace(/[^\d]/g,'')) || 50,
      Meta:        parseInt((r['Meta 100%']||'60').toString().replace(/[^\d]/g,'')) || 60,
      PctViajes:   parsePct(r['% DE VIAJES']||r['%viajes']||r['% viajes']||'0')
    })).filter(r => r.Colaborador && r.Colaborador.length > 2 && r.Colaborador !== 'COLABORADOR');
    // Descarta filas sin un mes válido (antes se asignaban al mes actual y
    // contaminaban junio con datos de meses que no parseaban, ej. "abr-26")
    VD = VD.filter(r => r.Mes && r.Mes.length === 7);
    if (!VD.length) throw new Error('Sin registros válidos');
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="empty-title">Error al cargar datos</div><div class="empty-desc">⚠ ${e.message}</div></div>`;
    return;
  }

  const mesesSet    = new Set(VD.map(r=>r.Mes));
  const unidadesSet = new Set(VD.map(r=>r.Unidad));
  const mesesList   = [...mesesSet].sort().reverse();
  const unidadesList = [...unidadesSet].sort();
  let sortCol = 'Total', sortDir = 'desc';
  let filtroMes = mesesList[0] || 'todos', filtroUnidad = 'todos', filtroColab = '';

  function mesLabel(m) { const [y,mm] = m.split('-'); return `${MESES[+mm-1]} ${y}`; }

  function filtrar() {
    return VD
      .filter(r => filtroMes === 'todos' || r.Mes === filtroMes)
      .filter(r => filtroUnidad === 'todos' || r.Unidad === filtroUnidad)
      .filter(r => !filtroColab || r.Colaborador.toLowerCase().includes(filtroColab.toLowerCase()))
      .sort((a,b) => {
        let va=a[sortCol]??0, vb=b[sortCol]??0;
        if (typeof va === 'string') { va=va.toLowerCase(); vb=(vb+'').toLowerCase(); }
        if (va < vb) return sortDir === 'asc' ? -1 : 1;
        if (va > vb) return sortDir === 'asc' ?  1 : -1;
        return 0;
      });
  }

  function getColor(pct) {
    if (pct >= 100) return { fill:'#1A9E5C', cls:'status-ok',  label:'Meta cumplida' };
    if (pct >= 70)  return { fill:'#B87A10', cls:'status-warn', label:'En proceso' };
    return           { fill:'#C0152A', cls:'status-low',  label:'Bajo meta' };
  }

  function kpisGlobal(data) {
    const total    = data.reduce((s,r)=>s+r.Total,0),
          local    = data.reduce((s,r)=>s+r.Local,0),
          foraneo  = data.reduce((s,r)=>s+r.Foraneo,0),
          metaCump = data.filter(r=>r.PctViajes>=100).length,
          pctPromedio = data.length ? data.reduce((s,r)=>s+r.PctViajes,0)/data.length : 0;
    return { total, local, foraneo, metaCump, pctPromedio, n: data.length };
  }

  function sortTable(col) {
    if (sortCol === col) { sortDir = sortDir === 'asc' ? 'desc' : 'asc'; }
    else { sortCol = col; sortDir = col === 'Colaborador' ? 'asc' : 'desc'; }
    ['cv-bar-top','cv-dona-unidad','cv-pct-bar','cv-acum'].forEach(DC);
    render();
  }

  function render() {
    const data = filtrar(), k = kpisGlobal(data);
    const maxTotal = data.length ? Math.max(...data.map(r=>r.Total), 1) : 1;
    const uTot = {}; data.forEach(r => { uTot[r.Unidad] = (uTot[r.Unidad]||0)+r.Total; });
    const uKeys   = Object.keys(uTot);
    const uColors = {'CAMION':'rgba(26,58,112,0.82)','CAMIONETA':'rgba(26,158,130,0.82)','QUINTA':'rgba(184,122,16,0.82)'};

    window._ssColabData   = data;
    window._ssColabKpis   = k;
    window._ssColabPeriodo = filtroMes === 'todos' ? 'Todos los períodos' : mesLabel(filtroMes);

    function thSort(col, label, align='') {
      const isActive = sortCol === col;
      const arrow    = isActive ? (sortDir==='asc'?' ▲':' ▼') : '';
      const numCls   = align==='num' ? ` class="num sortable${isActive?' sort-'+sortDir:''}"` : ` class="sortable${isActive?' sort-'+sortDir:''}"`;
      return `<th${numCls} ondblclick="sortTable('${col}')" title="Doble clic para ordenar por ${label}">${label}${isActive?`<span style="color:var(--red);font-size:9px">${arrow}</span>`:'<span style="color:var(--border2);font-size:9px"> ⇅</span>'}</th>`;
    }

    container.innerHTML = `
      <div class="banner ok">✓ Google Sheets conectado · ${VD.length} colaboradores · Auto-refresco cada 5 min · <b>Doble clic</b> en columna para ordenar</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span><select class="filter-select" id="cv-mes"><option value="todos">Todos</option>${mesesList.map(m=>`<option value="${m}"${filtroMes===m?' selected':''}>${mesLabel(m)}</option>`).join('')}</select></div>
        <div class="filter-group"><span class="filter-label">Unidad</span><select class="filter-select" id="cv-unidad"><option value="todos">Todas</option>${unidadesList.map(u=>`<option value="${u}"${filtroUnidad===u?' selected':''}>${u}</option>`).join('')}</select></div>
        <div class="filter-group"><span class="filter-label">Colaborador</span><input type="text" class="filter-input" id="cv-colab" placeholder="Buscar nombre…" value="${filtroColab}"></div>
        <button class="filter-btn" onclick="applyFiltersColab()">Aplicar</button>
        <button class="filter-clear" onclick="clearFiltersColab()">Limpiar</button>
        <span class="filter-period-tag">${filtroMes==='todos'?'Todos':mesLabel(filtroMes)}</span>
        <button class="btn-presentar" onclick="abrirSlideshowColab()" style="margin-left:auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Presentar
        </button>
      </div>
      <div class="kpi-row">
        <div class="ckpi" style="--ck-color:var(--ink)"><div class="lbl">Total viajes</div><div class="val">${k.total}</div><div class="sub">${k.n} colaboradores</div></div>
        <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">Locales</div><div class="val">${k.local}</div><div class="sub">${k.total?Math.round(k.local/k.total*100):0}%</div></div>
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">Foráneos</div><div class="val">${k.foraneo}</div><div class="sub">${k.total?Math.round(k.foraneo/k.total*100):0}%</div></div>
        <div class="ckpi" style="--ck-color:var(--green)"><div class="lbl">Meta mínima ✓</div><div class="val">${k.metaCump}</div><div class="sub">de ${k.n}</div></div>
        <div class="ckpi" style="--ck-color:var(--red)"><div class="lbl">Prom. viajes/chofer</div><div class="val">${k.total&&k.n?(k.total/k.n).toFixed(1):0}</div><div class="sub">viajes promedio</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-box"><div class="chart-title">Top colaboradores <span class="chart-badge">Top 5 · viajes</span></div><div style="position:relative;width:100%;height:280px"><canvas id="cv-bar-top"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Por unidad <span class="chart-badge">${uKeys.length} tipos</span></div><div style="position:relative;width:100%;height:230px"><canvas id="cv-dona-unidad"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Viajes acumulados a la fecha <span class="chart-badge">todos los colaboradores · corrida mensual</span></div><div style="position:relative;width:100%;height:280px"><canvas id="cv-acum"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Viajes por colaborador <span class="chart-badge" style="background:var(--blue-bg);color:var(--blue);border-color:rgba(26,95,160,.2)">🔵 Local + 🟢 Foráneo · ordenado por total desc</span></div><div style="position:relative;width:100%;overflow-x:auto"><canvas id="cv-pct-bar" style="height:${Math.max(320,data.length*42)}px"></canvas></div></div>
      </div>
      <div class="table-wrap">
        <div class="table-head-bar">
          <span class="ttl">Productividades por colaborador</span>
          <span class="meta" style="display:flex;align-items:center;gap:8px">${data.length} registros<span class="sort-hint">⇅ Doble clic en columna para ordenar</span></span>
        </div>
        <div style="overflow-x:auto"><table>
          <thead><tr>
            <th style="width:42px">#</th>
            ${thSort('Colaborador','Colaborador')}
            ${thSort('Unidad','Unidad')}
            ${thSort('Local','Local','num')}
            ${thSort('Foraneo','Foráneo','num')}
            ${thSort('Total','Total','num')}
            ${thSort('PctViajes','% Viajes','num')}
            <th class="center">Estatus</th>
          </tr></thead>
          <tbody>${data.map((r,i) => {
            const color   = getColor(r.PctViajes);
            const lPct    = r.Total>0?Math.round(r.Local/r.Total*100):0;
            const fPct    = r.Total>0?Math.round(r.Foraneo/r.Total*100):0;
            const tPct    = maxTotal>0?Math.round(r.Total/maxTotal*100):0;
            const bPct    = Math.min(100,Math.round(r.PctViajes));
            const rCl     = i===0?'rank-1':i===1?'rank-2':i===2?'rank-3':'rank-n';
            return `<tr>
              <td><span class="rank-num ${rCl}">${i+1}</span></td>
              <td style="font-weight:700;font-size:14px;letter-spacing:-.01em">${r.Colaborador}</td>
              <td><span class="unidad-badge ${r.Unidad==='CAMION'?'unidad-camion':r.Unidad==='CAMIONETA'?'unidad-camioneta':'unidad-quinta'}">${r.Unidad}</span></td>
              <td><div class="minibar-wrap"><div class="minibar-track"><div class="minibar-fill local" style="width:${lPct}%"></div></div><span class="minibar-val">${r.Local}</span></div></td>
              <td><div class="minibar-wrap"><div class="minibar-track"><div class="minibar-fill foraneo" style="width:${fPct}%"></div></div><span class="minibar-val">${r.Foraneo}</span></div></td>
              <td><div class="minibar-wrap"><div class="minibar-track"><div class="minibar-fill total" style="width:${tPct}%"></div></div><span class="minibar-val" style="font-size:15px;font-weight:900;color:var(--ink)">${r.Total}</span></div></td>
              <td><div class="pctbar-wrap"><div class="pctbar-track"><div class="pctbar-fill" style="width:${bPct}%;background:${color.fill}"></div></div><span class="pctbar-lbl ${r.PctViajes>=100?'pct-ok':r.PctViajes>=70?'pct-warn':'pct-low'}">${r.PctViajes.toFixed(1)}%</span></div></td>
              <td class="center"><span class="${color.cls}" style="font-size:12px;font-weight:700">${color.label}</span></td>
            </tr>`;
          }).join('')}</tbody>
          <tfoot><tr>
            <td colspan="2">TOTALES</td><td></td>
            <td class="num">${k.local}</td>
            <td class="num">${k.foraneo}</td>
            <td class="num">${k.total}</td>
            <td class="num">${k.pctPromedio.toFixed(1)}%</td>
            <td class="center">${k.metaCump}/${k.n} ✓</td>
          </tr></tfoot>
        </table></div>
      </div>`;

    window.sortTable = sortTable;
    window.applyFiltersColab = () => { filtroMes=document.getElementById('cv-mes').value; filtroUnidad=document.getElementById('cv-unidad').value; filtroColab=document.getElementById('cv-colab').value.trim(); ['cv-bar-top','cv-dona-unidad','cv-pct-bar','cv-acum'].forEach(DC); render(); };
    window.clearFiltersColab  = () => { filtroMes=mesesList[0]||'todos'; filtroUnidad='todos'; filtroColab=''; ['cv-bar-top','cv-dona-unidad','cv-pct-bar','cv-acum'].forEach(DC); render(); };

    setTimeout(() => {
      const gc='rgba(0,0,0,0.05)', tc='#9A7078', mf='JetBrains Mono';

      /* Acumulado a la fecha: total de viajes por mes (todos), suma corrida */
      const porMesTot = {}; VD.forEach(r => { porMesTot[r.Mes] = (porMesTot[r.Mes]||0) + r.Total; });
      const mesesAsc = Object.keys(porMesTot).sort();
      let acRun = 0;
      const acumLbl = mesesAsc.map(m => { const [y,mm]=m.split('-'); return MESES[+mm-1].substring(0,3); });
      const acumData = mesesAsc.map(m => { acRun += porMesTot[m]; return acRun; });
      const mensualData = mesesAsc.map(m => porMesTot[m]);
      DC('cv-acum');
      CI['cv-acum'] = new Chart(document.getElementById('cv-acum'), { data:{ labels:acumLbl, datasets:[
        { type:'bar', label:'Viajes del mes', data:mensualData, backgroundColor:'rgba(26,95,160,0.5)', borderRadius:3, borderSkipped:false, yAxisID:'y', datalabels:{display:false} },
        { type:'line', label:'Acumulado a la fecha', data:acumData, borderColor:'#C0152A', backgroundColor:'rgba(192,21,42,0.07)', borderWidth:2.6, pointRadius:3.5, pointBackgroundColor:'#C0152A', fill:true, tension:0.3, yAxisID:'y1', datalabels:{display:false} },
      ]}, options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${(c.parsed.y||0).toLocaleString('es-MX')}`}}, datalabels:{display:false} }, scales:{ x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf}},border:{color:'transparent'}}, y:{position:'left',grid:{color:gc},ticks:{color:'rgba(26,95,160,0.95)',font:{size:10}},border:{color:'transparent'},beginAtZero:true,title:{display:true,text:'Del mes',color:tc,font:{size:10}}}, y1:{position:'right',grid:{display:false},ticks:{color:'#C0152A',font:{size:10}},border:{color:'transparent'},beginAtZero:true,title:{display:true,text:'Acumulado',color:tc,font:{size:10}}} } } });

      DC('cv-bar-top');
      const top8 = [...data].sort((a,b)=>b.Total-a.Total).slice(0,5);
      CI['cv-bar-top'] = new Chart(document.getElementById('cv-bar-top'), {type:'bar',data:{labels:top8.map(r=>{const p=r.Colaborador.split(' ');return p.slice(0,2).join(' ')+'\n'+p.slice(2,4).join(' ');}),datasets:[{label:'Local',data:top8.map(r=>r.Local),backgroundColor:'rgba(26,58,112,0.88)',borderRadius:4,borderSkipped:false,datalabels:{anchor:'center',align:'center',color:'#fff',font:{size:12,family:mf,weight:'700'},formatter:v=>v>0?`${v}`:''}},{label:'Foráneo',data:top8.map(r=>r.Foraneo),backgroundColor:'rgba(26,158,130,0.88)',borderRadius:4,borderSkipped:false,datalabels:{anchor:'end',align:'top',offset:3,color:'#1A0A0C',font:{size:13,family:mf,weight:'900'},formatter:(v,ctx)=>`${top8[ctx.dataIndex].Total}`}}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:16}},tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y} viajes`,afterBody:items=>{const r=top8[items[0].dataIndex];return[`Total: ${r.Local+r.Foraneo} viajes`];}}},datalabels:{}},scales:{x:{grid:{display:false},ticks:{color:tc,font:{size:10,family:mf},maxRotation:0},border:{color:'transparent'}},y:{grid:{color:gc},ticks:{color:tc,font:{size:11}},border:{color:'transparent'},beginAtZero:true,grace:'22%'}}}});

      DC('cv-dona-unidad');
      CI['cv-dona-unidad'] = new Chart(document.getElementById('cv-dona-unidad'), {type:'doughnut',data:{labels:uKeys,datasets:[{data:uKeys.map(u=>uTot[u]),backgroundColor:uKeys.map(u=>uColors[u]||'rgba(150,150,150,0.75)'),borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:14}},tooltip:{callbacks:{label:c=>{const tot=c.dataset.data.reduce((a,b)=>a+b,0);return`${c.label}: ${c.parsed} (${Math.round(c.parsed/tot*100)}%)`}}},datalabels:{color:'#fff',font:{size:11,family:mf,weight:'700'},formatter:(v,ctx)=>{const tot=ctx.dataset.data.reduce((a,b)=>a+b,0);return tot&&v?Math.round(v/tot*100)+'%':''}}}}});

      DC('cv-pct-bar');
      const sp = [...data].sort((a,b)=>b.Total-a.Total);
      const pc = document.getElementById('cv-pct-bar');
      const pH = Math.max(360, data.length*46);
      pc.style.height = pH+'px'; pc.height = pH;
      const pcParent = pc.parentElement;
      const pcW = pcParent ? pcParent.clientWidth||800 : 800;
      pc.style.width = pcW+'px'; pc.width = pcW;
      const maxViajes = Math.max(...sp.map(r=>r.Total), 1);
      CI['cv-pct-bar'] = new Chart(pc, {type:'bar',data:{labels:sp.map(r=>r.Colaborador),datasets:[{label:'Local',data:sp.map(r=>r.Local),backgroundColor:'rgba(26,58,112,0.88)',borderRadius:0,borderSkipped:false,datalabels:{anchor:'center',align:'center',color:'#fff',font:{size:11,family:mf,weight:'700'},formatter:v=>v>0?`${v}`:''}},{label:'Foráneo',data:sp.map(r=>r.Foraneo),backgroundColor:'rgba(26,158,130,0.88)',borderRadius:{topRight:5,bottomRight:5,topLeft:0,bottomLeft:0},borderSkipped:false,datalabels:{anchor:'end',align:'end',offset:6,color:'#1A0A0C',font:{size:12,family:mf,weight:'900'},formatter:(v,ctx)=>{const r=sp[ctx.dataIndex];return `${r.Total}  (${r.PctViajes.toFixed(1)}%)`;}}},{label:'_meta',data:sp.map(r=>0),backgroundColor:'transparent',datalabels:{display:false}}]},options:{indexAxis:'y',responsive:false,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:12,family:'Outfit'},usePointStyle:true,padding:16,filter:i=>i.text!=='_meta'}},tooltip:{callbacks:{label:c=>c.dataset.label==='_meta'?'':` ${c.dataset.label}: ${c.parsed.x} viajes`,afterBody:items=>{const r=sp[items[0].dataIndex];return[`Total: ${r.Total}  |  % viajes: ${r.PctViajes.toFixed(1)}%`];}}},datalabels:{}},scales:{y:{stacked:true,grid:{display:false},ticks:{color:tc,font:{size:12,family:mf},padding:4},border:{color:'transparent'}},x:{stacked:true,grid:{color:gc},ticks:{color:tc,font:{size:11},callback:v=>`${v}`},border:{color:'transparent'},beginAtZero:true,grace:'18%',max:Math.ceil(maxViajes*1.25)}}}});
    }, 80);
  }
  render();
  if (window._timerColab) clearInterval(window._timerColab);
  window._timerColab = setInterval(() => { ['cv-bar-top','cv-dona-unidad','cv-pct-bar','cv-acum'].forEach(DC); renderColaboradores(container); }, 5*60*1000);
}

/* ══════════════════════════
   SLIDESHOW COLABORADORES
══════════════════════════ */
function abrirSlideshowColab() {
  const data    = window._ssColabData   || [];
  const k       = window._ssColabKpis   || { total:0, local:0, foraneo:0, metaCump:0, pctPromedio:0, n:0 };
  const periodo = window._ssColabPeriodo || 'Sin período';
  if (!data.length) { alert('Sin datos disponibles.'); return; }

  const top5  = [...data].sort((a,b)=>b.Total-a.Total).slice(0,5);
  const uTot  = {}; data.forEach(r => { uTot[r.Unidad] = (uTot[r.Unidad]||0)+r.Total; });
  const uKeys = Object.keys(uTot);
  const uColors = {'CAMION':'rgba(26,58,112,0.85)','CAMIONETA':'rgba(26,158,130,0.85)','QUINTA':'rgba(184,122,16,0.85)'};

  ssSlides = [
    `<div class="ss-slide active" id="ss-slide-0"><div class="ss-cover"><div class="ss-cover-line"></div><div class="ss-cover-eyebrow">Logística · FIS FIBER</div><div class="ss-cover-title">Participación <span>Colaboradores</span></div><div class="ss-cover-sub">Productividad · viajes locales y foráneos · cumplimiento de metas</div><div class="ss-cover-period">📅 ${periodo} · ${k.n} colaboradores</div><div class="ss-cover-line"></div></div></div>`,
    `<div class="ss-slide" id="ss-slide-1">
      <div class="ss-slide-eyebrow">Resumen ejecutivo</div>
      <div class="ss-slide-heading">KPIs <span>${periodo}</span></div>
      <div class="ss-filtro-badge">🗓 <b>${periodo}</b> · ${k.n} colaboradores · ${k.metaCump} con meta cumplida</div>
      <div class="ss-kpi-grid">
        <div class="ss-kpi" style="--sskpi-c:#fff"><div class="lbl">Total viajes</div><div class="val">${k.total}</div><div class="sub">${k.n} activos</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">Locales</div><div class="val">${k.local}</div><div class="sub">${k.total?Math.round(k.local/k.total*100):0}%</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(26,158,130,0.9)"><div class="lbl">Foráneos</div><div class="val">${k.foraneo}</div><div class="sub">${k.total?Math.round(k.foraneo/k.total*100):0}%</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(74,222,128,0.9)"><div class="lbl">Prom. viajes/chofer</div><div class="val">${k.total&&k.n?(k.total/k.n).toFixed(1):0}</div><div class="sub">viajes promedio</div></div>
      </div>
      <div class="ss-two-col">
        <div class="ss-chart-wrap"><div class="ss-chart-title">Top 5 · viajes totales</div><div class="ss-chart-inner"><canvas id="ss-v-top"></canvas></div></div>
        <div class="ss-chart-wrap"><div class="ss-chart-title">Por tipo de unidad</div><div class="ss-chart-inner"><canvas id="ss-v-dona"></canvas></div></div>
      </div>
    </div>`,
    `<div class="ss-slide" id="ss-slide-2" style="justify-content:flex-start;padding:1.25rem 2rem">
      <div class="ss-slide-eyebrow" style="margin-bottom:.25rem">Ranking</div>
      <div class="ss-slide-heading" style="font-size:22px;margin-bottom:.5rem">Productividad <span>colaboradores</span></div>
      <div class="ss-filtro-badge" style="margin-bottom:.5rem">🗓 <b>${periodo}</b> · ${data.length} colaboradores · ordenado por viajes</div>
      <div style="flex:1;overflow:hidden;display:flex;flex-direction:column">
        <table style="width:100%;border-collapse:collapse;font-family:'Outfit',sans-serif;flex:1">
          <thead><tr style="border-bottom:1px solid rgba(255,255,255,0.12)">
            <th style="width:32px;padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:left">#</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:left">Colaborador</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:left">Unidad</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:right">Local</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:right">Foráneo</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:right">Total</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:right">% Viajes</th>
            <th style="padding:5px 8px;font-size:8px;text-transform:uppercase;letter-spacing:.1em;color:rgba(255,255,255,0.3);text-align:center">Estatus</th>
          </tr></thead>
          <tbody>${(()=>{
            const sorted = [...data].sort((a,b)=>b.Total-a.Total);
            const n = sorted.length;
            const rPad = n<=15?'5px 8px':n<=20?'3px 8px':'2px 6px';
            const fName = n<=15?13:n<=20?12:11;
            const fNum  = n<=15?13:n<=20?12:11;
            const fTot  = n<=15?15:n<=20?13:12;
            const barW  = n<=15?55:n<=20?45:38;
            return sorted.map((r,i) => {
              const color  = r.PctViajes>=100?'#4ade80':r.PctViajes>=70?'#fbbf24':'#ff8896';
              const label  = r.PctViajes>=100?'✓ Meta':'En proceso';
              const medal  = i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
              const rowBg  = i%2===0?'rgba(255,255,255,0.025)':'transparent';
              const lPct   = r.Total>0?Math.round(r.Local/r.Total*100):0;
              const fPct   = r.Total>0?Math.round(r.Foraneo/r.Total*100):0;
              const bPct   = Math.min(100,Math.round(r.PctViajes));
              return `<tr style="border-bottom:1px solid rgba(255,255,255,0.04);background:${rowBg}">
                <td style="padding:${rPad};font-size:10px;color:rgba(255,255,255,0.5)">${medal}</td>
                <td style="padding:${rPad};font-size:${fName}px;font-weight:700;color:#fff">${r.Colaborador}</td>
                <td style="padding:${rPad};font-size:9px;color:rgba(255,255,255,0.4)">${r.Unidad}</td>
                <td style="padding:${rPad};text-align:right"><div style="display:flex;align-items:center;justify-content:flex-end;gap:4px"><div style="width:${barW}px;height:9px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden"><div style="height:100%;width:${lPct}%;background:rgba(26,58,112,0.95);border-radius:3px"></div></div><span style="font-family:'JetBrains Mono',monospace;font-size:${fNum}px;font-weight:700;color:rgba(147,197,253,1);min-width:18px;text-align:right">${r.Local}</span></div></td>
                <td style="padding:${rPad};text-align:right"><div style="display:flex;align-items:center;justify-content:flex-end;gap:4px"><div style="width:${barW}px;height:9px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden"><div style="height:100%;width:${fPct}%;background:rgba(26,158,130,0.95);border-radius:3px"></div></div><span style="font-family:'JetBrains Mono',monospace;font-size:${fNum}px;font-weight:700;color:rgba(110,231,183,1);min-width:18px;text-align:right">${r.Foraneo}</span></div></td>
                <td style="padding:${rPad};text-align:right;font-family:'JetBrains Mono',monospace;font-size:${fTot}px;font-weight:900;color:#fff">${r.Total}</td>
                <td style="padding:${rPad};text-align:right"><div style="display:flex;align-items:center;justify-content:flex-end;gap:4px"><div style="width:40px;height:9px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden"><div style="height:100%;width:${bPct}%;background:${color};border-radius:3px;opacity:0.85"></div></div><span style="font-family:'JetBrains Mono',monospace;font-size:${fNum}px;font-weight:700;color:${color};min-width:38px;text-align:right">${r.PctViajes.toFixed(1)}%</span></div></td>
                <td style="padding:${rPad};text-align:center;font-size:${fNum-1}px;font-weight:700;color:${color}">${label}</td>
              </tr>`;
            }).join('');
          })()}</tbody>
          <tfoot><tr style="border-top:2px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.04)">
            <td colspan="3" style="padding:5px 8px;font-size:10px;font-weight:700;color:rgba(255,255,255,0.5)">TOTALES · ${k.n} colaboradores</td>
            <td style="padding:5px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:rgba(147,197,253,0.9)">${k.local}</td>
            <td style="padding:5px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:12px;font-weight:700;color:rgba(110,231,183,0.9)">${k.foraneo}</td>
            <td style="padding:5px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:900;color:#fff">${k.total}</td>
            <td style="padding:5px 8px;text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;color:rgba(255,255,255,0.5)">${k.pctPromedio.toFixed(1)}%</td>
            <td style="padding:5px 8px;text-align:center;font-size:11px;font-weight:700;color:#4ade80">${k.metaCump}/${k.n} ✓</td>
          </tr></tfoot>
        </table>
      </div>
    </div>`,
    `<div class="ss-slide" id="ss-slide-3"><div class="ss-end"><div class="ss-end-badge">FIS FIBER · Logística</div><div class="ss-end-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div><div class="ss-end-title">Participación Colaboradores</div><div class="ss-end-stat"><div class="ss-end-stat-item"><div class="ss-end-stat-val">${k.total}</div><div class="ss-end-stat-lbl">Total viajes</div></div><div class="ss-end-stat-item"><div class="ss-end-stat-val" style="color:#4ade80">${k.metaCump}/${k.n}</div><div class="ss-end-stat-lbl">Meta cumplida</div></div><div class="ss-end-stat-item"><div class="ss-end-stat-val">${k.total&&k.n?(k.total/k.n).toFixed(1):0}</div><div class="ss-end-stat-lbl">Prom/chofer</div></div></div><div class="ss-end-sub">${periodo}</div></div></div>`,
  ];

  _abrirSS('FIS <span>FIBER</span> · Colaboradores');
  setTimeout(() => {
    DC('ss-v-top');
    CI['ss-v-top'] = new Chart(document.getElementById('ss-v-top'), {type:'bar',data:{labels:top5.map(r=>r.Colaborador.split(' ').slice(0,2).join(' ')),datasets:[{label:'Local',data:top5.map(r=>r.Local),backgroundColor:'rgba(26,58,112,0.82)',borderRadius:3,borderSkipped:false},{label:'Foráneo',data:top5.map(r=>r.Foraneo),backgroundColor:'rgba(26,158,130,0.82)',borderRadius:3,borderSkipped:false}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{color:'rgba(255,255,255,0.4)',font:{size:10,family:'Outfit'},usePointStyle:true,padding:10}},datalabels:{anchor:'end',align:'end',offset:1,color:'rgba(255,255,255,0.6)',font:{size:9,family:SS_MF,weight:'600'},formatter:v=>v||''}},scales:{x:{grid:{display:false},ticks:{color:SS_TC,font:{size:9,family:SS_MF},maxRotation:0},border:{color:'transparent'}},y:{grid:{color:SS_GC},ticks:{color:SS_TC,font:{size:9}},border:{color:'transparent'},beginAtZero:true,grace:'15%'}}}});
    DC('ss-v-dona');
    CI['ss-v-dona'] = new Chart(document.getElementById('ss-v-dona'), {type:'doughnut',data:{labels:uKeys,datasets:[{data:uKeys.map(u=>uTot[u]),backgroundColor:uKeys.map(u=>uColors[u]||'rgba(150,150,150,0.75)'),borderWidth:0,hoverOffset:8}]},options:{responsive:true,maintainAspectRatio:false,cutout:'60%',plugins:{legend:{position:'bottom',labels:{color:'rgba(255,255,255,0.45)',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}},datalabels:{color:'#fff',font:{size:12,family:SS_MF,weight:'700'},formatter:(v,ctx)=>{const t=ctx.dataset.data.reduce((a,b)=>a+b,0);return t?Math.round(v/t*100)+'%':''}}}}});
  }, 300);
}
