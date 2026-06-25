/**
 * analisis-cruce.js — Análisis cruzado: Gasto Casetas × Viajes Foráneos
 * Cruza dos fuentes en vivo:
 *   - Casetas (gasto mensual)      → loadCasetasMensual()  [casetas.js]
 *   - Viajes Foráneos (conteo)     → loadViajesPiezas()     [viajes-piezas.js]
 * Métrica clave: costo de caseta por viaje foráneo = gasto / foráneos.
 * Comparativa 2025 vs 2026, tendencia y diferencias. Se actualiza solo.
 * Depende de: config.js, utils.js (CI, DC, MESES)
 */

const _MESES_CRUCE = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];

async function loadCruce() {
  const [cas, vp] = await Promise.all([loadCasetasMensual(), loadViajesPiezas()]);
  const byCas = {}; (cas.rows || []).forEach(r => byCas[r.mes] = r);
  const byVp  = {}; (vp.rows  || []).forEach(r => byVp[r.mes]  = r);
  const rows = _MESES_CRUCE.map(m => {
    const c = byCas[m] || {}, v = byVp[m] || {};
    const f25 = v.f25 || 0, f26 = v.f26 || 0, g25 = c.c25 || 0, g26 = c.c26 || 0;
    return {
      mes: m, f25, f26, g25, g26,
      cpf25: f25 > 0 ? g25 / f25 : 0,   // costo caseta por viaje foráneo 2025
      cpf26: f26 > 0 ? g26 / f26 : 0,   // 2026
    };
  }).filter(r => r.f25 || r.f26 || r.g25 || r.g26);
  return { rows, errCas: cas.error, errVp: vp.error };
}

