const V03_KEY='ahsm.queryProfiles';
let data=null;
let countries=new Map();
const norm=v=>String(v||'').trim().toLowerCase();
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=n=>new Intl.NumberFormat().format(Number(n||0));
const pct=n=>n==null?'n/a':`${Number(n)>=0?'+':''}${Number(n).toFixed(1)}%`;

function sourceEcology(c){
  if(c.sourceEcology)return c.sourceEcology;
  const rows=c.topSources||[], total=rows.reduce((s,x)=>s+Number(x.count||0),0);
  if(!total)return null;
  const shares=rows.map(x=>Number(x.count||0)/total).filter(x=>x>0);
  const h=-shares.reduce((s,p)=>s+p*Math.log(p),0);
  return {assignments:total,top1Share:(shares[0]||0)*100,top5Share:shares.slice(0,5).reduce((a,b)=>a+b,0)*100,shannonEntropy:h,effectiveSourceCount:Math.exp(h)};
}

function momentumRows(rows=[]){
  return rows.slice(0,8).map(x=>`<div class="momentum-row"><span>${safe(x.name)}</span><strong>${fmt(x.current||0)}</strong><span class="muted">vs ${fmt(x.previous||0)}</span><b class="${Number(x.changePct||0)>30?'up':Number(x.changePct||0)<-30?'down':''}">${pct(x.changePct)}</b></div>`).join('');
}

function enhanceWorkspace(){
  const workspace=document.querySelector('#country-workspace');
  const select=document.querySelector('#country-select');
  if(!workspace||!select?.value)return;
  const iso=norm(select.value), c=countries.get(iso); if(!c)return;
  if(workspace.dataset.v03Iso===iso&&workspace.querySelector('.v03-analytics'))return;
  const existing=workspace.querySelector('.v03-analytics');
  if(existing)existing.remove();
  const eco=sourceEcology(c);
  const wrap=document.createElement('section'); wrap.className='v03-analytics workspace-section';
  wrap.innerHTML=`<div class="grid-2"><section class="panel"><div class="panel-head"><div><h2>Theme momentum</h2><p>Current 7 days compared with the previous 7 days.</p></div></div>${c.themeMomentum?.length?`<div class="momentum-table">${momentumRows(c.themeMomentum)}</div>`:'<p class="micro">Theme momentum will populate after the next country enrichment pass.</p>'}</section><section class="panel"><div class="panel-head"><div><h2>Source ecology</h2><p>Concentration and diversity of source assignments in the 30-day country profile.</p></div></div>${eco?`<div class="ecology-grid"><article><span>Unique sources</span><strong>${fmt(c.uniqueSources||0)}</strong></article><article><span>Top source share</span><strong>${eco.top1Share.toFixed(1)}%</strong></article><article><span>Top 5 share</span><strong>${eco.top5Share.toFixed(1)}%</strong></article><article><span>Effective source count</span><strong>${eco.effectiveSourceCount.toFixed(1)}</strong></article></div>`:'<p class="micro">Source ecology will populate after the next country enrichment pass.</p>'}<p class="micro">Source diversity and concentration do not establish independent corroboration.</p></section></div><details class="panel provenance-drawer"><summary>Data provenance & freshness</summary><div class="provenance-grid"><span>Snapshot generated</span><strong>${safe(data.generatedAt||'n/a')}</strong><span>Country enriched</span><strong>${safe(c.enrichedAt||data.enrichedAt||'pending')}</strong><span>Enrichment status</span><strong>${safe(c.enrichmentStatus||'unknown')}</strong><span>Data provider</span><strong>${safe(data.provenance?.provider||'ReliefWeb API V2')}</strong><span>Date basis</span><strong>${safe(data.provenance?.dateBasis||'date.original')}</strong><span>Country counting</span><strong>${safe(data.provenance?.countryCounting||'primary_country.iso3')}</strong></div><p class="micro">Reporting intensity, momentum, thematic breadth and source ecology describe the information environment. They do not independently determine humanitarian severity.</p></details>`;
  const recent=[...workspace.querySelectorAll('.workspace-section')].find(x=>x.querySelector?.('#country-reports'));
  (recent||workspace.lastElementChild)?.before?.(wrap);
  workspace.dataset.v03Iso=iso;
  replaceQapExport(c);
  const url=new URL(location.href);url.searchParams.set('country',iso.toUpperCase());history.replaceState(null,'',url);
}

