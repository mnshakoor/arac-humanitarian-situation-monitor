import { CONFIG } from './config.js';
import { classifyMomentum, computeHisi } from './signals.js';
import { storage } from './storage.js';
import { exportJson, exportCsv } from './export.js';
import { drawLineChart } from './charts.js';

const state = { snapshot:null, countries:[], selectedIso3:null, queryResults:[], maps:{} };
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const fmt = n => new Intl.NumberFormat().format(n ?? 0);
const pct = n => n == null ? 'n/a' : `${n >= 0 ? '+' : ''}${Number(n).toFixed(1)}%`;
const safe = v => String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
const escapeAttr = safe;

function normalizeReport(r={}) {
  if (r.primaryCountryIso3 !== undefined) return r;
  const pc = r.primary_country || {};
  const sources = r.source || [];
  const formats = r.format || [];
  const themes = r.theme || r.themes || [];
  return {
    ...r,
    dateOriginal:r.dateOriginal || r.date?.original || r['date.original'] || '',
    primaryCountry:r.primaryCountry || pc?.name || pc?.[0]?.name || '',
    primaryCountryIso3:String(pc?.iso3 || pc?.[0]?.iso3 || '').toLowerCase(),
    primaryCountryLocation:r.primaryCountryLocation || pc?.location || pc?.[0]?.location || null,
    source:typeof r.source === 'string' ? r.source : sources.map(s=>s.shortname||s.name).join(', '),
    format:typeof r.format === 'string' ? r.format : formats.map(x=>x.name).join(', '),
    themes:themes.map?.(x=>typeof x === 'string' ? x : x.name) || [],
    disasterTypes:(r.disasterTypes || r.disaster_type || []).map?.(x=>typeof x === 'string' ? x : x.name) || [],
    url:r.url_alias || r.url || r.href || ''
  };
}

function normalizeDisaster(d={}) {
  if (d.primaryCountryIso3 !== undefined) return d;
  const pc = d.primary_country || {};
  const pt = d.primary_type || {};
  const types = d.type || d.types || [];
  return {
    ...d,
    dateEvent:d.dateEvent || d.date?.event || '',
    primaryCountry:d.primaryCountry || pc?.name || '',
    primaryCountryIso3:String(pc?.iso3 || '').toLowerCase(),
    location:d.location || pc?.location || null,
    primaryType:d.primaryType || pt?.name || '',
    types:types.map?.(x=>typeof x === 'string' ? x : x.name) || [],
    url:d.url || d.href || ''
  };
}

function normalizeSnapshot(snapshot) {
  const reports = (snapshot.reports || []).map(normalizeReport);
  const disasters = (snapshot.disasters || []).map(normalizeDisaster);
  const names = new Map();
  const locations = new Map();
  for (const d of disasters) {
    if (d.primaryCountryIso3 && d.primaryCountry) names.set(d.primaryCountryIso3,d.primaryCountry);
    if (d.primaryCountryIso3 && d.location) locations.set(d.primaryCountryIso3,d.location);
  }
  for (const r of reports) {
    if (r.primaryCountryIso3 && r.primaryCountry) names.set(r.primaryCountryIso3,r.primaryCountry);
    if (r.primaryCountryIso3 && r.primaryCountryLocation) locations.set(r.primaryCountryIso3,r.primaryCountryLocation);
  }
  const countries = (snapshot.countries || []).map(c => {
    const iso3=String(c.iso3||'').toLowerCase();
    const name = c.name && c.name.toLowerCase() !== iso3 ? c.name : (names.get(iso3) || c.name || iso3.toUpperCase());
    const recentReports = c.recentReports?.length ? c.recentReports.map(normalizeReport) : reports.filter(r=>r.primaryCountryIso3===iso3 || (r.primaryCountry && r.primaryCountry===name));
    return {
      topThemes:[],topSources:[],topFormats:[],disasterTypes:[],timeline:[],uniqueSources:0,themeBreadth:0,formatBreadth:0,enrichmentStatus:'legacy',
      ...c,
      iso3,
      name,
      shortname:c.shortname || name,
      location:c.location || locations.get(iso3) || null,
      recentReports
    };
  });
  return {...snapshot,reports,disasters,countries};
}

