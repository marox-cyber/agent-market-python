import { aggregate, toCsv, EXPLORER, ROUTER, VENUES, DEPLOY_BLOCK, RPC, TOPIC, LOG_SPAN } from '/analytics.js';
const $ = id => document.getElementById(id);
const state = { data: null, range: 'all', chart: 'volume', venue: '', search: '', page: 0, tab: 'overview', busy: false };
const money = n => '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
const number = n => new Intl.NumberFormat('en-US').format(n);
const short = a => a.slice(0, 6) + '…' + a.slice(-4);
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const qty = n => n == null ? 'Unknown' : n === 0 ? '0' : n < .00001 ? n.toExponential(3) : new Intl.NumberFormat('en-US', { maximumFractionDigits: n < 1 ? 6 : 3 }).format(n);
const formatTime = t => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(t * 1000);
const formatDay = t => new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', day: '2-digit', month: 'short' }).format(t * 1000);
const showToast = message => { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(window.toastTimer); window.toastTimer = setTimeout(() => $('toast').hidden = true, 3500); };
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function queries() {
  return { network: 4663, endpoint: state.data.rpc || RPC, event: 'Routed(address,address,address,address,address,uint256,uint256,address,address,address)',
    requests: Array.from({ length: Math.ceil((state.data.coverage.toBlock - DEPLOY_BLOCK + 1) / LOG_SPAN) }, (_, i) => ({
      jsonrpc: '2.0', id: i + 1, method: 'eth_getLogs', params: [{ address: ROUTER,
        fromBlock: '0x' + (DEPLOY_BLOCK + i * LOG_SPAN).toString(16),
        toBlock: '0x' + Math.min(state.data.coverage.toBlock, DEPLOY_BLOCK + (i + 1) * LOG_SPAN - 1).toString(16), topics: [TOPIC] }],
    })) };
}
function stats() { return aggregate(state.data.swaps, { range: state.range, venue: state.venue, search: state.search }); }
function renderChart(s) {
  const b = s.buckets, metric = state.chart;
  const max = Math.max(1, ...b.map(x => x[metric]));
  const width = 680, height = 215, x0 = 53, y0 = 15, cw = width - x0 - 18, ch = 155;
  const x = i => x0 + (b.length === 1 ? cw / 2 : i / (b.length - 1) * cw);
  const y = value => y0 + ch - value / max * ch;
  const points = b.map((p, i) => x(i).toFixed(2) + ',' + y(p[metric]).toFixed(2));
  const line = points.length ? 'M' + points.join(' L') : '';
  const area = points.length ? line + ' L' + x(b.length - 1) + ',' + (y0 + ch) + ' L' + x(0) + ',' + (y0 + ch) + ' Z' : '';
  const ticks = [0, .25, .5, .75, 1].map(f => { const v = max * f, yy = y(v); return '<line x1="' + x0 + '" x2="' + (width - 15) + '" y1="' + yy + '" y2="' + yy + '" stroke="#28382d" stroke-width=".7" stroke-dasharray="3 5"/><text x="' + (x0 - 12) + '" y="' + (yy + 4) + '" text-anchor="end">' + (metric === 'volume' ? '$' : '') + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : metric === 'swaps' && v % 1 !== 0 ? '' : v.toFixed(v < 5 && metric === 'volume' ? 1 : 0)) + '</text>'; }).join('');
  const labels = [...new Set([0, Math.round((b.length - 1) / 3), Math.round((b.length - 1) * 2 / 3), b.length - 1])].filter(i => b[i]).map(i => '<text x="' + x(i) + '" y="200" text-anchor="' + (i === 0 ? 'start' : i === b.length - 1 ? 'end' : 'middle') + '">' + (state.range === '24h' ? formatTime(b[i].time).slice(0, 5) : formatDay(b[i].time)) + '</text>').join('');
  const bars = b.map((p, i) => '<rect class="hit-bar" data-bucket="' + i + '" x="' + (x(i) - Math.max(4, cw / Math.max(1, b.length - 1) / 2)) + '" y="0" width="' + Math.max(8, cw / Math.max(1, b.length - 1)) + '" height="180"><title>' + formatDay(p.time) + ' ' + (state.range === '24h' ? formatTime(p.time) : '') + ': ' + (metric === 'volume' ? money(p.volume) : p.swaps + ' swaps') + '</title></rect>').join('');
  $('chart').innerHTML = '<svg viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" role="img" aria-label="' + escape(metric === 'volume' ? 'Daily USDG-priced volume' : 'Settled swap count') + '"><defs><linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a9edb8" stop-opacity=".2"/><stop offset="100%" stop-color="#a9edb8" stop-opacity=".01"/></linearGradient></defs>' + ticks + '<path d="' + area + '" fill="url(#chart-gradient)"/><path d="' + line + '" stroke="#a9e5b7" stroke-width="2.5" fill="none" vector-effect="non-scaling-stroke"/>' + b.filter(p => p[metric] > 0).map(p => '<circle cx="' + x(b.indexOf(p)) + '" cy="' + y(p[metric]) + '" r="3" fill="#c6f1ce" stroke="#172d1d" stroke-width="2"/>').join('') + labels + bars + '</svg><div class="chart-tooltip" hidden></div>';
  const tooltip = $('chart').querySelector('.chart-tooltip');
  $('chart').querySelectorAll('[data-bucket]').forEach(el => {
    el.addEventListener('pointerenter', () => { const p = b[Number(el.dataset.bucket)]; tooltip.textContent = formatDay(p.time) + (state.range === '24h' ? ' ' + formatTime(p.time).slice(0, 5) : '') + ' · ' + (metric === 'volume' ? money(p.volume) + ' USDG' : number(p.swaps) + ' swaps'); tooltip.hidden = false; });
    el.addEventListener('pointerleave', () => tooltip.hidden = true);
  });
  $('chart-total').textContent = metric === 'volume' ? money(s.volume) : number(s.count);
  $('chart-unit').textContent = metric === 'volume' ? 'USDG in selected period' : 'settled swaps in selected period';
  $('chart-subtitle').textContent = (state.range === '24h' ? 'Hourly' : 'Daily') + (metric === 'volume' ? ' USDG-priced volume' : ' settled swaps') + ' · UTC';
  $('chart-legend').textContent = metric === 'volume' ? 'USDG-priced volume' : 'Settled swaps';
}

