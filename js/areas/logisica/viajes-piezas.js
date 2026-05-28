/**
 * viajes-piezas.js — Módulo Viajes y Piezas (Logística)
 * Depende de: config.js (VIAJES_PIEZAS_URL), utils.js (parseCSV, makeGet, MESES, CI, DC)
 * Depende de: slideshow.js (ssSlides, _abrirSS, ssChartDefaults, SS_MF, SS_GC, SS_TC)
 */

/* ── Loader del CSV ── */
async function loadViajesPiezas() {
  try {
    const res = await fetch(VIAJES_PIEZAS_URL + '&cb=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const txt = await res.text();
    if (txt.trim().startsWith('<')) throw new Error('Recibido HTML — URL no es CSV público');
    const raw = parseCSV(txt);
    if (!raw.length) throw new Error('CSV vacío o sin filas');
    const headersList = Object.keys(raw[0] || {});
    const debug = { headers: headersList.join(' | ') };

    const MESES_VALIDOS = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
    const parseNum = v => {
      if (!v && v !== 0) return 0;
      const s = (v || '0').toString().trim().replace(/[,$\s\r]/g, '');
      return parseFloat(s) || 0;
    };

    let ord = 0;
    const rows = raw.map(r => {
      const get = makeGet(r);
      const mes = (get('Mes', 'MES', 'mes') || '').toString().trim().toUpperCase().replace(/[^A-ZÁÉÍÓÚ]/g, '');
      if (!MESES_VALIDOS.includes(mes)) return null;
      ord++;
      const v23 = parseNum(get('VIAJES 2023', 'Viajes 2023', 'viajes 2023'));
      const v24 = parseNum(get('VIAJES 2024', 'Viajes 2024', 'viajes 2024'));
      const v25 = parseNum(get('VIAJES 2025', 'Viajes 2025', 'viajes 2025'));
      const v26 = parseNum(get('VIAJES 2026', 'Viajes 2026', 'viajes 2026'));
      const p23 = parseNum(get('Piezas embarcadas 2023', 'piezas embarcadas 2023', 'Piezas 2023'));
      const p24 = parseNum(get('Piezas embarcadas 2024', 'piezas embarcadas 2024', 'Piezas 2024'));
      const p25 = parseNum(get('Piezas embarcadas 2025', 'piezas embarcadas 2025', 'Piezas 2025'));
      const p26 = parseNum(get('Piezas embarcadas 2026', 'piezas embarcadas 2026', 'Piezas 2026'));
      return { ord, mes, v23, v24, v25, v26, p23, p24, p25, p26 };
    }).filter(Boolean);

    if (!rows.length) throw new Error('Ningún mes válido leído. Encabezados: ' + headersList.join(' | '));
    return { rows, error: null, debug };
  } catch (e) {
    return { rows: [], error: e.message, debug: null };
  }
}

/* ── Render principal ── */
async function renderViajesPiezas(container) {
  container.innerHTML = `<div class="loading-state"><div class="spinner"></div>Cargando datos de viajes y piezas…</div>`;
  const { rows, error, debug } = await loadViajesPiezas();

  if (error || !rows.length) {
    container.innerHTML = `<div style="max-width:680px;margin:0 auto;padding:2rem">
      <div style="font-size:16px;font-weight:700;color:var(--ink);margin-bottom:1.25rem">⚠ Diagnóstico de conexión — Viajes y Piezas</div>
      <div style="background:var(--off);border:1px solid var(--red);border-radius:10px;padding:1rem;margin-bottom:1rem;font-family:'JetBrains Mono',monospace;font-size:11px;line-height:2">
        <b>📋 Estado:</b> <span style="color:var(--red)">❌ ERROR</span><br>
        ${error ? `Error: <b style="color:var(--red)">${error}</b><br>` : ''}
        ${debug ? `Encabezados: <span style="color:var(--blue);word-break:break-all">${debug.headers}</span>` : ''}
      </div>
      <button id="btn-reintentar-vp" style="background:var(--red);color:#fff;border:none;border-radius:8px;padding:9px 22px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Outfit',sans-serif">🔄 Reintentar</button>
    </div>`;
    document.getElementById('btn-reintentar-vp').onclick = () => renderViajesPiezas(container);
    return;
  }

  window._viajesPiezasData = rows;

  let filtroMes = 'todos';
  function filtrar() { return filtroMes === 'todos' ? rows : rows.filter(r => r.mes === filtroMes); }

  function pctVar(actual, base) {
    if (!base || base === 0) return null;
    return ((actual - base) / base) * 100;
  }
  function fmtPct(p) {
    if (p === null || p === undefined || isNaN(p)) return '<span style="color:var(--ink3)">—</span>';
    const cls = p >= 0 ? 'dif-positive' : 'dif-negative';
    const arr = p >= 0 ? '▲' : '▼';
    return `<span class="${cls}">${arr} ${Math.abs(p).toFixed(1)}%</span>`;
  }
  function fmtPctSimple(p) {
    if (p === null || p === undefined || isNaN(p)) return '—';
    return (p >= 0 ? '+' : '') + p.toFixed(1) + '%';
  }

  function render() {
    const data = filtrar();
    /* Totales por año */
    const tv23 = data.reduce((s, r) => s + r.v23, 0), tv24 = data.reduce((s, r) => s + r.v24, 0),
          tv25 = data.reduce((s, r) => s + r.v25, 0), tv26 = data.reduce((s, r) => s + r.v26, 0);
    const tp23 = data.reduce((s, r) => s + r.p23, 0), tp24 = data.reduce((s, r) => s + r.p24, 0),
          tp25 = data.reduce((s, r) => s + r.p25, 0), tp26 = data.reduce((s, r) => s + r.p26, 0);

    /* % variación 2026 vs cada año */
    const pV26v23 = pctVar(tv26, tv23), pV26v24 = pctVar(tv26, tv24), pV26v25 = pctVar(tv26, tv25);
    const pP26v23 = pctVar(tp26, tp23), pP26v24 = pctVar(tp26, tp24), pP26v25 = pctVar(tp26, tp25);

    /* Piezas por viaje (eficiencia) */
    const efic26 = tv26 > 0 ? (tp26 / tv26).toFixed(1) : '—';
    const efic25 = tv25 > 0 ? (tp25 / tv25).toFixed(1) : '—';

    /* Meses con dato 2026 */
    const mesesCon26 = data.filter(r => r.v26 > 0 || r.p26 > 0).length;

    container.innerHTML = `
      <div class="banner ok">✓ Google Sheets conectado · ${rows.length} meses · Comparativa 2023–2026 · Auto-refresco cada 5 min</div>

      <div class="filters-bar">
        <div class="filter-group"><span class="filter-label">Mes</span>
          <select class="filter-select" id="vp-mes">
            <option value="todos">Todos los meses</option>
            ${rows.map(r => `<option value="${r.mes}"${filtroMes === r.mes ? ' selected' : ''}>${r.mes.charAt(0) + r.mes.slice(1).toLowerCase()}</option>`).join('')}
          </select>
        </div>
        <button class="filter-btn" onclick="applyFiltroVP()">Aplicar</button>
        <button class="filter-clear" onclick="clearFiltroVP()">Limpiar</button>
        <span class="filter-period-tag">${filtroMes === 'todos' ? 'Acumulado anual' : filtroMes.charAt(0) + filtroMes.slice(1).toLowerCase()}</span>
        <button class="btn-presentar" onclick="abrirSlideshowViajesPiezas()" style="margin-left:auto">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>Presentar
        </button>
      </div>

      <!-- VIAJES -->
      <div class="section-divider"><span>🚛 Viajes mensuales</span></div>
      <div class="casetas-summary-grid">
        <div class="cs-card" style="--cs-c:#6B7280"><div class="lbl">Viajes 2023</div><div class="val">${tv23.toLocaleString('es-MX')}</div><div class="sub">Año base</div></div>
        <div class="cs-card" style="--cs-c:var(--blue)"><div class="lbl">Viajes 2024</div><div class="val">${tv24.toLocaleString('es-MX')}</div><div class="sub">vs 2023: ${fmtPct(pctVar(tv24, tv23))}</div></div>
        <div class="cs-card" style="--cs-c:var(--amber)"><div class="lbl">Viajes 2025</div><div class="val">${tv25.toLocaleString('es-MX')}</div><div class="sub">vs 2024: ${fmtPct(pctVar(tv25, tv24))}</div></div>
        <div class="cs-card" style="--cs-c:var(--red)"><div class="lbl">Viajes 2026</div><div class="val">${tv26.toLocaleString('es-MX')}</div><div class="sub">vs 2025: ${fmtPct(pV26v25)}</div></div>
      </div>

      <!-- PIEZAS -->
      <div class="section-divider"><span>📦 Piezas embarcadas</span></div>
      <div class="casetas-summary-grid">
        <div class="cs-card" style="--cs-c:#6B7280"><div class="lbl">Piezas 2023</div><div class="val">${tp23.toLocaleString('es-MX')}</div><div class="sub">Año base</div></div>
        <div class="cs-card" style="--cs-c:var(--blue)"><div class="lbl">Piezas 2024</div><div class="val">${tp24.toLocaleString('es-MX')}</div><div class="sub">vs 2023: ${fmtPct(pctVar(tp24, tp23))}</div></div>
        <div class="cs-card" style="--cs-c:var(--amber)"><div class="lbl">Piezas 2025</div><div class="val">${tp25.toLocaleString('es-MX')}</div><div class="sub">vs 2024: ${fmtPct(pctVar(tp25, tp24))}</div></div>
        <div class="cs-card" style="--cs-c:var(--red)"><div class="lbl">Piezas 2026</div><div class="val">${tp26.toLocaleString('es-MX')}</div><div class="sub">vs 2025: ${fmtPct(pP26v25)}</div></div>
      </div>

      <!-- EFICIENCIA -->
      <div class="kpi-row">
        <div class="ckpi" style="--ck-color:var(--teal)"><div class="lbl">Piezas por viaje 2026</div><div class="val">${efic26}</div><div class="sub">2025: ${efic25}</div></div>
        <div class="ckpi" style="--ck-color:var(--blue)"><div class="lbl">2026 vs 2023</div><div class="val" style="font-size:20px">${fmtPctSimple(pV26v23)}</div><div class="sub">viajes</div></div>
        <div class="ckpi" style="--ck-color:var(--amber)"><div class="lbl">2026 vs 2024</div><div class="val" style="font-size:20px">${fmtPctSimple(pV26v24)}</div><div class="sub">viajes</div></div>
        <div class="ckpi" style="--ck-color:var(--green)"><div class="lbl">2026 vs 2025</div><div class="val" style="font-size:20px">${fmtPctSimple(pV26v25)}</div><div class="sub">viajes</div></div>
        <div class="ckpi" style="--ck-color:var(--red)"><div class="lbl">Meses con dato 2026</div><div class="val">${mesesCon26}</div><div class="sub">de ${data.length}</div></div>
      </div>

      <!-- GRÁFICAS -->
      <div class="charts-grid">
        <div class="chart-box full"><div class="chart-title">Viajes por mes <span class="chart-badge">2023–2026</span></div><div style="position:relative;width:100%;height:340px"><canvas id="vp-bar-viajes"></canvas></div></div>
        <div class="chart-box full"><div class="chart-title">Piezas embarcadas por mes <span class="chart-badge">2023–2026</span></div><div style="position:relative;width:100%;height:340px"><canvas id="vp-bar-piezas"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Tendencia viajes <span class="chart-badge">líneas</span></div><div style="position:relative;width:100%;height:260px"><canvas id="vp-line-viajes"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">Tendencia piezas <span class="chart-badge">líneas</span></div><div style="position:relative;width:100%;height:260px"><canvas id="vp-line-piezas"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">% Variación viajes 2026 vs años anteriores</div><div style="position:relative;width:100%;height:260px"><canvas id="vp-pct-viajes"></canvas></div></div>
        <div class="chart-box"><div class="chart-title">% Variación piezas 2026 vs años anteriores</div><div style="position:relative;width:100%;height:260px"><canvas id="vp-pct-piezas"></canvas></div></div>
      </div>

      <!-- TABLA -->
      <div class="table-wrap">
        <div class="table-head-bar"><span class="ttl">Detalle mensual · Viajes y Piezas</span><span class="meta">${data.length} meses</span></div>
        <div style="overflow-x:auto"><table>
          <thead><tr>
            <th>#</th><th>Mes</th>
            <th class="num">V.2023</th><th class="num">V.2024</th><th class="num">V.2025</th><th class="num">V.2026</th>
            <th class="num">% V vs '23</th><th class="num">% V vs '24</th><th class="num">% V vs '25</th>
            <th class="num">P.2023</th><th class="num">P.2024</th><th class="num">P.2025</th><th class="num">P.2026</th>
            <th class="num">% P vs '25</th>
          </tr></thead>
          <tbody>${data.map((r, i) => {
            const pv23 = pctVar(r.v26, r.v23), pv24 = pctVar(r.v26, r.v24), pv25 = pctVar(r.v26, r.v25);
            const pp25 = pctVar(r.p26, r.p25);
            return `<tr>
              <td style="color:var(--ink3);font-size:12px">${i + 1}</td>
              <td style="font-weight:600">${r.mes.charAt(0) + r.mes.slice(1).toLowerCase()}</td>
              <td class="num">${r.v23 ? r.v23.toLocaleString('es-MX') : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.v24 ? r.v24.toLocaleString('es-MX') : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.v25 ? r.v25.toLocaleString('es-MX') : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num"><span class="pill pill-red">${r.v26 ? r.v26.toLocaleString('es-MX') : '—'}</span></td>
              <td class="num">${r.v26 ? fmtPct(pv23) : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.v26 ? fmtPct(pv24) : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.v26 ? fmtPct(pv25) : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.p23 ? r.p23.toLocaleString('es-MX') : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.p24 ? r.p24.toLocaleString('es-MX') : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num">${r.p25 ? r.p25.toLocaleString('es-MX') : '<span style="color:var(--ink3)">—</span>'}</td>
              <td class="num"><span class="pill pill-blue">${r.p26 ? r.p26.toLocaleString('es-MX') : '—'}</span></td>
              <td class="num">${r.p26 ? fmtPct(pp25) : '<span style="color:var(--ink3)">—</span>'}</td>
            </tr>`;
          }).join('')}</tbody>
          <tfoot><tr>
            <td colspan="2">TOTALES</td>
            <td class="num">${tv23.toLocaleString('es-MX')}</td>
            <td class="num">${tv24.toLocaleString('es-MX')}</td>
            <td class="num">${tv25.toLocaleString('es-MX')}</td>
            <td class="num">${tv26.toLocaleString('es-MX')}</td>
            <td class="num">${fmtPct(pV26v23)}</td>
            <td class="num">${fmtPct(pV26v24)}</td>
            <td class="num">${fmtPct(pV26v25)}</td>
            <td class="num">${tp23.toLocaleString('es-MX')}</td>
            <td class="num">${tp24.toLocaleString('es-MX')}</td>
            <td class="num">${tp25.toLocaleString('es-MX')}</td>
            <td class="num">${tp26.toLocaleString('es-MX')}</td>
            <td class="num">${fmtPct(pP26v25)}</td>
          </tr></tfoot>
        </table></div>
      </div>`;

    /* exportar para slideshow */
    window._ssVPData    = data;
    window._ssVPTotales = { tv23, tv24, tv25, tv26, tp23, tp24, tp25, tp26, pV26v23, pV26v24, pV26v25, pP26v23, pP26v24, pP26v25, efic26, efic25, mesesCon26 };
    window._ssVPPeriodo = filtroMes === 'todos' ? 'Acumulado anual' : filtroMes.charAt(0) + filtroMes.slice(1).toLowerCase();

    window.applyFiltroVP = () => {
      filtroMes = document.getElementById('vp-mes').value;
      ['vp-bar-viajes','vp-bar-piezas','vp-line-viajes','vp-line-piezas','vp-pct-viajes','vp-pct-piezas'].forEach(DC);
      render();
    };
    window.clearFiltroVP = () => {
      filtroMes = 'todos';
      ['vp-bar-viajes','vp-bar-piezas','vp-line-viajes','vp-line-piezas','vp-pct-viajes','vp-pct-piezas'].forEach(DC);
      render();
    };

    /* ── Gráficas ── */
    setTimeout(() => {
      const gc = 'rgba(0,0,0,0.05)', tc = '#9A7078', mf = 'JetBrains Mono';
      const labels = data.map(r => r.mes.substring(0, 3));
      const C23 = 'rgba(148,163,184,0.55)', C24 = 'rgba(59,130,246,0.72)', C25 = 'rgba(251,191,36,0.78)';

      const yMaxV = Math.ceil(Math.max(...[...data.map(r => r.v23),...data.map(r => r.v24),...data.map(r => r.v25),...data.map(r => r.v26)].filter(v => v > 0), 1) * 1.25);
      const yMaxP = Math.ceil(Math.max(...[...data.map(r => r.p23),...data.map(r => r.p24),...data.map(r => r.p25),...data.map(r => r.p26)].filter(v => v > 0), 1) * 1.25);
      const yFmt = v => { const a = Math.abs(v); if (a >= 1000000) return Math.round(a / 1000000) + 'M'; if (a >= 1000) return Math.round(a / 1000) + 'k'; return a; };

      /* BARRAS — VIAJES */
      DC('vp-bar-viajes');
      CI['vp-bar-viajes'] = new Chart(document.getElementById('vp-bar-viajes'), { type: 'bar', data: { labels, datasets: [
        { label: '2023', data: data.map(r => r.v23), backgroundColor: C23, borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: 'rgba(107,114,128,0.85)', font: { size: 8, family: mf, weight: '600' }, formatter: v => v > 0 ? v : '' } },
        { label: '2024', data: data.map(r => r.v24), backgroundColor: C24, borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: 'rgba(59,130,246,0.95)', font: { size: 8, family: mf, weight: '600' }, formatter: v => v > 0 ? v : '' } },
        { label: '2025', data: data.map(r => r.v25), backgroundColor: C25, borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: 'rgba(217,151,0,0.95)', font: { size: 8, family: mf, weight: '600' }, formatter: v => v > 0 ? v : '' } },
        { label: '2026', data: data.map(r => r.v26 > 0 ? r.v26 : null), backgroundColor: data.map(r => r.v26 > 0 && r.v26 >= r.v25 ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)'), borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: data.map(r => r.v26 >= r.v25 ? '#15803d' : '#b91c1c'), font: { size: 9, family: mf, weight: '800' }, formatter: v => v != null ? v : '' } }
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 12, family: 'Outfit' }, usePointStyle: true, pointStyleWidth: 14, padding: 18 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${(c.parsed.y || 0).toLocaleString('es-MX')} viajes` } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 11, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 11 }, callback: yFmt }, border: { color: 'transparent' }, beginAtZero: true, max: yMaxV } } } });

      /* BARRAS — PIEZAS */
      DC('vp-bar-piezas');
      CI['vp-bar-piezas'] = new Chart(document.getElementById('vp-bar-piezas'), { type: 'bar', data: { labels, datasets: [
        { label: '2023', data: data.map(r => r.p23), backgroundColor: C23, borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: 'rgba(107,114,128,0.85)', font: { size: 8, family: mf, weight: '600' }, formatter: v => v > 0 ? yFmt(v) : '' } },
        { label: '2024', data: data.map(r => r.p24), backgroundColor: C24, borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: 'rgba(59,130,246,0.95)', font: { size: 8, family: mf, weight: '600' }, formatter: v => v > 0 ? yFmt(v) : '' } },
        { label: '2025', data: data.map(r => r.p25), backgroundColor: C25, borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: 'rgba(217,151,0,0.95)', font: { size: 8, family: mf, weight: '600' }, formatter: v => v > 0 ? yFmt(v) : '' } },
        { label: '2026', data: data.map(r => r.p26 > 0 ? r.p26 : null), backgroundColor: data.map(r => r.p26 > 0 && r.p26 >= r.p25 ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)'), borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', clamp: true, offset: 1, color: data.map(r => r.p26 >= r.p25 ? '#15803d' : '#b91c1c'), font: { size: 9, family: mf, weight: '800' }, formatter: v => v != null ? yFmt(v) : '' } }
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 12, family: 'Outfit' }, usePointStyle: true, pointStyleWidth: 14, padding: 18 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${(c.parsed.y || 0).toLocaleString('es-MX')} piezas` } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 11, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 11 }, callback: yFmt }, border: { color: 'transparent' }, beginAtZero: true, max: yMaxP } } } });

      /* LÍNEAS — VIAJES */
      DC('vp-line-viajes');
      CI['vp-line-viajes'] = new Chart(document.getElementById('vp-line-viajes'), { type: 'line', data: { labels, datasets: [
        { label: '2023', data: data.map(r => r.v23), borderColor: 'rgba(148,163,184,0.7)', backgroundColor: 'transparent', borderWidth: 1.8, pointRadius: 3, tension: 0.35, datalabels: { display: false } },
        { label: '2024', data: data.map(r => r.v24), borderColor: 'rgba(59,130,246,0.85)', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.35, datalabels: { display: false } },
        { label: '2025', data: data.map(r => r.v25), borderColor: 'rgba(251,191,36,0.95)', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.35, datalabels: { display: false } },
        { label: '2026', data: data.map(r => r.v26 > 0 ? r.v26 : null), borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 2.8, pointRadius: 5, pointBackgroundColor: '#22c55e', pointBorderColor: '#fff', pointBorderWidth: 1.5, fill: false, tension: 0.35, datalabels: { display: true, anchor: 'end', align: 'top', offset: 4, color: '#15803d', font: { size: 9, family: mf, weight: '800' }, formatter: v => v || '' } }
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 11, family: 'Outfit' }, usePointStyle: true, padding: 12 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${(c.parsed.y || 0).toLocaleString('es-MX')}` } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 10, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 }, callback: yFmt }, border: { color: 'transparent' }, beginAtZero: true, max: yMaxV } } } });

      /* LÍNEAS — PIEZAS */
      DC('vp-line-piezas');
      CI['vp-line-piezas'] = new Chart(document.getElementById('vp-line-piezas'), { type: 'line', data: { labels, datasets: [
        { label: '2023', data: data.map(r => r.p23), borderColor: 'rgba(148,163,184,0.7)', backgroundColor: 'transparent', borderWidth: 1.8, pointRadius: 3, tension: 0.35, datalabels: { display: false } },
        { label: '2024', data: data.map(r => r.p24), borderColor: 'rgba(59,130,246,0.85)', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.35, datalabels: { display: false } },
        { label: '2025', data: data.map(r => r.p25), borderColor: 'rgba(251,191,36,0.95)', backgroundColor: 'transparent', borderWidth: 2, pointRadius: 3, tension: 0.35, datalabels: { display: false } },
        { label: '2026', data: data.map(r => r.p26 > 0 ? r.p26 : null), borderColor: '#1A5FA0', backgroundColor: 'rgba(26,95,160,0.08)', borderWidth: 2.8, pointRadius: 5, pointBackgroundColor: '#1A5FA0', pointBorderColor: '#fff', pointBorderWidth: 1.5, fill: false, tension: 0.35, datalabels: { display: true, anchor: 'end', align: 'top', offset: 4, color: '#1A3A70', font: { size: 9, family: mf, weight: '800' }, formatter: v => v ? yFmt(v) : '' } }
      ] }, options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 11, family: 'Outfit' }, usePointStyle: true, padding: 12 } }, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${(c.parsed.y || 0).toLocaleString('es-MX')}` } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 10, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 }, callback: yFmt }, border: { color: 'transparent' }, beginAtZero: true, max: yMaxP } } } });

      /* % VARIACIÓN VIAJES */
      const pctVdata = data.filter(r => r.v26 > 0).map(r => ({
        mes: r.mes.substring(0, 3),
        v23: pctVar(r.v26, r.v23), v24: pctVar(r.v26, r.v24), v25: pctVar(r.v26, r.v25)
      }));
      const pctVMax = Math.ceil(Math.max(...pctVdata.flatMap(r => [Math.abs(r.v23 || 0), Math.abs(r.v24 || 0), Math.abs(r.v25 || 0)]), 5) * 1.3);
      DC('vp-pct-viajes');
      CI['vp-pct-viajes'] = new Chart(document.getElementById('vp-pct-viajes'), { type: 'bar', data: { labels: pctVdata.map(r => r.mes), datasets: [
        { label: 'vs 2023', data: pctVdata.map(r => r.v23 !== null ? +r.v23.toFixed(1) : 0), backgroundColor: 'rgba(107,114,128,0.7)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
        { label: 'vs 2024', data: pctVdata.map(r => r.v24 !== null ? +r.v24.toFixed(1) : 0), backgroundColor: 'rgba(59,130,246,0.8)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
        { label: 'vs 2025', data: pctVdata.map(r => r.v25 !== null ? +r.v25.toFixed(1) : 0), backgroundColor: pctVdata.map(r => r.v25 >= 0 ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)'), borderRadius: 3, borderSkipped: false, datalabels: { anchor: 'end', align: 'end', offset: 2, color: pctVdata.map(r => r.v25 >= 0 ? '#15803d' : '#b91c1c'), font: { size: 9, family: mf, weight: '800' }, formatter: v => (v > 0 ? '+' : '') + v + '%' } }
      ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 11, family: 'Outfit' }, usePointStyle: true, padding: 12 } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 11, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 }, callback: v => v + '%' }, border: { color: 'transparent' }, max: pctVMax, min: -pctVMax } } } });

      /* % VARIACIÓN PIEZAS */
      const pctPdata = data.filter(r => r.p26 > 0).map(r => ({
        mes: r.mes.substring(0, 3),
        p23: pctVar(r.p26, r.p23), p24: pctVar(r.p26, r.p24), p25: pctVar(r.p26, r.p25)
      }));
      const pctPMax = Math.ceil(Math.max(...pctPdata.flatMap(r => [Math.abs(r.p23 || 0), Math.abs(r.p24 || 0), Math.abs(r.p25 || 0)]), 5) * 1.3);
      DC('vp-pct-piezas');
      CI['vp-pct-piezas'] = new Chart(document.getElementById('vp-pct-piezas'), { type: 'bar', data: { labels: pctPdata.map(r => r.mes), datasets: [
        { label: 'vs 2023', data: pctPdata.map(r => r.p23 !== null ? +r.p23.toFixed(1) : 0), backgroundColor: 'rgba(107,114,128,0.7)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
        { label: 'vs 2024', data: pctPdata.map(r => r.p24 !== null ? +r.p24.toFixed(1) : 0), backgroundColor: 'rgba(59,130,246,0.8)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
        { label: 'vs 2025', data: pctPdata.map(r => r.p25 !== null ? +r.p25.toFixed(1) : 0), backgroundColor: pctPdata.map(r => r.p25 >= 0 ? 'rgba(34,197,94,0.85)' : 'rgba(239,68,68,0.85)'), borderRadius: 3, borderSkipped: false, datalabels: { anchor: 'end', align: 'end', offset: 2, color: pctPdata.map(r => r.p25 >= 0 ? '#15803d' : '#b91c1c'), font: { size: 9, family: mf, weight: '800' }, formatter: v => (v > 0 ? '+' : '') + v + '%' } }
      ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: true, position: 'bottom', labels: { color: '#5C3038', font: { size: 11, family: 'Outfit' }, usePointStyle: true, padding: 12 } }, datalabels: {} }, scales: { x: { grid: { display: false }, ticks: { color: tc, font: { size: 11, family: mf } }, border: { color: 'transparent' } }, y: { grid: { color: gc }, ticks: { color: tc, font: { size: 10 }, callback: v => v + '%' }, border: { color: 'transparent' }, max: pctPMax, min: -pctPMax } } } });

    }, 80);
  }

  render();
  if (window._timerVP) clearInterval(window._timerVP);
  window._timerVP = setInterval(() => { renderViajesPiezas(container); }, 5 * 60 * 1000);
}

