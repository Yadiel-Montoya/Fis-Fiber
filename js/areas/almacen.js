/**
 * almacen.js — Módulo Almacén Materia Prima
 * Depende de: datos-almacen.js, config.js (ALMACEN_URL), utils.js
 *
 * Inventario en vivo desde SAP (vía API /api/almacen). Si no hay API o
 * falla, usa el snapshot base del Excel (datos-almacen.js).
 * Lógica de alerta (del Excel):
 *   Alerta almacén:  inventario < mínimo en almacén       → Solicitar OC
 *   Alerta global:   total general < mínimo global        → Solicitar OC
 */

async function loadAlmacen() {
  if (typeof ALMACEN_URL !== 'undefined' && ALMACEN_URL) {
    try {
      const r = await fetch(ALMACEN_URL + (ALMACEN_URL.includes('?') ? '&' : '?') + 'cb=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const js = await r.json();
      const data = js.almacen || js.data || js.reprogramados || [];
      if (Array.isArray(data) && data.length) {
        return { data, vivo: true, corte: js.timestamp ? js.timestamp.substring(0, 10) : '' };
      }
      throw new Error('sin filas');
    } catch (e) { console.warn('Almacén: usando datos base (', e.message, ')'); }
  }
  return { data: ALMACEN_DATA, vivo: false, corte: (typeof ALMACEN_CORTE !== 'undefined' ? ALMACEN_CORTE : '') };
}

async function renderAlmacen(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Cargando inventario de Materia Prima…</div>`;
  const carga = await loadAlmacen();
  const ALL = carga.data.map(r => {
    const inv = r.inv || 0, mn = r.min || 0, tg = (r.totalGral != null ? r.totalGral : inv + (r.transito || 0)), mg = r.minGlob || 0;
    return Object.assign({}, r, {
      totalGral: tg,
      alerta:  r.alerta || (mn > 0 ? (inv < mn ? 'Solicitar OC' : 'Cubierta') : 'Sin mínimo'),
      alertaG: r.alertaGlobal || (mg > 0 ? (tg < mg ? 'Solicitar OC' : 'Cubierta') : 'Sin mínimo'),
    });
  });
  const familias = ['todos', ...[...new Set(ALL.map(r => r.familia))].filter(Boolean)];
  let filtroFam = 'todos';

  const kg = v => (v || 0).toLocaleString('es-MX');
  const filtrar = () => filtroFam === 'todos' ? ALL : ALL.filter(r => r.familia === filtroFam);

  function render() {
    const D = filtrar();
    const invTot = D.reduce((s, r) => s + (r.inv || 0), 0);
    const transTot = D.reduce((s, r) => s + (r.transito || 0), 0);
    const pacasTot = D.reduce((s, r) => s + (r.pacas || 0), 0);
    const solicitar = D.filter(r => r.alerta === 'Solicitar OC').length;
    const enCero = D.filter(r => (r.inv || 0) === 0).length;
    const porFam = {};
    D.forEach(r => { porFam[r.familia] = (porFam[r.familia] || 0) + (r.inv || 0); });
    const famKeys = Object.keys(porFam);
    const bajos = D.filter(r => r.alerta === 'Solicitar OC' && (r.min || 0) > 0)
                   .sort((a, b) => (a.inv / (a.min || 1)) - (b.inv / (b.min || 1))).slice(0, 10);

    const pill = a => a === 'Solicitar OC' ? 'pill-red' : a === 'Cubierta' ? 'pill-green' : 'pill-amber';

    container.innerHTML = `
      <div class="banner ok">${carga.vivo ? '✓ SAP conectado' : '✓ Datos base (Excel)'} · Almacén 02 Materia Prima · Corte ${carga.corte || ''} · ${ALL.length} materiales</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Familia</span>
          <select class="filter-select" id="al-fam">${familias.map(f => `<option value="${f}"${filtroFam === f ? ' selected' : ''}>${f === 'todos' ? 'Todas las familias' : f}</option>`).join('')}</select>
        </div>
        <button class="filter-btn" onclick="applyAL()">Aplicar</button>
        <button class="filter-clear" onclick="clearAL()">Limpiar</button>
        <span class="filter-period-tag">${filtroFam === 'todos' ? 'Todas las familias' : filtroFam}</span>
      </div>
      <div class="kpi-row">
        <div class="ckpi" style="--ck-color:var(--ink)"><div class="lbl">Inventario total</div><div class="val">${Math.round(invTot/1000)}<span style="font-size:15px">k kg</span></div><div class="sub">${D.length} materiales · ${kg(pacasTot)} pacas</div></div>
        <div class="ckpi" style="--ck-color:var(--red)"><div class="lbl">Solicitar OC</div><div class="val">${solicitar}</div><div class="sub">bajo mínimo en almacén</div></div>
        <div class="ckpi" style="--ck-color:var(--amber)"><div class="lbl">En cero</div><div class="val">${enCero}</div><div class="sub">sin existencia</div></div>
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">En tránsito</div><div class="val">${Math.round(transTot/1000)}<span style="font-size:15px">k</span></div><div class="sub">kg por llegar</div></div>
      </div>
      <div class="charts-grid">
        <div class="chart-box"><div class="chart-title">Inventario por familia <span class="chart-badge">kg</span></div><div style="position:relative;width:100%;height:240px"><canvas id="al-fam-c"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Estatus de abasto</div><div style="position:relative;width:100%;height:240px"><canvas id="al-estatus"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Materiales bajo mínimo (a solicitar) <span class="chart-badge">top ${bajos.length}</span></div><div style="position:relative;width:100%;height:${Math.max(200, bajos.length*34)}px"><canvas id="al-bajos"></canvas></div></div>
      </div>
      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Detalle de Materia Prima</span><span class="meta">${D.length} materiales</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Familia</th><th>Material</th><th class="num">Pacas</th><th class="num">Inventario</th><th class="num">Mínimo</th><th class="num">Máximo</th><th class="center">Alerta</th><th class="num">Tránsito</th><th class="num">Total Gral.</th><th class="num">Días prod.</th></tr></thead>
          <tbody>${D.slice().sort((a,b)=>(b.inv||0)-(a.inv||0)).map(r => `<tr>
            <td><span class="pill pill-blue">${r.familia}</span></td>
            <td style="font-weight:600;max-width:280px;white-space:normal">${r.tipo || r.desc || ''}</td>
            <td class="num">${kg(r.pacas)}</td>
            <td class="num" style="font-weight:700">${kg(r.inv)}</td>
            <td class="num">${r.min ? kg(r.min) : '—'}</td>
            <td class="num">${r.max ? kg(r.max) : '—'}</td>
            <td class="center"><span class="pill ${pill(r.alerta)}">${r.alerta}</span></td>
            <td class="num">${r.transito ? kg(r.transito) : '—'}</td>
            <td class="num">${kg(r.totalGral)}</td>
            <td class="num">${r.dias != null ? r.dias : '—'}</td>
          </tr>`).join('')}</tbody>
          <tfoot><tr><td colspan="2">TOTAL ${filtroFam === 'todos' ? '' : filtroFam}</td><td class="num">${kg(pacasTot)}</td><td class="num">${kg(invTot)}</td><td class="num"></td><td class="num"></td><td class="center">${solicitar} OC</td><td class="num">${kg(transTot)}</td><td class="num">${kg(invTot+transTot)}</td><td class="num"></td></tr></tfoot>
        </table></div>
      </div>`;

    setTimeout(() => {
      const gc='rgba(0,0,0,0.05)', tc='#9A7078', mf='JetBrains Mono';
      const famColors = ['rgba(192,21,42,0.82)','rgba(26,95,160,0.82)','rgba(26,158,130,0.82)','rgba(184,122,16,0.82)','rgba(124,58,237,0.82)','rgba(107,114,128,0.7)'];

      DC('al-fam-c');
      CI['al-fam-c'] = new Chart(document.getElementById('al-fam-c'), {
        type:'doughnut', data:{ labels: famKeys, datasets:[{ data: famKeys.map(f=>porFam[f]), backgroundColor: famColors, borderWidth:1, hoverOffset:6 }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, tooltip:{callbacks:{label:c=>`${c.label}: ${kg(c.parsed)} kg`}}, datalabels:{color:'#fff',font:{size:11,family:mf,weight:'700'},formatter:(v)=>{const t=famKeys.reduce((s,f)=>s+porFam[f],0);return t?Math.round(v/t*100)+'%':'';}} } }
      });

      DC('al-estatus');
      const cub = D.filter(r=>r.alerta==='Cubierta').length, sm = D.filter(r=>r.alerta==='Sin mínimo').length;
      CI['al-estatus'] = new Chart(document.getElementById('al-estatus'), {
        type:'doughnut', data:{ labels:['Cubierta','Solicitar OC','Sin mínimo'], datasets:[{ data:[cub,solicitar,sm], backgroundColor:['rgba(26,158,92,0.82)','rgba(192,21,42,0.82)','rgba(184,122,16,0.7)'], borderWidth:1, hoverOffset:6 }] },
        options:{ responsive:true, maintainAspectRatio:false, cutout:'62%', plugins:{ legend:{position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, datalabels:{color:'#fff',font:{size:12,family:mf,weight:'700'},formatter:(v)=>v||''} } }
      });

      DC('al-bajos');
      CI['al-bajos'] = new Chart(document.getElementById('al-bajos'), {
        type:'bar', data:{ labels: bajos.map(r=>(r.tipo||r.desc||'').substring(0,28)), datasets:[
          { label:'Inventario', data:bajos.map(r=>r.inv), backgroundColor:'rgba(192,21,42,0.82)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
          { label:'Mínimo', data:bajos.map(r=>r.min), backgroundColor:'rgba(184,122,16,0.4)', borderRadius:3, borderSkipped:false, datalabels:{display:false} },
        ]},
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:true,position:'bottom',labels:{color:'#5C3038',font:{size:11,family:'Outfit'},usePointStyle:true,padding:12}}, tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${kg(c.parsed.x)} kg`}}, datalabels:{display:false} },
          scales:{ x:{grid:{color:gc},ticks:{color:tc,font:{size:9,family:mf},callback:v=>Math.round(v/1000)+'k'},border:{color:'transparent'},beginAtZero:true}, y:{grid:{display:false},ticks:{color:'#1A0A0C',font:{size:10,family:'Outfit'}},border:{color:'transparent'}} } }
      });
    }, 60);
  }

  window.applyAL = () => { filtroFam = document.getElementById('al-fam').value; ['al-fam-c','al-estatus','al-bajos'].forEach(DC); render(); };
  window.clearAL = () => { filtroFam = 'todos'; ['al-fam-c','al-estatus','al-bajos'].forEach(DC); render(); };
  render();

  if (window._timerAlmacen) clearInterval(window._timerAlmacen);
  window._timerAlmacen = setInterval(() => renderAlmacen(container), 5 * 60 * 1000);
}