function render() {
  if (!state.data) return;
  const s = stats(), d = state.data;
  $('metric-volume').textContent = money(s.volume);
  $('metric-swaps').textContent = number(s.count);
  $('metric-traders').textContent = number(s.uniqueTraders);
  $('metric-venues').textContent = number(s.venues.length);
  $('volume-meta').textContent = s.priced + ' of ' + s.count + ' swaps priced · ' + s.unpriced + ' unpriced';
  $('venue-meta').textContent = s.twoHop + ' two-hop ' + (s.twoHop === 1 ? 'swap' : 'swaps') + ' · ' + (s.count - s.twoHop) + ' direct';
  $('period-label').textContent = { all: 'All time', '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days' }[state.range];
  const stale = d.status !== 'live' || Date.now() / 1000 - d.collectedAt > 600;
  $('data-banner').classList.toggle('warning', stale);
  $('data-status').textContent = (stale ? 'Saved on-chain snapshot' : 'RPC verified') + ' · Collected ' + formatDay(d.collectedAt) + ' ' + formatTime(d.collectedAt) + ' UTC' + (d.error ? ' · RPC refresh unavailable' : '');
  $('coverage').textContent = 'Indexed through #' + number(d.coverage.toBlock) + ' · ' + formatTime(d.coverage.toTime) + ' UTC';
  $('method-coverage').textContent = 'Block ' + number(d.coverage.fromBlock) + ' to ' + number(d.coverage.toBlock) + ' · 64-block buffer';
  $('router-link').textContent = ROUTER; $('router-link').href = EXPLORER + '/address/' + ROUTER;
  const rpcLink = document.querySelector('.method-card dd a[href*="robinhood.com"], .method-card dd a[href*="pocket.network"]');
  if (rpcLink) { rpcLink.href = d.rpc || RPC; rpcLink.textContent = (d.rpc || RPC).replace('https://', ''); }
  $('query-code').textContent = JSON.stringify(queries(), null, 2);
  renderChart(s);
  $('venue-bars').innerHTML = s.venues.length ? s.venues.map((v, i) => '<div class="venue-row"><div class="venue-label"><span class="venue-name"><i style="background:' + ['#312733', '#29382b', '#263337', '#332e24'][i % 4] + '">' + escape(v.name === 'Uniswap V4' ? 'U4' : v.name === 'Uniswap V3' ? 'U3' : v.name.slice(0, 2)) + '</i>' + escape(v.name) + '</span><span class="venue-quantity">' + v.swaps + ' <span class="muted">· ' + Math.round(v.swaps / s.count * 100) + '%</span></span></div><div class="venue-track"><div class="venue-fill" style="width:' + (v.swaps / Math.max(1, s.count) * 100) + '%;opacity:' + (1 - i * .12) + '"></div></div></div>').join('') : '<div class="empty">No settled routes in this period.</div>';
  if (!state.venue && !state.search) {
    const current = $('venue-filter').value;
    const addresses = [...new Set(d.swaps.flatMap(x => x.venues))];
    $('venue-filter').innerHTML = '<option value="">All venues</option>' + addresses.map(v => '<option value="' + escape(v) + '">' + escape(VENUES[v] || short(v)) + ' · ' + short(v) + '</option>').join('');
    $('venue-filter').value = current;
  }
  $('routes').innerHTML = s.routes.length ? s.routes.slice(0, 5).map((r, i) => '<div class="compact-row"><span class="rank">' + String(i + 1).padStart(2, '0') + '</span><div class="row-main">' + escape(r.name) + '<small>' + r.swaps + ' ' + (r.swaps === 1 ? 'swap' : 'swaps') + '</small></div><span class="row-value">' + money(r.volume) + '</span></div>').join('') : '<div class="empty">No routes in this period.</div>';
  $('traders').innerHTML = s.traders.length ? s.traders.slice(0, 5).map((t, i) => '<div class="compact-row"><span class="rank">' + String(i + 1).padStart(2, '0') + '</span><div class="row-main"><a class="wallet" href="' + EXPLORER + '/address/' + t.address + '" target="_blank" rel="noopener" title="' + t.address + '">' + short(t.address) + '</a><small>' + t.swaps + ' ' + (t.swaps === 1 ? 'swap' : 'swaps') + '</small></div><span class="row-value">' + money(t.volume) + '</span></div>').join('') : '<div class="empty">No traders in this period.</div>';
  const pageSize = 8, pages = Math.max(1, Math.ceil(s.count / pageSize));
  state.page = Math.min(state.page, pages - 1);
  const rows = s.filtered.slice(state.page * pageSize, (state.page + 1) * pageSize);
  $('table-count').textContent = s.count;
  $('result-label').textContent = s.count + ' matching swaps';
  $('transactions').innerHTML = rows.length ? rows.map(x => '<tr><td><div class="pair">' + escape(x.symIn) + '<span class="pair-separator">/</span>' + escape(x.symOut) + '</div><a class="tx-hash" href="' + EXPLORER + '/tx/' + x.hash + '" target="_blank" rel="noopener" title="' + x.hash + ' · log ' + x.logIndex + '">' + short(x.hash) + ' · log ' + x.logIndex + '</a></td><td title="Raw integer: ' + x.rawIn + '">' + qty(x.amountIn) + '<span class="token-symbol">' + escape(x.symIn) + '</span></td><td title="Raw integer: ' + x.rawOut + '">' + qty(x.amountOut) + '<span class="token-symbol">' + escape(x.symOut) + '</span></td><td>' + (x.usd == null ? '<span class="unpriced">Unpriced</span>' : money(x.usd)) + '</td><td><span class="route-tag">' + escape(x.route) + '</span></td><td><a class="wallet" href="' + EXPLORER + '/address/' + x.trader + '" target="_blank" rel="noopener" title="' + x.trader + '">' + short(x.trader) + '</a></td><td class="time">' + formatDay(x.time) + '<small>' + formatTime(x.time) + '</small></td></tr>').join('') : '<tr><td colspan="7" class="empty">No swaps match these filters.<small>Try a longer period, another token or all venues.</small></td></tr>';
  $('pagination-info').textContent = s.count ? 'Showing ' + (state.page * pageSize + 1) + '–' + Math.min((state.page + 1) * pageSize, s.count) + ' of ' + s.count + ' swaps' : '0 swaps';
  $('page-number').textContent = (state.page + 1) + ' / ' + pages;
  $('prev').disabled = state.page === 0; $('next').disabled = state.page >= pages - 1;
}

