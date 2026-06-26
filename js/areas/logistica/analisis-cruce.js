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
    const varGasto = pct(tG26, tG25c);
    const varForaneos = pct(tF26, tF25c);
    const difGasto = tG26 - tG25c;                                   // pesos: 2026 vs 2025 (mismo periodo)
    const pico = con26.slice().sort((a, b) => b.g26 - a.g26)[0] || {}; // mes de mayor gasto 2026

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
        <div class="ckpi" style="--ck-color:var(--amber)"><div class="lbl">Gasto casetas 2026 (YTD)</div><div class="val" style="font-size:20px">${$(tG26)}</div><div class="sub">vs 2025 (${$(tG25c)}): ${fmtPct(varGasto)}</div></div>
        <div class="ckpi" style="--ck-color:${difGasto <= 0 ? 'var(--green)' : 'var(--red)'}"><div class="lbl">Diferencia de gasto vs 2025</div><div class="val" style="font-size:20px;color:${difGasto <= 0 ? 'var(--green)' : 'var(--red)'}">${difGasto > 0 ? '+' : '−'}${$(Math.abs(difGasto))}</div><div class="sub">${difGasto <= 0 ? '✓ menos gasto en casetas' : '⚠ más gasto en casetas'}</div></div>
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">Foráneos 2026 (YTD)</div><div class="val">${tF26.toLocaleString('es-MX')}</div><div class="sub">vs 2025 (${tF25c}): ${fmtPct(varForaneos)}</div></div>
        <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">Mes de mayor gasto 2026</div><div class="val" style="font-size:19px">${pico.mes ? cap(pico.mes) : '—'}</div><div class="sub">${pico.g26 ? $(pico.g26) + ' · ' + (pico.f26 || 0) + ' foráneos' : ''}</div></div>
      </div>

      <div class="charts-grid">
        <div class="chart-box full"><div class="chart-title">Gasto de casetas por mes <span class="chart-badge">2025 vs 2026</span></div><div style="position:relative;width:100%;height:300px"><canvas id="cr-gasto"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Viajes foráneos por mes <span class="chart-badge">2025 vs 2026</span></div><div style="position:relative;width:100%;height:300px"><canvas id="cr-foraneos"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Foráneos vs Gasto de casetas por mes <span class="chart-badge">2025 vs 2026 · doble eje</span></div><div style="position:relative;width:100%;height:320px"><canvas id="cr-combo"></canvas></div></div>
      </div>

      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Detalle del cruce · Casetas × Foráneos</span><span class="meta">${data.length} meses</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr><th>Mes</th><th class="num">Foráneos 2025</th><th class="num">Foráneos 2026</th><th class="num">Dif foráneos</th><th class="num">Gasto Casetas 2025</th><th class="num">Gasto Casetas 2026</th><th class="num">Dif casetas</th></tr></thead>
          <tbody>${data.map(r => {
            const difF = (r.f26 && r.f25) ? r.f26 - r.f25 : null;
            const difG = (r.g26 && r.g25) ? r.g26 - r.g25 : null;
            return `<tr>
              <td style="font-weight:600">${cap(r.mes)}</td>
              <td class="num">${r.f25 || '—'}</td>
              <td class="num" style="font-weight:600">${r.f26 || '—'}</td>
              <td class="num">${difF == null ? '—' : `<span style="color:${difF >= 0 ? 'var(--green)' : 'var(--red)'}">${difF > 0 ? '+' : ''}${difF}</span>`}</td>
              <td class="num">${r.g25 ? $(r.g25) : '—'}</td>
              <td class="num" style="font-weight:600">${r.g26 ? $(r.g26) : '—'}</td>
              <td class="num">${difG == null ? '—' : `<span style="color:${difG <= 0 ? 'var(--green)' : 'var(--red)'}">${difG > 0 ? '+' : ''}${$(difG)}</span>`}</td>
            </tr>`;
          }).join('')}</tbody>
          <tfoot><tr><td>TOTAL YTD</td><td class="num">${tF25c}</td><td class="num">${tF26}</td><td class="num">${fmtPct(varForaneos)}</td><td class="num">${$(tG25c)}</td><td class="num">${$(tG26)}</td><td class="num">${fmtPct(varGasto)}</td></tr></tfoot>
        </table></div>
      </div>`;

    window.applyCruce = () => { filtroMes = document.getElementById('cr-mes').value; ['cr-combo','cr-gasto','cr-foraneos'].forEach(DC); render(); };
    window.clearCruce = () => { filtroMes = 'todos'; ['cr-combo','cr-gasto','cr-foraneos'].forEach(DC); render(); };

    setTimeout(() => {
      const gc = 'rgba(0,0,0,0.05)', tc = '#9A7078', mf = 'JetBrains Mono';
      const lbl = data.map(r => r.mes.substring(0, 3));
      const kFmt = v => { const a = Math.abs(v); return a >= 1000000 ? '$' + Math.round(a / 1000000) + 'M' : a >= 1000 ? '$' + Math.round(a / 1000) + 'k' : '$' + a; };

      DC('cr-combo');
      CI['cr-combo'] = new Chart(document.getElementById('cr-combo'), { data: { labels: lbl, datasets: [
        { type: 'bar', label: 'Foráneos 2025', data: data.map(r => r.f25 || null), backgroundColor: 'rgba(184,122,16,0.6)', borderRadius: 3, borderSkipped: false, yAxisID: 'y', datalabels: { display: false } },
        { type: 'bar', label: 'Foráneos 2026', data: data.map(r => r.f26 || null), backgroundColor: 'rgba(26,158,130,0.85)', borderRadius: 3, borderSkipped: false, yAxisID: 'y', datalabels: { display: false } },
        { type: 'line', label: 'Casetas 2025', data: data.map(r => r.g25 || null), borderColor: 'rgba(184,122,16,0.95)', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 3], pointRadius: 3, fill: false, tension: 0.3, yAxisID: 'y1', datalabels: { display: false } },
        { type: 'line', label: 'Casetas 2026', data: data.map(r => r.g26 || null), borderColor: '#C0152A', backgroundColor: 'rgba(192,21,42,0.07)', borderWidth: 2.6, pointRadius: 3.5, pointBackgroundColor: '#C0152A', fill: false, tension: 0.3, yAxisID: 'y1', datalabels: { display: false } },
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 12, family: 'Outfit' }, usePointStyle: true, padding: 16 } }, tooltip: { callbacks: { label: c => c.dataset.label.includes('Casetas') ? `${c.dataset.label}: ${$(c.parsed.y || 0)}` : `${c.dataset.label}: ${c.parsed.y || 0}` } }, datalabels: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 10, family: mf } }, border: { color: 'transparent' } }, y: { position: 'left', grid: { color: gc }, ticks: { color: 'rgba(26,158,130,0.95)', font: { size: 10 } }, border: { color: 'transparent' }, beginAtZero: true, title: { display: true, text: 'Foráneos', color: tc, font: { size: 10 } } }, y1: { position: 'right', grid: { display: false }, ticks: { color: '#C0152A', font: { size: 10 }, callback: kFmt }, border: { color: 'transparent' }, beginAtZero: true, title: { display: true, text: 'Gasto casetas', color: tc, font: { size: 10 } } } } } });

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
    }, 70);
  }

  render();
  if (window._timerCruce) clearInterval(window._timerCruce);
  window._timerCruce = setInterval(() => renderAnalisisCruce(container), 5 * 60 * 1000);
}