/* ══════════════════════════
   SLIDESHOW VIAJES Y PIEZAS
══════════════════════════ */
function abrirSlideshowViajesPiezas() {
  const data = window._ssVPData || [], T = window._ssVPTotales || {}, periodo = window._ssVPPeriodo || 'Acumulado anual';
  if (!data.length) { alert('Carga los datos primero.'); return; }

  const fmtP = p => { if (p === null || p === undefined || isNaN(p)) return '—'; const arr = p >= 0 ? '▲' : '▼'; return `${arr} ${Math.abs(p).toFixed(1)}%`; };
  const colP = p => (p === null || isNaN(p)) ? 'rgba(255,255,255,0.4)' : (p >= 0 ? '#4ade80' : '#ff8896');
  const fmtN = n => (n || 0).toLocaleString('es-MX');

  ssSlides = [
    /* COVER */
    `<div class="ss-slide active" id="ss-slide-0"><div class="ss-cover">
      <div class="ss-cover-line"></div>
      <div class="ss-cover-eyebrow">Logística · FIS FIBER</div>
      <div class="ss-cover-title">Viajes y <span>Piezas</span></div>
      <div class="ss-cover-sub">Comparativa anual 2023 / 2024 / 2025 / 2026 · Viajes mensuales y piezas embarcadas</div>
      <div class="ss-cover-period">📅 ${periodo} · ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      <div class="ss-cover-line"></div>
    </div></div>`,

    /* SLIDE 1 — RESUMEN VIAJES */
    `<div class="ss-slide" id="ss-slide-1">
      <div class="ss-slide-eyebrow">Resumen ejecutivo · Viajes</div>
      <div class="ss-slide-heading">Viajes <span>${periodo}</span></div>
      <div class="ss-filtro-badge">🗓 <b>${periodo}</b> · ${data.length} meses · ${T.mesesCon26 || 0} con dato 2026</div>
      <div class="ss-kpi-grid">
        <div class="ss-kpi" style="--sskpi-c:rgba(107,114,128,0.9)"><div class="lbl">Viajes 2023</div><div class="val">${fmtN(T.tv23)}</div><div class="sub">año base</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">Viajes 2024</div><div class="val">${fmtN(T.tv24)}</div><div class="trend" style="color:${colP(((T.tv24 - T.tv23) / T.tv23) * 100)}">${fmtP(((T.tv24 - T.tv23) / T.tv23) * 100)}</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">Viajes 2025</div><div class="val">${fmtN(T.tv25)}</div><div class="trend" style="color:${colP(((T.tv25 - T.tv24) / T.tv24) * 100)}">${fmtP(((T.tv25 - T.tv24) / T.tv24) * 100)}</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(74,222,128,0.9)"><div class="lbl">Viajes 2026</div><div class="val">${fmtN(T.tv26)}</div><div class="sub">vs 2025</div><div class="trend" style="color:${colP(T.pV26v25)}">${fmtP(T.pV26v25)}</div></div>
      </div>
      <div class="ss-full-col"><div class="ss-chart-wrap" style="flex:1"><div class="ss-chart-title">Viajes por mes · 2023–2026</div><div class="ss-chart-inner"><canvas id="ss-vp-bar-v"></canvas></div></div></div>
    </div>`,

    /* SLIDE 2 — RESUMEN PIEZAS */
    `<div class="ss-slide" id="ss-slide-2">
      <div class="ss-slide-eyebrow">Resumen ejecutivo · Piezas</div>
      <div class="ss-slide-heading">Piezas <span>embarcadas</span></div>
      <div class="ss-filtro-badge">🗓 <b>${periodo}</b> · piezas por viaje 2026: <b>${T.efic26}</b> · 2025: <b>${T.efic25}</b></div>
      <div class="ss-kpi-grid">
        <div class="ss-kpi" style="--sskpi-c:rgba(107,114,128,0.9)"><div class="lbl">Piezas 2023</div><div class="val">${fmtN(T.tp23)}</div><div class="sub">año base</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">Piezas 2024</div><div class="val">${fmtN(T.tp24)}</div><div class="trend" style="color:${colP(((T.tp24 - T.tp23) / T.tp23) * 100)}">${fmtP(((T.tp24 - T.tp23) / T.tp23) * 100)}</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">Piezas 2025</div><div class="val">${fmtN(T.tp25)}</div><div class="trend" style="color:${colP(((T.tp25 - T.tp24) / T.tp24) * 100)}">${fmtP(((T.tp25 - T.tp24) / T.tp24) * 100)}</div></div>
        <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.95)"><div class="lbl">Piezas 2026</div><div class="val">${fmtN(T.tp26)}</div><div class="sub">vs 2025</div><div class="trend" style="color:${colP(T.pP26v25)}">${fmtP(T.pP26v25)}</div></div>
      </div>
      <div class="ss-full-col"><div class="ss-chart-wrap" style="flex:1"><div class="ss-chart-title">Piezas por mes · 2023–2026</div><div class="ss-chart-inner"><canvas id="ss-vp-bar-p"></canvas></div></div></div>
    </div>`,

    /* SLIDE 3 — VARIACIÓN VS AÑOS ANTERIORES */
    `<div class="ss-slide" id="ss-slide-3">
      <div class="ss-slide-eyebrow">2026 vs años anteriores</div>
      <div class="ss-slide-heading">% Variación <span>acumulada</span></div>
      <div class="ss-filtro-badge">🗓 <b>${periodo}</b> · comparación 2026 vs cada año base</div>
      <div class="ss-two-col" style="grid-template-columns:1fr 1fr">
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,0.5);margin-bottom:.75rem;font-weight:700">🚛 Viajes 2026</div>
          <div class="ss-kpi-grid" style="grid-template-columns:1fr;gap:10px">
            <div class="ss-kpi" style="--sskpi-c:rgba(107,114,128,0.9)"><div class="lbl">vs 2023</div><div class="val" style="font-size:24px;color:${colP(T.pV26v23)}">${fmtP(T.pV26v23)}</div><div class="sub">base: ${fmtN(T.tv23)} viajes</div></div>
            <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">vs 2024</div><div class="val" style="font-size:24px;color:${colP(T.pV26v24)}">${fmtP(T.pV26v24)}</div><div class="sub">base: ${fmtN(T.tv24)} viajes</div></div>
            <div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">vs 2025</div><div class="val" style="font-size:24px;color:${colP(T.pV26v25)}">${fmtP(T.pV26v25)}</div><div class="sub">base: ${fmtN(T.tv25)} viajes</div></div>
          </div>
        </div>
        <div>
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,0.5);margin-bottom:.75rem;font-weight:700">📦 Piezas 2026</div>
          <div class="ss-kpi-grid" style="grid-template-columns:1fr;gap:10px">
            <div class="ss-kpi" style="--sskpi-c:rgba(107,114,128,0.9)"><div class="lbl">vs 2023</div><div class="val" style="font-size:24px;color:${colP(T.pP26v23)}">${fmtP(T.pP26v23)}</div><div class="sub">base: ${fmtN(T.tp23)} piezas</div></div>
            <div class="ss-kpi" style="--sskpi-c:rgba(26,95,160,0.9)"><div class="lbl">vs 2024</div><div class="val" style="font-size:24px;color:${colP(T.pP26v24)}">${fmtP(T.pP26v24)}</div><div class="sub">base: ${fmtN(T.tp24)} piezas</div></div>
            <div class="ss-kpi" style="--sskpi-c:rgba(184,122,16,0.9)"><div class="lbl">vs 2025</div><div class="val" style="font-size:24px;color:${colP(T.pP26v25)}">${fmtP(T.pP26v25)}</div><div class="sub">base: ${fmtN(T.tp25)} piezas</div></div>
          </div>
        </div>
      </div>
    </div>`,

    /* SLIDE 4 — TABLA DETALLE */
    `<div class="ss-slide" id="ss-slide-4">
      <div class="ss-slide-eyebrow">Detalle mensual</div>
      <div class="ss-slide-heading">Comparativa <span>mes a mes</span></div>
      <div class="ss-filtro-badge">🗓 <b>${periodo}</b> · ${data.length} meses</div>
      <div class="ss-table-wrap"><table class="ss-table">
        <thead><tr><th>Mes</th><th class="r">V.2025</th><th class="r">V.2026</th><th class="r">% V</th><th class="r">P.2025</th><th class="r">P.2026</th><th class="r">% P</th></tr></thead>
        <tbody>${data.map(r => {
          const pV = r.v25 > 0 && r.v26 > 0 ? ((r.v26 - r.v25) / r.v25) * 100 : null;
          const pP = r.p25 > 0 && r.p26 > 0 ? ((r.p26 - r.p25) / r.p25) * 100 : null;
          return `<tr>
            <td><b>${r.mes.charAt(0) + r.mes.slice(1).toLowerCase()}</b></td>
            <td class="r" style="color:rgba(255,255,255,0.6)">${r.v25 ? fmtN(r.v25) : '—'}</td>
            <td class="r" style="color:#fff;font-weight:700">${r.v26 ? fmtN(r.v26) : '—'}</td>
            <td class="r" style="color:${colP(pV)};font-weight:700">${pV !== null ? fmtP(pV) : '—'}</td>
            <td class="r" style="color:rgba(255,255,255,0.6)">${r.p25 ? fmtN(r.p25) : '—'}</td>
            <td class="r" style="color:#fff;font-weight:700">${r.p26 ? fmtN(r.p26) : '—'}</td>
            <td class="r" style="color:${colP(pP)};font-weight:700">${pP !== null ? fmtP(pP) : '—'}</td>
          </tr>`;
        }).join('')}</tbody>
        <tfoot><tr>
          <td>TOTAL</td>
          <td class="r">${fmtN(T.tv25)}</td>
          <td class="r" style="color:#fff">${fmtN(T.tv26)}</td>
          <td class="r" style="color:${colP(T.pV26v25)};font-weight:700">${fmtP(T.pV26v25)}</td>
          <td class="r">${fmtN(T.tp25)}</td>
          <td class="r" style="color:#fff">${fmtN(T.tp26)}</td>
          <td class="r" style="color:${colP(T.pP26v25)};font-weight:700">${fmtP(T.pP26v25)}</td>
        </tr></tfoot>
      </table></div>
    </div>`,

    /* SLIDE 5 — CIERRE */
    `<div class="ss-slide" id="ss-slide-5"><div class="ss-end">
      <div class="ss-end-badge">FIS FIBER · Logística</div>
      <div class="ss-end-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></div>
      <div class="ss-end-title">Viajes y Piezas</div>
      <div class="ss-end-stat">
        <div class="ss-end-stat-item"><div class="ss-end-stat-val">${fmtN(T.tv26)}</div><div class="ss-end-stat-lbl">Viajes 2026</div></div>
        <div class="ss-end-stat-item"><div class="ss-end-stat-val">${fmtN(T.tp26)}</div><div class="ss-end-stat-lbl">Piezas 2026</div></div>
        <div class="ss-end-stat-item"><div class="ss-end-stat-val" style="color:${colP(T.pV26v25)}">${fmtP(T.pV26v25)}</div><div class="ss-end-stat-lbl">Viajes vs 2025</div></div>
        <div class="ss-end-stat-item"><div class="ss-end-stat-val" style="color:${colP(T.pP26v25)}">${fmtP(T.pP26v25)}</div><div class="ss-end-stat-lbl">Piezas vs 2025</div></div>
      </div>
      <div class="ss-end-sub">${periodo}</div>
    </div></div>`,
  ];

  _abrirSS('FIS <span>FIBER</span> · Viajes y Piezas');

  setTimeout(() => {
    const labels = data.map(r => r.mes.substring(0, 3));
    const yFmt = v => { const a = Math.abs(v); if (a >= 1000000) return Math.round(a / 1000000) + 'M'; if (a >= 1000) return Math.round(a / 1000) + 'k'; return a; };

    /* SS BAR VIAJES */
    DC('ss-vp-bar-v');
    CI['ss-vp-bar-v'] = new Chart(document.getElementById('ss-vp-bar-v'), { type: 'bar', data: { labels, datasets: [
      { label: '2023', data: data.map(r => r.v23), backgroundColor: 'rgba(107,114,128,0.4)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
      { label: '2024', data: data.map(r => r.v24), backgroundColor: 'rgba(26,95,160,0.55)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
      { label: '2025', data: data.map(r => r.v25), backgroundColor: 'rgba(184,122,16,0.6)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
      { label: '2026', data: data.map(r => r.v26 > 0 ? r.v26 : null), backgroundColor: data.map(r => r.v26 >= r.v25 ? 'rgba(74,222,128,0.85)' : 'rgba(255,120,138,0.85)'), borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: data.map(r => r.v26 >= r.v25 ? '#4ade80' : '#ff8896'), font: { size: 9, family: SS_MF, weight: '800' }, formatter: v => v || '' } }
    ] }, options: { ...ssChartDefaults(), plugins: { legend: { display: true, position: 'bottom', labels: { color: 'rgba(255,255,255,0.4)', font: { size: 10, family: 'Outfit' }, usePointStyle: true, padding: 10 } }, datalabels: {}, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${(c.parsed.y || 0).toLocaleString('es-MX')}` } } }, scales: { x: { grid: { display: false }, ticks: { color: SS_TC, font: { size: 9, family: SS_MF } }, border: { color: 'transparent' } }, y: { grid: { color: SS_GC }, ticks: { color: SS_TC, font: { size: 9 }, callback: yFmt }, border: { color: 'transparent' }, beginAtZero: true, grace: '18%' } } } });

    /* SS BAR PIEZAS */
    DC('ss-vp-bar-p');
    CI['ss-vp-bar-p'] = new Chart(document.getElementById('ss-vp-bar-p'), { type: 'bar', data: { labels, datasets: [
      { label: '2023', data: data.map(r => r.p23), backgroundColor: 'rgba(107,114,128,0.4)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
      { label: '2024', data: data.map(r => r.p24), backgroundColor: 'rgba(26,95,160,0.55)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
      { label: '2025', data: data.map(r => r.p25), backgroundColor: 'rgba(184,122,16,0.6)', borderRadius: 3, borderSkipped: false, datalabels: { display: false } },
      { label: '2026', data: data.map(r => r.p26 > 0 ? r.p26 : null), backgroundColor: data.map(r => r.p26 >= r.p25 ? 'rgba(74,222,128,0.85)' : 'rgba(255,120,138,0.85)'), borderRadius: 3, borderSkipped: false, datalabels: { display: true, anchor: 'end', align: 'end', offset: 1, color: data.map(r => r.p26 >= r.p25 ? '#4ade80' : '#ff8896'), font: { size: 9, family: SS_MF, weight: '800' }, formatter: v => v ? yFmt(v) : '' } }
    ] }, options: { ...ssChartDefaults(), plugins: { legend: { display: true, position: 'bottom', labels: { color: 'rgba(255,255,255,0.4)', font: { size: 10, family: 'Outfit' }, usePointStyle: true, padding: 10 } }, datalabels: {}, tooltip: { callbacks: { label: c => `${c.dataset.label}: ${(c.parsed.y || 0).toLocaleString('es-MX')}` } } }, scales: { x: { grid: { display: false }, ticks: { color: SS_TC, font: { size: 9, family: SS_MF } }, border: { color: 'transparent' } }, y: { grid: { color: SS_GC }, ticks: { color: SS_TC, font: { size: 9 }, callback: yFmt }, border: { color: 'transparent' }, beginAtZero: true, grace: '18%' } } } });

  }, 300);
}
