const V04 = { data:null, reports:[] };
const v04norm = v => String(v || '').trim().toLowerCase();
const v04safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
const v04date = value => { const d = new Date(value); return Number.isNaN(d.getTime()) ? 'unknown' : d.toLocaleString(); };

function dedupeReports(data){
  const out=[], seen=new Set();
  const all=[...(data.reports||[])];
  for(const c of data.countries||[]) all.push(...(c.recentReports||[]));
  for(const r of all){ const key=String(r?.id||r?.url||r?.title||''); if(!key||seen.has(key))continue; seen.add(key); out.push(r); }
  return out;
}

function ageHours(value){ const t=new Date(value).getTime(); return Number.isFinite(t)?Math.max(0,(Date.now()-t)/36e5):null; }
function freshnessState(){
  const s=V04.data||{}; const age=ageHours(s.generatedAt);
  if(s.stale || age==null || age>30) return {label:'STALE',level:'bad',note:'Serving the last known-good ReliefWeb snapshot.'};
  if(s.syncHealth?.state==='degraded' || age>6) return {label:'DEGRADED',level:'warn',note:'Some synchronized components are older than the latest snapshot.'};
  return {label:'LIVE',level:'good',note:'ReliefWeb snapshot is within the operational freshness window.'};
}

function addSkipAndLiveRegion(){
  if(!document.querySelector('.skip-link')){ const a=document.createElement('a');a.className='skip-link';a.href='#main-content';a.textContent='Skip to main content';document.body.prepend(a); }
  const main=document.querySelector('main.content'); if(main&&!main.id)main.id='main-content'; if(main&&!main.hasAttribute('tabindex'))main.tabIndex=-1;
  if(!document.querySelector('#ahsm-live')){ const live=document.createElement('div');live.id='ahsm-live';live.className='sr-only';live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');document.body.append(live); }
}
function announce(text){ const el=document.querySelector('#ahsm-live'); if(el){el.textContent='';setTimeout(()=>el.textContent=text,20);} }

function addHealthControl(){
  const actions=document.querySelector('.topbar .actions'); if(!actions||document.querySelector('#data-health'))return;
  const state=freshnessState();
  const button=document.createElement('button'); button.id='data-health'; button.className=`button health-button ${state.level}`; button.type='button';
  button.innerHTML=`Data <strong>${state.label}</strong>`; button.setAttribute('aria-expanded','false'); button.setAttribute('aria-controls','data-health-panel');
  const print=document.createElement('button'); print.id='print-view'; print.className='button ghost'; print.type='button'; print.textContent='Print'; print.addEventListener('click',()=>window.print());
  actions.prepend(button); actions.append(print);
  const panel=document.createElement('aside'); panel.id='data-health-panel'; panel.className='health-panel'; panel.hidden=true;
  const health=V04.data.syncHealth||{}; const fresh=health.componentFresh||{};
  panel.innerHTML=`<div class="health-head"><strong>Data health</strong><button type="button" class="icon-button" aria-label="Close data health panel">×</button></div><p>${v04safe(state.note)}</p><dl><dt>Snapshot generated</dt><dd>${v04safe(v04date(V04.data.generatedAt))}</dd><dt>Last sync attempt</dt><dd>${v04safe(v04date(V04.data.lastSyncAttemptAt))}</dd><dt>Global aggregate</dt><dd>${fresh.aggregate===false?'last-known-good':'fresh'}</dd><dt>Latest reports</dt><dd>${fresh.latestReports===false?'last-known-good':'fresh'}</dd><dt>Momentum</dt><dd>${fresh.momentum===false?'last-known-good':'fresh'}</dd><dt>Disasters</dt><dd>${fresh.disasters===false?'last-known-good':'fresh'}</dd></dl><p class="micro">AHSM preserves the last valid component when an upstream ReliefWeb request is unavailable. Reporting signals are not humanitarian severity determinations.</p>`;
  document.body.append(panel);
  const setOpen=open=>{panel.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)panel.querySelector('.icon-button')?.focus();};
  button.addEventListener('click',()=>setOpen(panel.hidden)); panel.querySelector('.icon-button').addEventListener('click',()=>setOpen(false));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden){setOpen(false);button.focus();}});
}

function addPanelFreshness(root=document){
  const generated=V04.data?.generatedAt; if(!generated)return;
  for(const panel of root.querySelectorAll?.('.panel')||[]){
    if(panel.dataset.freshnessDone==='1')continue;
    const h2=panel.querySelector(':scope > h2, :scope > .panel-head h2'); if(!h2)continue;
    const title=v04norm(h2.textContent);
    let source='snapshot';
    if(title.includes('theme momentum')||title.includes('source ecology')||title.includes('30-day reporting trend')) source='country enrichment';
    if(title.includes('disaster')) source='disaster sync';
    const badge=document.createElement('span'); badge.className='freshness-badge'; badge.textContent=source; badge.title=`Snapshot generated ${v04date(generated)}`;
    h2.insertAdjacentElement('afterend',badge); panel.dataset.freshnessDone='1';
  }
}