async function renderAnalisisCruce(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Cruzando Casetas × Viajes Foráneos…</div>`;
  const { rows, errCas, errVp } = await loadCruce();

  if (!rows.length) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon"><svg viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></div>
      <div class="empty-title">Sin datos para cruzar</div>
      <div class="empty-desc">Se necesitan Casetas y Viajes Foráneos.<br>${errCas ? 'Casetas: ' + errCas + '<br>' : ''}${errVp ? 'Viajes: ' + errVp : ''}</div></div>`;
    return;
  }

  let filtroMes = 'todos';
  const filtrar = () => filtroMes === 'todos' ? rows : rows.filter(r => r.mes === filtroMes);
  const $ = n => '$' + Math.round(n).toLocaleString('es-MX');
  const cap = m => m.charAt(0) + m.slice(1).toLowerCase();
  const pct = (a, b) => b ? ((a - b) / b * 100) : null;
  const fmtPct = p => p == null ? '—' : `<span style="color:${p > 0 ? 'var(--red)' : 'var(--green)'}">${p > 0 ? '+' : ''}${p.toFixed(1)}%</span>`;

  function render() {
    const data = filtrar();
    const con26 = data.filter(r => r.f26 > 0 || r.g26 > 0);
    const tF25 = data.reduce((s, r) => s + r.f25, 0), tF26 = con26.reduce((s, r) => s + r.f26, 0);
    const tG25c = con26.reduce((s, r) => s + r.g25, 0), tG26 = con26.reduce((s, r) => s + r.g26, 0);
    const tF25c = con26.reduce((s, r) => s + r.f25, 0);
    const cpf26Prom = tF26 > 0 ? tG26 / tF26 : 0;
    const cpf25Prom = tF25c > 0 ? tG25c / tF25c : 0;
    const varCpf = pct(cpf26Prom, cpf25Prom);
    const varGasto = pct(tG26, tG25c);
    const varForaneos = pct(tF26, tF25c);

    container.innerHTML = `
      <div class="banner ok">✓ Cierre mensual · Casetas × Viajes Foráneos · 2025 vs 2026 · se actualiza solo de Casetas y Viajes</div>
      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span>
          <select class="filter-select" id="cr-mes"><option value="todos">Todos los meses</option>${rows.map(r => `<option value="${r.mes}"${filtroMes === r.mes ? ' selected' : ''}>${cap(r.mes)}</option>`).join('')}</select>
        </div>
        <button class="filter-btn" onclick="applyCruce()">Aplicar</button>
        <button class="filter-clear" onclick="clearCruce()">Limpiar</button>
        <span class="filter-period-tag">${filtroMes === 'todos' ? 'Acumulado anual' : cap(filtroMes)}</span>
      </div>

      <div class="kpi-row">
        <div class="ckpi" style="--ck-color:var(--red)"><div class="lbl">Costo caseta / foráneo 2026</div><div class="val">${$(cpf26Prom)}</div><div class="sub">2025: ${$(cpf25Prom)} · ${fmtPct(varCpf)}</div></div>
        <div class="ckpi" style="--ck-color:var(--amber)"><div class="lbl">Gasto casetas 2026 (YTD)</div><div class="val" style="font-size:22px">${$(tG26)}</div><div class="sub">vs 2025: ${fmtPct(varGasto)}</div></div>
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">Viajes foráneos 2026 (YTD)</div><div class="val">${tF26.toLocaleString('es-MX')}</div><div class="sub">vs 2025: ${fmtPct(varForaneos)}</div></div>
        <div class="ckpi" style="--ck-color:${varCpf != null && varCpf <= 0 ? 'var(--green)' : 'var(--red)'}"><div class="lbl">Eficiencia de costo</div><div class="val" style="font-size:20px">${varCpf == null ? '—' : (varCpf <= 0 ? '✓ Mejor' : '⚠ Peor')}</div><div class="sub">${varCpf == null ? '' : (varCpf <= 0 ? 'cuesta menos x foráneo' : 'cuesta más x foráneo')}</div></div>
      </div>

      <div class="charts-grid">
        <div class="chart-box full"><div class="chart-title">Gasto de casetas por mes <span class="chart-badge">2025 vs 2026</span></div><div style="position:relative;width:100%;height:300px"><canvas id="cr-gasto"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Viajes foráneos por mes <span class="chart-badge">2025 vs 2026</span></div><div style="position:relative;width:100%;height:300px"><canvas id="cr-foraneos"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Foráneos vs Gasto de casetas en el mes <span class="chart-badge">2026 · doble eje</span></div><div style="position:relative;width:100%;height:300px"><canvas id="cr-combo"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Costo de caseta por viaje foráneo <span class="chart-badge">2025 vs 2026</span></div><div style="position:relative;width:100%;height:260px"><canvas id="cr-cpf"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Diferencia costo/foráneo 2026 vs 2025 <span class="chart-badge">▼ ahorro · ▲ más caro</span></div><div style="position:relative;width:100%;height:260px"><canvas id="cr-dif"></canvas></div></div>
      </div>

      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Detalle del cruce · Casetas × Foráneos</span><span class="meta">${data.length} meses</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Mes</th><th class="num">Foráneos 2025</th><th class="num">Foráneos 2026</th><th class="num">Gasto Casetas 2025</th><th class="num">Gasto Casetas 2026</th><th class="num">$/Foráneo 2025</th><th class="num">$/Foráneo 2026</th><th class="num">Dif $/For</th></tr></thead>
          <tbody>${data.map(r => {
            const dif = (r.cpf26 && r.cpf25) ? r.cpf26 - r.cpf25 : null;
            return `<tr>
              <td style="font-weight:600">${cap(r.mes)}</td>
              <td class="num">${r.f25 || '—'}</td>
              <td class="num" style="font-weight:600">${r.f26 || '—'}</td>
              <td class="num">${r.g25 ? $(r.g25) : '—'}</td>
              <td class="num" style="font-weight:600">${r.g26 ? $(r.g26) : '—'}</td>
              <td class="num">${r.cpf25 ? $(r.cpf25) : '—'}</td>
              <td class="num"><span class="pill ${r.cpf26 && r.cpf25 ? (r.cpf26 <= r.cpf25 ? 'pill-green' : 'pill-red') : 'pill-blue'}">${r.cpf26 ? $(r.cpf26) : '—'}</span></td>
              <td class="num">${dif == null ? '—' : `<span style="color:${dif <= 0 ? 'var(--green)' : 'var(--red)'}">${dif > 0 ? '+' : ''}${$(dif)}</span>`}</td>
            </tr>`;
          }).join('')}</tbody>
          <tfoot><tr><td>TOTAL / PROM</td><td class="num">${tF25c}</td><td class="num">${tF26}</td><td class="num">${$(tG25c)}</td><td class="num">${$(tG26)}</td><td class="num">${$(cpf25Prom)}</td><td class="num">${$(cpf26Prom)}</td><td class="num">${cpf25Prom ? fmtPct(varCpf) : '—'}</td></tr></tfoot>
        </table></div>
      </div>`;

    window.applyCruce = () => { filtroMes = document.getElementById('cr-mes').value; ['cr-combo','cr-cpf','cr-gasto','cr-foraneos','cr-dif'].forEach(DC); render(); };
    window.clearCruce = () => { filtroMes = 'todos'; ['cr-combo','cr-cpf','cr-gasto','cr-foraneos','cr-dif'].forEach(DC); render(); };

    setTimeout(() => {
      const gc = 'rgba(0,0,0,0.05)', tc = '#9A7078', mf = 'JetBrains Mono';
      const lbl = data.map(r => r.mes.substring(0, 3));
      const kFmt = v => { const a = Math.abs(v); return a >= 1000000 ? '$' + Math.round(a / 1000000) + 'M' : a >= 1000 ? '$' + Math.round(a / 1000) + 'k' : '$' + a; };

      DC('cr-combo');
      CI['cr-combo'] = new Chart(document.getElementById('cr-combo'), { data: { labels: lbl, datasets: [
        { type: 'bar', label: 'Viajes foráneos 2026', data: data.map(r => r.f26 || null), backgroundColor: 'rgba(26,158,130,0.82)', borderRadius: 3, borderSkipped: false, yAxisID: 'y', datalabels: { display: false } },
        { type: 'line', label: 'Gasto casetas 2026', data: data.map(r => r.g26 || null), borderColor: '#C0152A', backgroundColor: 'rgba(192,21,42,0.08)', borderWidth: 2.6, pointRadius: 3.5, pointBackgroundColor: '#C0152A', fill: false, tension: 0.3, yAxisID: 'y1', datalabels: { display: false } },
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 12, family: 'Outfit' }, usePointStyle: true, padding: 16 } }, tooltip: { callbacks: { label: c => c.dataset.label.includes('Gasto') ? `${c.dataset.label}: ${$(c.parsed.y || 0)}` : `${c.dataset.label}: ${c.parsed.y || 0}` } }, datalabels: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 10, family: mf } }, border: { color: 'transparent' } }, y: { position: 'left', grid: { color: gc }, ticks: { color: 'rgba(26,158,130,0.95)', font: { size: 10 } }, border: { color: 'transparent' }, beginAtZero: true, title: { display: true, text: 'Foráneos', color: tc, font: { size: 10 } } }, y1: { position: 'right', grid: { display: false }, ticks: { color: '#C0152A', font: { size: 10 }, callback: kFmt }, border: { color: 'transparent' }, beginAtZero: true, title: { display: true, text: 'Gasto casetas', color: tc, font: { size: 10 } } } } } });

      DC('cr-cpf');
      CI['cr-cpf'] = new Chart(document.getElementById('cr-cpf'), { type: 'line', data: { labels: lbl, datasets: [
        { label: '$/Foráneo 2025', data: data.map(r => r.cpf25 ? Math.round(r.cpf25) : null), borderColor: 'rgba(184,122,16,0.9)', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 3], pointRadius: 3, tension: 0.3, datalabels: { display: false } },
        { label: '$/Foráneo 2026', data: data.map(r => r.cpf26 ? Math.round(r.cpf26) : null), borderColor: '#C0152A', backgroundColor: 'rgba(192,21,42,0.07)', borderWidth: 2.6, pointRadius: 3.5, pointBackgroundColor: '#C0152A', fill: true, tension: 0.3, datalabels: { display: false } },
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 11, family: 'Outfit' }, usePointStyle: true, padding: 12 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${$(c.parsed.y || 0)}` } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 10, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 }, callback: kFmt }, border: { color: 'transparent' }, beginAtZero: true } } } });

      const optComp = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 11, family: 'Outfit' }, usePointStyle: true, padding: 12 } }, datalabels: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 10, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 } }, border: { color: 'transparent' }, beginAtZero: true } } };

      DC('cr-gasto');
      CI['cr-gasto'] = new Chart(document.getElementById('cr-gasto'), { type: 'bar', data: { labels: lbl, datasets: [
        { label: 'Casetas 2025', data: data.map(r => r.g25 || 0), backgroundColor: 'rgba(184,122,16,0.78)', borderRadius: 3, borderSkipped: false },
        { label: 'Casetas 2026', data: data.map(r => r.g26 || 0), backgroundColor: 'rgba(192,21,42,0.82)', borderRadius: 3, borderSkipped: false },
      ] }, options: { ...optComp, scales: { ...optComp.scales, y: { ...optComp.scales.y, ticks: { color: tc, font: { size: 10 }, callback: kFmt } } }, plugins: { ...optComp.plugins, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${$(c.parsed.y || 0)}` } } } } });

      DC('cr-foraneos');
      CI['cr-foraneos'] = new Chart(document.getElementById('cr-foraneos'), { type: 'bar', data: { labels: lbl, datasets: [
        { label: 'Foráneos 2025', data: data.map(r => r.f25 || 0), backgroundColor: 'rgba(184,122,16,0.78)', borderRadius: 3, borderSkipped: false },
        { label: 'Foráneos 2026', data: data.map(r => r.f26 || 0), backgroundColor: 'rgba(26,158,130,0.85)', borderRadius: 3, borderSkipped: false },
      ] }, options: optComp });

      const difData = data.filter(r => r.cpf26 && r.cpf25).map(r => ({ mes: r.mes.substring(0, 3), dif: r.cpf26 - r.cpf25 }));
      DC('cr-dif');
      CI['cr-dif'] = new Chart(document.getElementById('cr-dif'), { type: 'bar', data: { labels: difData.map(r => r.mes), datasets: [
        { label: 'Dif $/foráneo', data: difData.map(r => Math.round(r.dif)), backgroundColor: difData.map(r => r.dif <= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)'), borderRadius: 4, borderSkipped: false, datalabels: { anchor: 'end', align: r => r.raw <= 0 ? 'start' : 'end', offset: 3, color: difData.map(r => r.dif <= 0 ? '#15803d' : '#b91c1c'), font: { size: 10, family: mf, weight: '700' }, formatter: v => (v > 0 ? '▲ +' : '▼ ') + '$' + Math.abs(v).toLocaleString('es-MX') } },
      ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y <= 0 ? 'Ahorro' : 'Más caro'}: ${$(Math.abs(c.parsed.y))} por foráneo` } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 11, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 }, callback: kFmt }, border: { color: 'transparent' } } } } });
    }, 70);
  }

  render();
  if (window._timerCruce) clearInterval(window._timerCruce);
  window._timerCruce = setInterval(() => renderAnalisisCruce(container), 5 * 60 * 1000);
}