async function loadSnapshot() {
  const res = await fetch(CONFIG.snapshotUrl, {cache:'no-store'});
  if (!res.ok) throw new Error(`Snapshot load failed (${res.status})`);
  state.snapshot = normalizeSnapshot(await res.json());
  state.countries = computeHisi(state.snapshot.countries || []);
}

function setView(id) {
  $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === id));
  $$('.view').forEach(v => v.hidden = v.id !== `view-${id}`);
  requestAnimationFrame(() => {
    if (id === 'global') state.maps.global?.invalidateSize();
    if (id === 'disasters') state.maps.disasters?.invalidateSize();
  });
}

function renderHeader() {
  $('#generated-at').textContent = new Date(state.snapshot.generatedAt).toLocaleString();
  $('#data-status').textContent = state.snapshot.status || 'snapshot';
  $('#version').textContent = CONFIG.version;
}

function renderKpis() {
  const s = state.snapshot.summary || {};
  const cards = [
    ['Reports · 30d',fmt(s.reports30d)],['Countries',fmt(s.countries)],['Unique sources',fmt(s.uniqueSources)],
    ['Active disasters',fmt(s.activeDisasters)],['Accelerating',fmt(state.countries.filter(c=>classifyMomentum(c.reports7d,c.previous7d).level==='high').length)],
    ['Profiled countries',fmt(s.profiledCountries || state.countries.filter(c=>c.hisiBasis==='FULL').length)]
  ];
  $('#kpi-grid').innerHTML = cards.map(([k,v])=>`<article class="kpi"><span>${safe(k)}</span><strong>${safe(v)}</strong></article>`).join('');
}

function renderGlobalThemes() {
  const items = (state.snapshot.globalThemes || []).slice(0,6);
  $('#global-top-themes').innerHTML = `<h3>Leading themes</h3>${items.length ? items.map(x=>`<div class="rank-row"><span>${safe(x.name)}</span><strong>${fmt(x.count)}</strong></div>`).join('') : '<p class="micro">Theme aggregates will populate on the next v2 core refresh.</p>'}`;
}

function countryRow(c) {
  const momentum = classifyMomentum(c.reports7d,c.previous7d);
  return `<tr><td><button class="link country-open" data-iso3="${escapeAttr(c.iso3)}">${safe(c.name)}</button></td><td>${fmt(c.reports30d)}</td><td>${fmt(c.reports7d)}</td><td>${pct(c.change7d)}</td><td>${c.uniqueSources?fmt(c.uniqueSources):'n/a'}</td><td>${c.themeBreadth?fmt(c.themeBreadth):'n/a'}</td><td><strong title="${c.hisiBasis==='FULL'?'Full HISI':'Provisional HISI using volume and momentum only'}">${c.hisi}${c.hisiBasis==='PROVISIONAL'?'*':''}</strong></td><td><span class="badge ${momentum.level}">${safe(momentum.label)}</span></td></tr>`;
}

function renderCountriesTable() {
  $('#country-table-body').innerHTML = [...state.countries].sort((a,b)=>b.reports30d-a.reports30d).map(countryRow).join('');
  $$('.country-open').forEach(b=>b.addEventListener('click',()=>openCountry(b.dataset.iso3,true)));
}

function populateSelectors() {
  const sorted = [...state.countries].sort((a,b)=>a.name.localeCompare(b.name));
  const options = sorted.map(c=>`<option value="${escapeAttr(c.iso3)}">${safe(c.name)}</option>`).join('');
  $('#country-select').innerHTML = `<option value="">Choose country...</option>${options}`;
  $('#query-country').innerHTML = `<option value="">All countries</option>${options}`;
  const themes = [...new Set((state.snapshot.globalThemes||[]).map(x=>x.name))].sort();
  $('#query-theme').innerHTML = `<option value="">All themes</option>${themes.map(x=>`<option>${safe(x)}</option>`).join('')}`;
  const formats = [...new Set((state.snapshot.globalFormats||[]).map(x=>x.name))].sort();
  $('#query-format').innerHTML = `<option value="">All formats</option>${formats.map(x=>`<option>${safe(x)}</option>`).join('')}`;
}