async function load(force = false) {
  if (state.busy) return;
  state.busy = true; $('refresh').classList.add('busy'); $('refresh').disabled = true;
  try {
    const response = await fetch('/api/swaps' + (force ? '?refresh=1' : ''), { cache: 'no-store', signal: AbortSignal.timeout(35000) });
    if (!response.ok) throw new Error('Data HTTP ' + response.status);
    const data = await response.json();
    if (!Array.isArray(data.swaps) || !data.coverage?.complete) throw new Error('Incomplete dataset');
    state.data = data; render();
    if (force) showToast(data.status === 'live' ? 'On-chain data refreshed.' : 'Showing the last verified snapshot. RPC refresh unavailable.');
  } catch (e) {
    if (state.data) { state.data.status = 'stale'; state.data.error = 'Refresh unavailable'; render(); }
    else { $('data-banner').classList.add('warning'); $('data-status').textContent = 'Data unavailable. Please refresh to try again.'; }
    showToast('Could not refresh data. No activity has been estimated.');
  } finally { state.busy = false; $('refresh').classList.remove('busy'); $('refresh').disabled = false; }
}
function setTab(tab) {
  state.tab = tab; document.body.dataset.tab = tab;
  document.querySelectorAll('.nav-item').forEach(b => { b.classList.toggle('active', b.dataset.tab === tab); if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  $('methodology-view').hidden = tab !== 'methodology'; $('dashboard-view').hidden = tab === 'methodology';
  $('breadcrumb-current').textContent = { overview: 'Overview', activity: 'Swap explorer', methodology: 'Methodology' }[tab];
  $('page-title').innerHTML = { overview: 'Follow the flow<span>.</span>', activity: 'Every swap, in view<span>.</span>', methodology: 'Verify the flow<span>.</span>' }[tab];
  $('page-description').textContent = { overview: 'A clearer view of every swap, trader and route through Stoa.', activity: 'Search settled transactions. Open the evidence on-chain.', methodology: 'Open data. Clear definitions. Reproducible results.' }[tab];
  history.replaceState(null, '', tab === 'overview' ? '/' : '/#' + tab);
}
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
document.querySelectorAll('[data-range]').forEach(b => b.addEventListener('click', () => { state.range = b.dataset.range; state.page = 0; document.querySelectorAll('[data-range]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); }); render(); }));
document.querySelectorAll('[data-chart]').forEach(b => b.addEventListener('click', () => { state.chart = b.dataset.chart; document.querySelectorAll('[data-chart]').forEach(x => { x.classList.toggle('selected', x === b); x.setAttribute('aria-pressed', String(x === b)); }); if (state.data) renderChart(stats()); }));
$('search').addEventListener('input', e => { state.search = e.target.value; state.page = 0; render(); });
$('venue-filter').addEventListener('change', e => { state.venue = e.target.value; state.page = 0; render(); });
$('prev').addEventListener('click', () => { state.page--; render(); });
$('next').addEventListener('click', () => { state.page++; render(); });
$('refresh').addEventListener('click', () => load(true));
$('export').addEventListener('click', () => { if (!state.data) return showToast('Wait for data to load.'); download('stoa-flow-' + state.range + '.csv', toCsv(stats().filtered), 'text/csv;charset=utf-8'); showToast('CSV exported with the current filters.'); });
$('copy-query').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('query-code').textContent); showToast('Reproducible query copied.'); } catch { download('stoa-flow-queries.json', $('query-code').textContent, 'application/json'); showToast('Query downloaded.'); } });
if (['activity', 'methodology'].includes(location.hash.slice(1))) setTab(location.hash.slice(1));
async function start() {
  try {
    const response = await fetch('/api/snapshot', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.swaps) && data.coverage?.complete) { state.data = data; render(); }
    }
  } catch { /* the regular refresh handles and displays errors */ }
  load();
}
start();
setInterval(() => { if (!document.hidden) load(); }, 60000);