function expandedQap(c){
  const disasters=(data.disasters||[]).filter(d=>norm(d.primaryCountryIso3)===norm(c.iso3));
  return {schema:'arac.qap.reliefweb-signal.v2',generatedAt:new Date().toISOString(),sourceSnapshotGeneratedAt:data.generatedAt,scope:{country:c.name,iso3:String(c.iso3||'').toUpperCase(),periodDays:30},reporting:{reports30d:c.reports30d,reports7d:c.reports7d,previous7d:c.previous7d,change7d:c.change7d,timeline:c.timeline||[]},informationSignal:{hisi:c.hisi,basis:c.hisiBasis,components:c.hisiParts||{}},themes:{leading:c.topThemes||[],momentum:c.themeMomentum||[]},sources:{leading:c.topSources||[],momentum:c.sourceMomentum||[],ecology:sourceEcology(c)},formats:c.topFormats||[],disasterTypes:c.disasterTypes||[],activeDisasters:disasters,recentReports:c.recentReports||[],qap:{kiqMapping:[],keyJudgments:[],indicators:[],analystNotes:''},methodology:{dateBasis:'date.original',countryCounting:'primary_country.iso3',severityBoundary:'Information-environment signal only; not a humanitarian severity determination.',sourceBoundary:'Source diversity is not equivalent to independent corroboration.'},provenance:data.provenance||{}};
}
function download(name,obj){const blob=new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function replaceQapExport(c){const old=document.querySelector('#qap-export');if(!old||old.dataset.v03==='1')return;const b=old.cloneNode(true);b.dataset.v03='1';b.textContent='Export QAP JSON';old.replaceWith(b);b.addEventListener('click',()=>download(`ahsm-${norm(c.iso3)}-qap-v2.json`,expandedQap(c)));}

function renderWatchlist(){
  const list=JSON.parse(localStorage.getItem('ahsm.watchlist')||'[]').map(norm);
  const target=document.querySelector('#v03-watchlist-grid');if(!target)return;
  const rows=list.map(x=>countries.get(x)).filter(Boolean);
  target.innerHTML=rows.length?rows.map(c=>`<article class="watch-card"><div><span class="eyebrow">${safe(String(c.iso3||'').toUpperCase())}</span><h3>${safe(c.name)}</h3></div><div class="watch-metrics"><span>30d <b>${fmt(c.reports30d)}</b></span><span>7d Δ <b>${pct(c.change7d)}</b></span><span>HISI <b>${fmt(c.hisi)}${c.hisiBasis==='PROVISIONAL'?'*':''}</b></span></div><button class="button ghost v03-open-country" data-iso="${safe(c.iso3)}">Open workspace</button></article>`).join(''):'<section class="panel"><p>No countries are on your local watchlist yet. Add countries from a Country Workspace.</p></section>';
  target.querySelectorAll('.v03-open-country').forEach(b=>b.addEventListener('click',()=>openViaUi(b.dataset.iso)));
}

function addWatchlistView(){
  const nav=document.querySelector('.nav');const content=document.querySelector('.content');if(!nav||!content||document.querySelector('[data-view="watchlist"]'))return;
  const btn=document.createElement('button');btn.dataset.view='watchlist';btn.textContent='Watchlist';
  const reports=[...nav.querySelectorAll('button')].find(x=>x.dataset.view==='reports');nav.insertBefore(btn,reports||null);
  const section=document.createElement('section');section.id='view-watchlist';section.className='view';section.hidden=true;section.innerHTML='<div class="hero"><div><span class="eyebrow">LOCAL PRIORITY MONITOR</span><h1>My Watchlist</h1><p>Countries saved in this browser, summarized from the current ReliefWeb snapshot.</p></div></div><div id="v03-watchlist-grid" class="watchlist-grid"></div>';
  content.append(section);
  btn.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.view').forEach(v=>v.hidden=v!==section);renderWatchlist();});
}

function openViaUi(iso){
  const nav=document.querySelector('[data-view="countries"]');nav?.click();
  setTimeout(()=>{const s=document.querySelector('#country-select');if(!s)return;s.value=norm(iso);s.dispatchEvent(new Event('change',{bubbles:true}));},30);
}

function addSavedQueries(){
  const actions=document.querySelector('.query-actions');if(!actions||document.querySelector('#save-query-profile'))return;
  const save=document.createElement('button');save.id='save-query-profile';save.className='button ghost';save.textContent='Save query';
  const sel=document.createElement('select');sel.id='query-profile-select';sel.className='select compact-select';sel.innerHTML='<option value="">Saved queries...</option>';
  actions.append(save,sel);
  const read=()=>{try{return JSON.parse(localStorage.getItem(V03_KEY)||'[]')}catch{return[]}};
  const refresh=()=>{sel.innerHTML='<option value="">Saved queries...</option>'+read().map((x,i)=>`<option value="${i}">${safe(x.name)}</option>`).join('')};refresh();
  save.addEventListener('click',()=>{const name=prompt('Name this query profile');if(!name)return;const rows=read();rows.push({name,keywords:document.querySelector('#query-keywords')?.value||'',country:document.querySelector('#query-country')?.value||'',theme:document.querySelector('#query-theme')?.value||'',format:document.querySelector('#query-format')?.value||''});localStorage.setItem(V03_KEY,JSON.stringify(rows.slice(-30)));refresh();});
  sel.addEventListener('change',()=>{const q=read()[Number(sel.value)];if(!q)return;document.querySelector('#query-keywords').value=q.keywords;document.querySelector('#query-country').value=q.country;document.querySelector('#query-theme').value=q.theme;document.querySelector('#query-format').value=q.format;document.querySelector('#run-query')?.click();});
}

function deepLink(){const iso=norm(new URL(location.href).searchParams.get('country'));if(!iso)return;let n=0;const t=setInterval(()=>{n++;const s=document.querySelector('#country-select');if(s&&[...s.options].some(o=>norm(o.value)===iso)){clearInterval(t);openViaUi(iso)}else if(n>30)clearInterval(t);},150);}

async function boot(){
  try{const r=await fetch('./data/snapshot.json',{cache:'no-store'});data=await r.json();countries=new Map((data.countries||[]).map(c=>[norm(c.iso3),c]));}catch{return;}
  addWatchlistView();addSavedQueries();deepLink();
  document.querySelector('#country-select')?.addEventListener('change',()=>setTimeout(enhanceWorkspace,60));
  const root=document.querySelector('#country-workspace')||document.body;
  const obs=new MutationObserver(()=>{if(document.querySelector('#country-workspace .country-head'))enhanceWorkspace();renderWatchlist();});obs.observe(root,{childList:true,subtree:true});
  setTimeout(enhanceWorkspace,250);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