function renderPulse() {
  const signals = state.countries.map(c=>({c,m:classifyMomentum(c.reports7d,c.previous7d)})).filter(x=>x.m.level==='high').sort((a,b)=>(b.m.percent??0)-(a.m.percent??0)).slice(0,12);
  $('#pulse-list').innerHTML = signals.length ? signals.map(({c,m})=>`<article class="signal-card"><header><b><button class="link country-open-pulse" data-iso3="${escapeAttr(c.iso3)}">${safe(c.name)}</button></b><span class="badge high">REPORTING ACCELERATION</span></header><p><strong>${fmt(c.reports7d)}</strong> reports in current 7d vs <strong>${fmt(c.previous7d)}</strong> previously.</p><p>Change: ${m.absolute>=0?'+':''}${m.absolute} / ${pct(m.percent)}</p><small>Information-environment signal only. Not a humanitarian severity score.</small></article>`).join('') : '<p>No countries currently meet the configured acceleration threshold.</p>';
  $$('.country-open-pulse').forEach(b=>b.addEventListener('click',()=>openCountry(b.dataset.iso3,true)));
}

function reportCard(r) {
  return `<article class="report-card"><div><span class="eyebrow">${safe(r.primaryCountry)} · ${safe(r.format)}</span><h3>${safe(r.title)}</h3><p>${safe(r.source)} · ${safe(r.dateOriginal)}</p><div class="chips">${(r.themes||[]).slice(0,5).map(t=>`<span>${safe(t)}</span>`).join('')}</div></div>${r.url?`<a class="button ghost" href="${escapeAttr(r.url)}" target="_blank" rel="noopener">ReliefWeb ↗</a>`:''}</article>`;
}

function renderReports(reports=state.snapshot.reports||[], target='#reports-list', limit=50) {
  const el = $(target);
  if (!el) return;
  el.innerHTML = reports.length ? reports.slice(0,limit).map(reportCard).join('') : '<p class="muted">No matching reports in the current snapshot.</p>';
}

function rankBlock(title,items=[]) {
  return `<section class="workspace-card"><h3>${safe(title)}</h3><div class="rank-list">${items.length?items.slice(0,10).map(x=>`<div class="rank-row"><span>${safe(x.name)}</span><strong>${fmt(x.count)}</strong></div>`).join(''):'<p class="micro">Detailed enrichment is pending for this country.</p>'}</div></section>`;
}

function qapPayload(c) {
  return {
    schema:'arac.qap.reliefweb-signal.v1',generatedAt:new Date().toISOString(),sourceSnapshotGeneratedAt:state.snapshot.generatedAt,
    scope:{country:c.name,iso3:c.iso3,periodDays:30},
    reporting:{reports30d:c.reports30d,reports7d:c.reports7d,previous7d:c.previous7d,change7d:c.change7d,momentum:classifyMomentum(c.reports7d,c.previous7d)},
    informationSignal:{hisi:c.hisi,basis:c.hisiBasis,components:c.hisiParts},
    themes:c.topThemes||[],sources:c.topSources||[],formats:c.topFormats||[],disasterTypes:c.disasterTypes||[],
    activeDisasters:(state.snapshot.disasters||[]).filter(d=>d.primaryCountryIso3===c.iso3),recentReports:c.recentReports||[],
    methodology:{dateBasis:'date.original',countryCounting:'primary_country.iso3',severityBoundary:'Information-environment signal only; not a humanitarian severity determination.'},provenance:state.snapshot.provenance
  };
}

