import { CONFIG } from './config.js';
import { classifyMomentum, computeHisi } from './signals.js';
import { storage } from './storage.js';
import { exportJson, exportCsv } from './export.js';
import { drawLineChart } from './charts.js';

const state = { snapshot: null, countries: [], selectedIso3: null, window: CONFIG.defaultWindow };
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

function fmt(n) { return new Intl.NumberFormat().format(n ?? 0); }
function pct(n) { return n == null ? 'n/a' : `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }
function safe(v) { return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }

async function loadSnapshot() {
  const res = await fetch(CONFIG.snapshotUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Snapshot load failed (${res.status})`);
  state.snapshot = await res.json();
  state.countries = computeHisi(state.snapshot.countries || []);
}

function renderHeader() {
  $('#generated-at').textContent = new Date(state.snapshot.generatedAt).toLocaleString();
  $('#data-status').textContent = state.snapshot.status || 'snapshot';
  $('#version').textContent = CONFIG.version;
}

function renderKpis() {
  const s = state.snapshot.summary;
  const cards = [
    ['Reports · 30d', fmt(s.reports30d)], ['Countries', fmt(s.countries)], ['Unique sources', fmt(s.uniqueSources)],
    ['Active disasters', fmt(s.activeDisasters)], ['Accelerating', fmt(state.countries.filter(c => classifyMomentum(c.reports7d,c.previous7d).level === 'high').length)],
    ['Freshness', state.snapshot.stale ? 'STALE' : 'CURRENT']
  ];
  $('#kpi-grid').innerHTML = cards.map(([k,v]) => `<article class="kpi"><span>${safe(k)}</span><strong>${safe(v)}</strong></article>`).join('');
}

function countryRow(c) {
  const momentum = classifyMomentum(c.reports7d, c.previous7d);
  return `<tr data-country="${safe(c.iso3)}"><td><button class="link country-open" data-iso3="${safe(c.iso3)}">${safe(c.name)}</button></td><td>${fmt(c.reports30d)}</td><td>${fmt(c.reports7d)}</td><td>${pct(c.change7d)}</td><td>${fmt(c.uniqueSources)}</td><td>${fmt(c.themeBreadth)}</td><td><strong>${c.hisi}</strong></td><td><span class="badge ${momentum.level}">${safe(momentum.label)}</span></td></tr>`;
}

function renderCountries() {
  const rows = [...state.countries].sort((a,b) => b.reports30d-a.reports30d).map(countryRow).join('');
  $('#country-table-body').innerHTML = rows;
  $$('.country-open').forEach(b => b.addEventListener('click', () => openCountry(b.dataset.iso3)));
}

function renderPulse() {
  const signals = state.countries.map(c => ({ c, m: classifyMomentum(c.reports7d,c.previous7d) })).filter(x => x.m.level === 'high').sort((a,b) => (b.m.percent ?? 0)-(a.m.percent ?? 0)).slice(0,6);
  $('#pulse-list').innerHTML = signals.length ? signals.map(({c,m}) => `<article class="signal-card"><header><b>${safe(c.name)}</b><span class="badge high">REPORTING ACCELERATION</span></header><p><strong>${fmt(c.reports7d)}</strong> reports in current 7d vs <strong>${fmt(c.previous7d)}</strong> previously.</p><p>Change: ${m.absolute >= 0 ? '+' : ''}${m.absolute} / ${pct(m.percent)}</p><small>Information-environment signal only. Not a humanitarian severity score.</small></article>`).join('') : '<p>No countries currently meet the configured acceleration threshold.</p>';
}

function renderReports(reports = state.snapshot.reports || []) {
  $('#reports-list').innerHTML = reports.slice(0,20).map(r => `<article class="report-card"><div><span class="eyebrow">${safe(r.primaryCountry)} · ${safe(r.format)}</span><h3>${safe(r.title)}</h3><p>${safe(r.source)} · ${safe(r.dateOriginal)}</p><div class="chips">${(r.themes||[]).slice(0,4).map(t=>`<span>${safe(t)}</span>`).join('')}</div></div><a class="button ghost" href="${safe(r.url)}" target="_blank" rel="noopener">ReliefWeb ↗</a></article>`).join('');
}

function openCountry(iso3) {
  state.selectedIso3 = iso3;
  const c = state.countries.find(x => x.iso3 === iso3);
  if (!c) return;
  $('#country-detail').hidden = false;
  $('#country-detail-title').textContent = `${c.name} · ${c.iso3}`;
  $('#country-detail-body').innerHTML = `<div class="detail-grid"><article><span>Reports 30d</span><strong>${fmt(c.reports30d)}</strong></article><article><span>Reports 7d</span><strong>${fmt(c.reports7d)}</strong></article><article><span>7d change</span><strong>${pct(c.change7d)}</strong></article><article><span>Unique sources</span><strong>${fmt(c.uniqueSources)}</strong></article><article><span>Theme breadth</span><strong>${fmt(c.themeBreadth)}</strong></article><article><span>HISI</span><strong>${c.hisi}/100</strong></article></div><div class="split"><section><h4>Leading themes</h4><ol>${(c.topThemes||[]).map(x=>`<li>${safe(x.name)} <span>${fmt(x.count)}</span></li>`).join('')}</ol></section><section><h4>Leading sources</h4><ol>${(c.topSources||[]).map(x=>`<li>${safe(x.name)} <span>${fmt(x.count)}</span></li>`).join('')}</ol></section></div>`;
  $('#country-watch').textContent = storage.getWatchlist().includes(iso3) ? 'Remove from watchlist' : 'Add to watchlist';
  $('#country-detail').scrollIntoView({behavior:'smooth',block:'start'});
}

function bind() {
  $$('[data-view]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-view]').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const id = btn.dataset.view; $$('.view').forEach(v => v.hidden = v.id !== `view-${id}`);
  }));
  $('#country-watch').addEventListener('click', () => { if (!state.selectedIso3) return; storage.toggleWatchlist(state.selectedIso3); openCountry(state.selectedIso3); });
  $('#export-json').addEventListener('click', () => exportJson('ahsm-snapshot.json', state.snapshot));
  $('#export-csv').addEventListener('click', () => exportCsv('ahsm-countries.csv', state.countries.map(({name,iso3,reports30d,reports7d,previous7d,change7d,uniqueSources,themeBreadth,hisi}) => ({name,iso3,reports30d,reports7d,previous7d,change7d,uniqueSources,themeBreadth,hisi}))));
  $('#report-search').addEventListener('input', e => { const q = e.target.value.toLowerCase(); renderReports((state.snapshot.reports||[]).filter(r => JSON.stringify(r).toLowerCase().includes(q))); });
  $('#mode-toggle').addEventListener('click', () => { document.body.classList.toggle('community'); const on=document.body.classList.contains('community'); storage.setMode(on?'community':'standard'); $('#mode-toggle').textContent=on?'Standard view':'Community view'; });
}

async function init() {
  try {
    await loadSnapshot();
    renderHeader(); renderKpis(); renderCountries(); renderPulse(); renderReports(); bind();
    drawLineChart($('#global-trend'), state.snapshot.timeline || []);
    if (storage.getMode() === 'community') { document.body.classList.add('community'); $('#mode-toggle').textContent='Standard view'; }
  } catch (error) {
    $('#app-error').hidden = false; $('#app-error').textContent = `Unable to load humanitarian snapshot: ${error.message}`;
  }
}
init();