function relatedReports(disaster){
  const exact=[], inferred=[]; const dname=v04norm(disaster.name), dtype=v04norm(disaster.primaryType), iso=v04norm(disaster.primaryCountryIso3);
  for(const r of V04.reports){
    const names=(r.disasterNames||r.disasters||[]).map(v04norm);
    if(dname && names.includes(dname)){exact.push(r);continue;}
    const sameCountry=v04norm(r.primaryCountryIso3)===iso;
    const sameType=(r.disasterTypes||[]).some(x=>v04norm(x)===dtype);
    if(sameCountry&&sameType)inferred.push(r);
  }
  const seen=new Set(); return [...exact.map(r=>({r,basis:'ReliefWeb disaster link'})),...inferred.map(r=>({r,basis:'country + disaster type'}))].filter(x=>{const k=String(x.r.id||x.r.url||x.r.title);if(seen.has(k))return false;seen.add(k);return true;}).slice(0,20);
}
function reportLink(item){ const r=item.r; return `<li><a href="${v04safe(r.url||'#')}" target="_blank" rel="noopener">${v04safe(r.title||'Untitled report')}</a><span>${v04safe(item.basis)} · ${v04safe(r.dateOriginal||'')}</span></li>`; }
function enhanceDisasterCards(root=document){
  for(const card of root.querySelectorAll?.('.disaster-card')||[]){
    if(card.dataset.v04==='1')continue; const name=card.querySelector('h3')?.textContent?.trim(); if(!name)continue;
    const disaster=(V04.data.disasters||[]).find(d=>v04norm(d.name)===v04norm(name)); if(!disaster)continue;
    const related=relatedReports(disaster); const button=document.createElement('button'); button.className='button ghost disaster-reports-toggle'; button.type='button'; button.textContent=`Related reports (${related.length})`; button.setAttribute('aria-expanded','false');
    const details=document.createElement('div'); details.className='disaster-related'; details.hidden=true; details.innerHTML=related.length?`<p class="micro">Exact ReliefWeb disaster links are preferred. Type-based matches are explicitly labeled as inferred.</p><ul>${related.map(reportLink).join('')}</ul>`:'<p class="micro">No linked or type-matched reports are present in the synchronized snapshot.</p>';
    button.addEventListener('click',()=>{const open=details.hidden;details.hidden=!open;button.setAttribute('aria-expanded',String(open));if(open)announce(`${related.length} related reports shown for ${name}`);});
    card.append(button,details); card.dataset.v04='1';
  }
}

function addSourceRegister(){
  const nav=document.querySelector('.nav'), content=document.querySelector('.content'); if(!nav||!content||document.querySelector('[data-view="sources"]'))return;
  const btn=document.createElement('button'); btn.dataset.view='sources'; btn.textContent='Source Register';
  const methodology=[...nav.querySelectorAll('button')].find(x=>x.dataset.view==='methodology'); nav.insertBefore(btn,methodology||null);
  const rows=(V04.data.globalSources||[]).slice(0,100);
  const section=document.createElement('section'); section.id='view-sources'; section.className='view'; section.hidden=true;
  const prov=V04.data.provenance||{};
  section.innerHTML=`<div class="hero"><div><span class="eyebrow">PROVENANCE & SOURCE ECOLOGY</span><h1>Source Register</h1><p>Global ReliefWeb source presence in the synchronized 30-day reporting window. Counts reflect report assignments, not independent corroboration.</p></div></div><div class="grid-2"><section class="panel"><h2>Global source presence</h2><div class="source-register">${rows.map((x,i)=>`<div class="source-row"><span>${i+1}. ${v04safe(x.name)}</span><strong>${Number(x.count||0).toLocaleString()}</strong></div>`).join('')||'<p class="micro">No source aggregate is available in this snapshot.</p>'}</div></section><section class="panel"><h2>Snapshot provenance</h2><dl class="provenance-list"><dt>Provider</dt><dd>${v04safe(prov.provider||'ReliefWeb API V2')}</dd><dt>Date basis</dt><dd>${v04safe(prov.dateBasis||'date.original')}</dd><dt>Record status</dt><dd>${v04safe(prov.status||'published')}</dd><dt>Country counting</dt><dd>${v04safe(prov.countryCounting||'primary_country.iso3')}</dd><dt>Aggregation strategy</dt><dd>${v04safe(prov.aggregateStrategy||'snapshot')}</dd><dt>Snapshot generated</dt><dd>${v04safe(v04date(V04.data.generatedAt))}</dd></dl><p class="micro">A source appearing frequently may indicate operational prominence, publication cadence, or reporting access. It is not by itself evidence of source independence or evidentiary quality.</p></section></div>`;
  content.append(section);
  btn.addEventListener('click',()=>{document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===btn));document.querySelectorAll('.view').forEach(v=>v.hidden=v!==section);announce('Source Register opened');});
}

function navAccessibility(){
  const update=()=>document.querySelectorAll('[data-view]').forEach(b=>{if(b.classList.contains('active'))b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');}); update();
  const nav=document.querySelector('.nav'); if(nav)new MutationObserver(update).observe(nav,{attributes:true,subtree:true,attributeFilter:['class']});
}

function registerOffline(){
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
}

async function bootV04(){
  try{const r=await fetch('./data/snapshot.json',{cache:'no-store'});if(!r.ok)return;V04.data=await r.json();V04.reports=dedupeReports(V04.data);}catch{return;}
  addSkipAndLiveRegion();addHealthControl();addSourceRegister();navAccessibility();registerOffline();addPanelFreshness();enhanceDisasterCards();
  const observer=new MutationObserver(m=>{let changed=false;for(const x of m)if(x.addedNodes.length){changed=true;break;}if(changed){addPanelFreshness();enhanceDisasterCards();}});observer.observe(document.querySelector('main')||document.body,{subtree:true,childList:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootV04,{once:true});else bootV04();