function openCountry(iso3,switchView=false) {
  state.selectedIso3 = iso3;
  const c = state.countries.find(x=>x.iso3===iso3);
  if (!c) return;
  if (switchView) setView('countries');
  $('#country-select').value = iso3;
  const disasters = (state.snapshot.disasters||[]).filter(d=>d.primaryCountryIso3===iso3);
  const momentum = classifyMomentum(c.reports7d,c.previous7d);
  $('#country-workspace').className='';
  $('#country-workspace').innerHTML = `<section class="panel"><div class="country-head"><div><span class="eyebrow">${safe(c.iso3.toUpperCase())} · COUNTRY WORKSPACE</span><h2>${safe(c.name)}</h2><p class="country-overview">${safe(c.overview || 'ReliefWeb country reporting signals and current disaster context.')}</p></div><div class="actions"><button id="country-watch" class="button ghost">${storage.getWatchlist().includes(iso3)?'Remove from watchlist':'Add to watchlist'}</button><button id="qap-export" class="button">Export QAP JSON</button></div></div><div class="detail-grid workspace-section"><article><span>Reports 30d</span><strong>${fmt(c.reports30d)}</strong></article><article><span>Reports 7d</span><strong>${fmt(c.reports7d)}</strong></article><article><span>7d change</span><strong>${pct(c.change7d)}</strong></article><article><span>Signal</span><strong>${safe(momentum.label)}</strong></article><article><span>HISI</span><strong>${c.hisi}${c.hisiBasis==='PROVISIONAL'?'*':''}/100</strong></article><article><span>Active contexts</span><strong>${fmt(disasters.length)}</strong></article></div></section><div class="workspace-grid workspace-section">${rankBlock('Leading themes',c.topThemes)}${rankBlock('Leading sources',c.topSources)}${rankBlock('Report formats',c.topFormats)}</div><div class="grid-2 workspace-section"><section class="panel"><h2>30-day reporting trend</h2><canvas id="country-trend" class="chart"></canvas></section><section class="panel"><h2>Current disaster contexts</h2><div class="rank-list">${disasters.length?disasters.map(d=>`<div class="rank-row"><span>${safe(d.name)}</span><strong>${safe(d.primaryType)}</strong></div>`).join(''):'<p class="micro">No active or alert ReliefWeb disaster entity in the synchronized set.</p>'}</div></section></div><section class="panel workspace-section"><h2>Recent reports</h2><div id="country-reports"></div></section><p class="micro">${c.hisiBasis==='PROVISIONAL'?'* Provisional HISI uses volume and momentum only until detailed country enrichment is available.':''}</p>`;
  $('#country-watch').addEventListener('click',()=>{storage.toggleWatchlist(iso3);openCountry(iso3,false);});
  $('#qap-export').addEventListener('click',()=>exportJson(`ahsm-${iso3}-qap-signal.json`,qapPayload(c)));
  renderReports(c.recentReports||[], '#country-reports', 12);
  if (c.timeline?.length) drawLineChart($('#country-trend'),c.timeline);
}

function mapCircleRadius(count,max) { return Math.max(4,Math.min(26,4+22*Math.sqrt((count||0)/(max||1)))); }
function renderGlobalMap() {
  if (!window.L || state.maps.global) return;
  const points = state.countries.filter(c=>Number.isFinite(c.location?.lat)&&Number.isFinite(c.location?.lon));
  const map = L.map('global-map',{worldCopyJump:true,minZoom:2}).setView([15,10],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:7,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  const max = Math.max(...points.map(c=>c.reports30d),1);
  points.forEach(c=>{
    const marker=L.circleMarker([c.location.lat,c.location.lon],{radius:mapCircleRadius(c.reports30d,max),weight:1,fillOpacity:.65});
    marker.bindPopup(`<b>${safe(c.name)}</b><br>${fmt(c.reports30d)} reports · 30d<br>${fmt(c.reports7d)} reports · 7d<br>${safe(classifyMomentum(c.reports7d,c.previous7d).label)}`);
    marker.on('dblclick',()=>openCountry(c.iso3,true));marker.addTo(map);
  });
  state.maps.global=map;
}

function renderDisasters(filter='') {
  const all = state.snapshot.disasters||[];
  const rows = filter ? all.filter(d=>(d.primaryType||'')===filter || (d.types||[]).includes(filter)) : all;
  $('#disaster-list').innerHTML = rows.map(d=>`<article class="disaster-card"><span class="eyebrow">${safe(d.status)} · ${safe(d.primaryType)}</span><h3>${safe(d.name)}</h3><p>${safe(d.primaryCountry)}${d.glide?` · ${safe(d.glide)}`:''}</p><p>Event date: ${safe(d.dateEvent||'n/a')}</p>${d.url?`<a href="${escapeAttr(d.url)}" target="_blank" rel="noopener">ReliefWeb ↗</a>`:''}</article>`).join('') || '<p class="muted">No matching current disaster contexts.</p>';
  if (!window.L) return;
  if (state.maps.disasters) { state.maps.disasters.remove(); state.maps.disasters=null; }
  const map=L.map('disaster-map',{worldCopyJump:true,minZoom:2}).setView([15,10],2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:8,attribution:'&copy; OpenStreetMap contributors'}).addTo(map);
  rows.filter(d=>Number.isFinite(d.location?.lat)&&Number.isFinite(d.location?.lon)).forEach(d=>L.circleMarker([d.location.lat,d.location.lon],{radius:7,weight:1,fillOpacity:.75}).bindPopup(`<b>${safe(d.name)}</b><br>${safe(d.primaryCountry)}<br>${safe(d.primaryType)} · ${safe(d.status)}`).addTo(map));
  state.maps.disasters=map;
}

function populateDisasterTypes() {
  const types=[...new Set((state.snapshot.disasters||[]).flatMap(d=>d.types||[d.primaryType]).filter(Boolean))].sort();
  $('#disaster-type-filter').innerHTML='<option value="">All disaster types</option>'+types.map(t=>`<option>${safe(t)}</option>`).join('');
}

function buildQueryBody() {
  const keywords=$('#query-keywords').value.trim(), iso3=$('#query-country').value, theme=$('#query-theme').value, format=$('#query-format').value;
  const conditions=[{field:'status',value:'published'}];
  if (iso3) conditions.push({field:'primary_country.iso3',value:iso3});
  if (theme) conditions.push({field:'theme.name',value:theme});
  if (format) conditions.push({field:'format.name',value:format});
  const body={limit:100,sort:['date.original:desc'],filter:{operator:'AND',conditions},fields:{include:['title','date.original','primary_country','source','theme','format','url','url_alias']}};
  if (keywords) body.query={value:keywords,fields:['title','body'],operator:'AND'};
  return body;
}

function runSnapshotQuery() {
  const keywords=$('#query-keywords').value.trim().toLowerCase(), iso3=$('#query-country').value, theme=$('#query-theme').value, format=$('#query-format').value;
  const results=(state.snapshot.reports||[]).filter(r=>{
    if (iso3 && r.primaryCountryIso3!==iso3) return false;
    if (theme && !(r.themes||[]).includes(theme)) return false;
    if (format && !(r.format||'').includes(format)) return false;
    if (keywords && !JSON.stringify(r).toLowerCase().includes(keywords)) return false;
    return true;
  });
  state.queryResults=results;$('#query-preview').textContent=JSON.stringify(buildQueryBody(),null,2);$('#query-count').textContent=`(${results.length})`;renderReports(results,'#query-results',100);
}

function bind() {
  $$('[data-view]').forEach(btn=>btn.addEventListener('click',()=>setView(btn.dataset.view)));
  $('#export-json').addEventListener('click',()=>exportJson('ahsm-snapshot.json',state.snapshot));
  $('#export-csv').addEventListener('click',()=>exportCsv('ahsm-countries.csv',state.countries.map(({name,iso3,reports30d,reports7d,previous7d,change7d,uniqueSources,themeBreadth,hisi,hisiBasis})=>({name,iso3,reports30d,reports7d,previous7d,change7d,uniqueSources,themeBreadth,hisi,hisiBasis}))));
  $('#report-search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();renderReports((state.snapshot.reports||[]).filter(r=>JSON.stringify(r).toLowerCase().includes(q)));});
  $('#country-select').addEventListener('change',e=>e.target.value&&openCountry(e.target.value,false));
  $('#disaster-type-filter').addEventListener('change',e=>renderDisasters(e.target.value));
  $('#run-query').addEventListener('click',runSnapshotQuery);
  $('#copy-query').addEventListener('click',async()=>{const text=JSON.stringify(buildQueryBody(),null,2);await navigator.clipboard.writeText(text);$('#copy-query').textContent='Copied';setTimeout(()=>$('#copy-query').textContent='Copy API request',1200);});
  $('#export-query').addEventListener('click',()=>exportJson('ahsm-query-results.json',{query:buildQueryBody(),snapshotGeneratedAt:state.snapshot.generatedAt,results:state.queryResults}));
  $('#mode-toggle').addEventListener('click',()=>{document.body.classList.toggle('community');const on=document.body.classList.contains('community');storage.setMode(on?'community':'standard');$('#mode-toggle').textContent=on?'Standard view':'Community view';});
}

async function init() {
  try {
    await loadSnapshot();renderHeader();renderKpis();renderGlobalThemes();renderCountriesTable();renderPulse();renderReports();populateSelectors();populateDisasterTypes();bind();drawLineChart($('#global-trend'),state.snapshot.timeline||[]);renderGlobalMap();renderDisasters();runSnapshotQuery();
    if (storage.getMode()==='community'){document.body.classList.add('community');$('#mode-toggle').textContent='Standard view';}
  } catch(error) { $('#app-error').hidden=false;$('#app-error').textContent=`Unable to load humanitarian snapshot: ${error.message}`; }
}
init();
