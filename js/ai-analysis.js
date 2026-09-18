import { AI_CONFIG } from './ai-config.js';

const AI = {
  snapshot:null,
  reports:[],
  lastBrief:null,
  busy:false
};
const STORE_KEY='ahsm.ai.briefs.v1';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const norm=v=>String(v||'').trim().toLowerCase();
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function ensureStyle(){
  if(document.querySelector('link[data-ai-analysis]'))return;
  const link=document.createElement('link');
  link.rel='stylesheet';link.href='./css/ai-analysis.css';link.dataset.aiAnalysis='1';
  document.head.append(link);
}

function dedupeReports(data){
  const out=[],seen=new Set();
  const all=[...(data.reports||[])];
  for(const c of data.countries||[])all.push(...(c.recentReports||[]));
  for(const r of all){
    const key=String(r?.id||r?.url||r?.url_alias||r?.title||'');
    if(!key||seen.has(key))continue;
    seen.add(key);out.push(r);
  }
  return out;
}

function reportLite(r={}){
  const pc=r.primary_country||{};
  const sources=Array.isArray(r.source)?r.source.map(x=>x.shortname||x.name).filter(Boolean):[r.source].filter(Boolean);
  const themes=(r.theme||r.themes||[]).map?.(x=>typeof x==='string'?x:x.name)||[];
  return {
    id:r.id||null,
    title:r.title||'',
    dateOriginal:r.dateOriginal||r.date?.original||r['date.original']||'',
    primaryCountry:r.primaryCountry||pc.name||pc?.[0]?.name||'',
    primaryCountryIso3:norm(r.primaryCountryIso3||pc.iso3||pc?.[0]?.iso3),
    sources,
    themes,
    format:Array.isArray(r.format)?r.format.map(x=>x.name).filter(Boolean):[r.format].filter(Boolean),
    disasterTypes:(r.disasterTypes||r.disaster_type||[]).map?.(x=>typeof x==='string'?x:x.name)||[],
    url:r.url_alias||r.url||''
  };
}

function disasterLite(d={}){
  const pc=d.primary_country||{};
  const pt=d.primary_type||{};
  return {
    name:d.name||'',
    status:d.status||'',
    primaryType:d.primaryType||pt.name||'',
    primaryCountry:d.primaryCountry||pc.name||'',
    primaryCountryIso3:norm(d.primaryCountryIso3||pc.iso3),
    eventDate:d.dateEvent||d.date?.event||''
  };
}

function momentum(c={}){
  const current=Number(c.reports7d||0),previous=Number(c.previous7d||0);
  const absolute=current-previous;
  const percent=previous>0?((current-previous)/previous)*100:(current>0?null:0);
  let label='STABLE / MIXED';
  if(percent===null)label='NEW BASELINE';
  else if(current>=10&&absolute>=5&&percent>=30)label='ACCELERATING';
  else if(percent<=-30&&previous>=10)label='DECELERATING';
  return {label,absolute,percent};
}

function normalizeScore(values,value){
  const finite=values.filter(Number.isFinite);
  if(!finite.length)return 0;
  const min=Math.min(...finite),max=Math.max(...finite);
  if(max===min)return max>0?50:0;
  return ((value-min)/(max-min))*100;
}

function enrichCountries(countries){
  const volumes=countries.map(c=>Number(c.reports30d||0));
  const momenta=countries.map(c=>Math.max(-100,Math.min(200,Number(c.change7d??0))));
  const enriched=countries.filter(c=>Number(c.uniqueSources||0)>0||Number(c.themeBreadth||0)>0);
  const sources=enriched.map(c=>Number(c.uniqueSources||0));
  const themes=enriched.map(c=>Number(c.themeBreadth||0));
  return countries.map(c=>{
    if(Number.isFinite(c.hisi))return c;
    const hasEnrichment=Number(c.uniqueSources||0)>0||Number(c.themeBreadth||0)>0;
    const parts={
      volume:normalizeScore(volumes,Number(c.reports30d||0)),
      momentum:normalizeScore(momenta,Math.max(-100,Math.min(200,Number(c.change7d??0)))),
      sourceDiversity:hasEnrichment?normalizeScore(sources,Number(c.uniqueSources||0)):null,
      themeBreadth:hasEnrichment?normalizeScore(themes,Number(c.themeBreadth||0)):null
    };
    const score=hasEnrichment
      ?Math.round(parts.volume*.30+parts.momentum*.30+parts.sourceDiversity*.20+parts.themeBreadth*.20)
      :Math.round(parts.volume*.65+parts.momentum*.35);
    return {...c,hisi:score,hisiBasis:hasEnrichment?'FULL':'PROVISIONAL',hisiParts:parts};
  });
}

function countryPayload(iso3,focus='country'){
  const c=(AI.snapshot.countries||[]).find(x=>norm(x.iso3)===norm(iso3));
  if(!c)throw new Error('Country data is unavailable in the current snapshot.');
  const iso=norm(c.iso3);
  const recent=(c.recentReports||[]).map(reportLite).slice(0,20);
  return {
    schema:'arac.ahsm.country-analysis-input.v1',
    focus,
    scope:{country:c.name,iso3:iso.toUpperCase(),periodDays:30},
    reporting:{
      reports30d:c.reports30d||0,reports7d:c.reports7d||0,previous7d:c.previous7d||0,
      change7d:c.change7d??null,momentum:momentum(c)
    },
    informationSignal:{hisi:c.hisi??null,basis:c.hisiBasis||null,components:c.hisiParts||null},
    themes:(c.topThemes||[]).slice(0,12),
    sources:(c.topSources||[]).slice(0,12),
    formats:(c.topFormats||[]).slice(0,10),
    disasterTypes:(c.disasterTypes||[]).slice(0,10),
    activeDisasters:(AI.snapshot.disasters||[]).filter(d=>norm(d.primaryCountryIso3||d.primary_country?.iso3)===iso).map(disasterLite).slice(0,15),
    recentReports:recent,
    methodology:{
      dateBasis:'date.original',
      countryCounting:'primary_country.iso3',
      severityBoundary:'Information-environment signal only; not a humanitarian severity determination.'
    },
    provenance:AI.snapshot.provenance||{}
  };
}

function aggregateCounts(items,key){
  const map=new Map();
  for(const item of items){
    const vals=item[key]||[];
    for(const v of vals){const name=typeof v==='string'?v:v?.name;if(name)map.set(name,(map.get(name)||0)+1);}
  }
  return [...map].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count).slice(0,15);
}

function regionPayload(region){
  const regionMap=window.AHSM_REGION_MAP||{};
  const countries=(AI.snapshot.countries||[]).filter(c=>regionMap[norm(c.iso3)]===region);
  const isoSet=new Set(countries.map(c=>norm(c.iso3)));
  const reports=AI.reports.map(reportLite).filter(r=>isoSet.has(r.primaryCountryIso3)).slice(0,40);
  return {
    schema:'arac.ahsm.region-analysis-input.v1',
    scope:{region,periodDays:30},
    countries:countries.map(c=>({
      name:c.name,iso3:String(c.iso3||'').toUpperCase(),reports30d:c.reports30d||0,reports7d:c.reports7d||0,
      previous7d:c.previous7d||0,change7d:c.change7d??null,hisi:c.hisi??null,hisiBasis:c.hisiBasis||null,
      momentum:momentum(c)
    })).sort((a,b)=>b.reports30d-a.reports30d),
    leadingThemes:aggregateCounts(reports,'themes'),
    leadingSources:aggregateCounts(reports,'sources'),
    recentReports:reports,
    activeDisasters:(AI.snapshot.disasters||[]).filter(d=>isoSet.has(norm(d.primaryCountryIso3||d.primary_country?.iso3))).map(disasterLite).slice(0,20),
    methodology:{severityBoundary:'Regional reporting activity is an information signal, not a severity ranking.'},
    provenance:AI.snapshot.provenance||{}
  };
}

function queryPayload(){
  const titles=$$('#query-results .report-card h3').map(x=>norm(x.textContent)).filter(Boolean);
  const titleSet=new Set(titles);
  const reports=AI.reports.filter(r=>titleSet.has(norm(r.title))).slice(0,AI_CONFIG.maxQueryReports).map(reportLite);
  let query=null;
  try{query=JSON.parse($('#query-preview')?.textContent||'null');}catch{}
  return {
    schema:'arac.ahsm.query-analysis-input.v1',
    query,
    matchCount:Number(String($('#query-count')?.textContent||'').replace(/\D/g,''))||reports.length,
    analyzedReportCount:reports.length,
    reports,
    methodology:{severityBoundary:'The filtered corpus is a reporting subset and does not independently measure humanitarian severity.'},
    provenance:AI.snapshot.provenance||{}
  };
}

function briefTitle(type,scope){
  if(type==='country')return `${scope} Humanitarian Information Quick Brief`;
  if(type==='region')return `${scope} Regional Humanitarian Information Brief`;
  if(type==='pulse')return `${scope} Crisis Pulse Quick Assessment`;
  return 'Query Lab Analytical Brief';
}

function ensureDrawer(){
  if($('#ai-drawer'))return;
  const el=document.createElement('aside');el.id='ai-drawer';el.className='ai-drawer';el.hidden=true;el.setAttribute('aria-label','AI Quick Analysis');
  el.innerHTML=`<header class="ai-drawer-head"><div><span class="eyebrow">QUANTA ANALYTICA · AI QUICK ANALYSIS</span><h2 id="ai-drawer-title">Analytical Brief</h2></div><button id="ai-close" class="icon-button" type="button" aria-label="Close AI analysis">×</button></header><div id="ai-drawer-body" class="ai-drawer-body"></div><footer class="ai-drawer-actions"><button id="ai-save" class="button" type="button">Save brief</button><button id="ai-md" class="button ghost" type="button">Export MD</button><button id="ai-json" class="button ghost" type="button">Export JSON</button><button id="ai-copy" class="button ghost" type="button">Copy</button></footer>`;
  document.body.append(el);
  $('#ai-close').addEventListener('click',closeDrawer);
  $('#ai-save').addEventListener('click',saveLast);
  $('#ai-md').addEventListener('click',()=>AI.lastBrief&&download(`${slug(AI.lastBrief.title)}.md`,AI.lastBrief.markdown,'text/markdown;charset=utf-8'));
  $('#ai-json').addEventListener('click',()=>AI.lastBrief&&download(`${slug(AI.lastBrief.title)}.json`,JSON.stringify(AI.lastBrief,null,2),'application/json'));
  $('#ai-copy').addEventListener('click',async()=>{if(!AI.lastBrief)return;await navigator.clipboard.writeText(AI.lastBrief.markdown);const b=$('#ai-copy');b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1000);});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!el.hidden)closeDrawer();});
}

function openDrawer(title){
  ensureDrawer();$('#ai-drawer-title').textContent=title;$('#ai-drawer').hidden=false;document.body.style.overflow='hidden';
}
function closeDrawer(){const d=$('#ai-drawer');if(d)d.hidden=true;document.body.style.overflow='';}
function setDrawerLoading(title){openDrawer(title);$('#ai-drawer-body').innerHTML='<div class="ai-loading">Generating evidence-bounded analytical brief...</div>';setActionState(false);}
function setActionState(enabled){for(const id of ['#ai-save','#ai-md','#ai-json','#ai-copy']){const b=$(id);if(b)b.disabled=!enabled;}}

function renderBrief(brief){
  AI.lastBrief=brief;
  const a=brief.analysis||{};
  const list=(title,items)=>`<section class="ai-section"><h3>${safe(title)}</h3><ul>${(items||[]).map(x=>`<li>${safe(x)}</li>`).join('')||'<li>None identified from the supplied evidence.</li>'}</ul></section>`;
  $('#ai-drawer-title').textContent=brief.title;
  $('#ai-drawer-body').innerHTML=`<div class="ai-meta"><strong>Generated</strong><span>${safe(new Date(brief.generatedAt).toLocaleString())}</span><strong>Model</strong><span>${safe(brief.model)}</span><strong>Snapshot</strong><span>${safe(brief.snapshotGeneratedAt?new Date(brief.snapshotGeneratedAt).toLocaleString():'Current synchronized snapshot')}</span><strong>Confidence</strong><span><span class="ai-confidence">${safe(a.confidence?.level||'n/a')}</span></span></div><section class="ai-section"><h3>BLUF</h3><p>${safe(a.bluf)}</p></section>${list('Key Judgments',a.keyJudgments)}${list('Supporting Signals',a.supportingSignals)}${list('Implications',a.implications)}${list('Indicators to Watch',a.indicatorsToWatch)}${list('Information Gaps',a.informationGaps)}<section class="ai-section"><h3>Confidence</h3><p><strong>${safe(a.confidence?.level||'')}</strong>: ${safe(a.confidence?.rationale||'')}</p></section><section class="ai-section ai-boundary"><h3>Analytical Boundary</h3><p>${safe(a.analyticalBoundary||'')}</p></section><p class="ai-local-note">AI-generated analytical assistance. Validate material judgments against underlying ReliefWeb records before operational use.</p>`;
  setActionState(true);
}

async function generate(type,scopeKey,payload,title){
  if(AI.busy)return;
  AI.busy=true;setDrawerLoading(title);
  try{
    const res=await fetch(AI_CONFIG.endpoint,{
      method:'POST',
      headers:{'Content-Type':'application/json','apikey':AI_CONFIG.publishableKey},
      body:JSON.stringify({analysisType:type,scopeKey,title,snapshotGeneratedAt:AI.snapshot.generatedAt||null,payload})
    });
    const data=await res.json().catch(()=>({error:`Request failed (${res.status})`}));
    if(!res.ok)throw new Error(data.error||`Request failed (${res.status})`);
    renderBrief(data);
  }catch(err){
    $('#ai-drawer-body').innerHTML=`<div class="ai-error"><strong>AI Quick Analysis unavailable</strong><p>${safe(err?.message||err)}</p></div>`;
    setActionState(false);
  }finally{AI.busy=false;}
}

function countryFromCard(card){
  const btn=card.querySelector('[data-iso3]');
  return btn?.dataset?.iso3||'';
}

function enhanceCountry(){
  const actions=$('#country-workspace .country-head .actions');if(!actions||actions.querySelector('.ai-country'))return;
  const iso=$('#country-select')?.value;if(!iso)return;
  const c=(AI.snapshot.countries||[]).find(x=>norm(x.iso3)===norm(iso));if(!c)return;
  const b=document.createElement('button');b.className='button ghost ai-brief-trigger ai-country';b.type='button';b.textContent='AI Quick Analysis';
  b.addEventListener('click',()=>generate('country',norm(iso),countryPayload(iso,'country'),briefTitle('country',c.name)));
  actions.prepend(b);
}

function enhanceRegion(){
  const hero=$('#view-regions .hero');if(!hero||hero.querySelector('.ai-region'))return;
  const b=document.createElement('button');b.className='button ghost ai-brief-trigger ai-region';b.type='button';b.textContent='Generate Regional Brief';
  b.addEventListener('click',()=>{
    const region=$('#region-select')?.value||$('#region-select option:checked')?.textContent||'Selected Region';
    generate('region',region,regionPayload(region),briefTitle('region',region));
  });
  hero.append(b);
}

function enhancePulse(){
  for(const card of $$('#pulse-list .signal-card')){
    if(card.querySelector('.ai-pulse'))continue;
    const iso=countryFromCard(card);if(!iso)continue;
    const c=(AI.snapshot.countries||[]).find(x=>norm(x.iso3)===norm(iso));if(!c)continue;
    const b=document.createElement('button');b.className='button ghost ai-brief-trigger ai-pulse';b.type='button';b.textContent='Analyze';
    b.addEventListener('click',()=>generate('pulse',norm(iso),countryPayload(iso,'crisis-pulse'),briefTitle('pulse',c.name)));
    card.append(b);
  }
}

function enhanceQuery(){
  const actions=$('#view-query .query-actions');if(!actions||actions.querySelector('.ai-query'))return;
  const b=document.createElement('button');b.className='button ghost ai-brief-trigger ai-query';b.type='button';b.textContent='Analyze Results';
  b.addEventListener('click',()=>{
    const payload=queryPayload();
    if(!payload.analyzedReportCount){openDrawer('Query Lab Analytical Brief');$('#ai-drawer-body').innerHTML='<div class="ai-error">Run a query with matching reports before requesting analysis.</div>';setActionState(false);return;}
    generate('query','query-lab',payload,briefTitle('query',''));
  });
  actions.append(b);
}

function saved(){
  try{return JSON.parse(localStorage.getItem(STORE_KEY)||'[]');}catch{return[];}
}
function writeSaved(items){localStorage.setItem(STORE_KEY,JSON.stringify(items.slice(0,AI_CONFIG.localBriefLimit)));}
function saveLast(){
  if(!AI.lastBrief)return;
  const items=saved();
  const record={...AI.lastBrief,localSavedAt:new Date().toISOString()};
  writeSaved([record,...items.filter(x=>x.inputHash!==record.inputHash||x.analysisType!==record.analysisType)]);
  const b=$('#ai-save');b.textContent='Saved';setTimeout(()=>b.textContent='Save brief',1000);
  renderSavedView();
}
function deleteSaved(index){const items=saved();items.splice(index,1);writeSaved(items);renderSavedView();}
function slug(s){return String(s||'ahsm-ai-brief').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80);}
function download(name,content,type){const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

function ensureSavedView(){
  const nav=$('.nav'),content=$('.content');if(!nav||!content||$('[data-view="saved-ai"]'))return;
  const b=document.createElement('button');b.dataset.view='saved-ai';b.textContent='Saved Analysis';
  const methodology=[...nav.querySelectorAll('button')].find(x=>x.dataset.view==='methodology');nav.insertBefore(b,methodology||null);
  const section=document.createElement('section');section.id='view-saved-ai';section.className='view';section.hidden=true;
  section.innerHTML='<div class="hero"><div><span class="eyebrow">ANALYTICAL LIBRARY</span><h1>Saved Analysis</h1><p>AI Quick Analysis briefs saved on this device.</p></div></div><section class="panel"><p class="ai-local-note">These briefs are currently stored in this browser. The Supabase cloud-save schema is prepared for a later authenticated release.</p><div id="ai-saved-list" class="ai-saved-list"></div></section>';
  content.append(section);
  b.addEventListener('click',()=>{
    $$('[data-view]').forEach(x=>x.classList.toggle('active',x===b));
    $$('.view').forEach(v=>v.hidden=v!==section);
    renderSavedView();
  });
}

function renderSavedView(){
  const el=$('#ai-saved-list');if(!el)return;
  const items=saved();
  el.innerHTML=items.length?items.map((x,i)=>`<article class="ai-saved-card"><header><div><span class="eyebrow">${safe(String(x.analysisType||'analysis').toUpperCase())}</span><h3>${safe(x.title)}</h3><p class="micro">${safe(new Date(x.localSavedAt||x.generatedAt).toLocaleString())} · Confidence: ${safe(x.analysis?.confidence?.level||'n/a')}</p></div></header><p>${safe(x.analysis?.bluf||'')}</p><div class="actions"><button class="button ghost ai-open-saved" data-index="${i}" type="button">Open</button><button class="button ghost ai-export-saved" data-index="${i}" type="button">Export MD</button><button class="button ghost ai-delete-saved" data-index="${i}" type="button">Delete</button></div></article>`).join(''):'<p class="muted">No AI briefs have been saved on this device.</p>';
  $$('.ai-open-saved',el).forEach(b=>b.addEventListener('click',()=>{const x=items[Number(b.dataset.index)];if(x){openDrawer(x.title);renderBrief(x);}}));
  $$('.ai-export-saved',el).forEach(b=>b.addEventListener('click',()=>{const x=items[Number(b.dataset.index)];if(x)download(`${slug(x.title)}.md`,x.markdown,'text/markdown;charset=utf-8');}));
  $$('.ai-delete-saved',el).forEach(b=>b.addEventListener('click',()=>deleteSaved(Number(b.dataset.index))));
}

function enhance(){
  enhanceCountry();enhanceRegion();enhancePulse();enhanceQuery();
}

async function boot(){
  if(!AI_CONFIG.enabled)return;
  ensureStyle();ensureDrawer();ensureSavedView();
  try{
    const r=await fetch('./data/snapshot.json',{cache:'no-store'});if(!r.ok)throw new Error('snapshot unavailable');
    AI.snapshot=await r.json();AI.snapshot.countries=enrichCountries(AI.snapshot.countries||[]);AI.reports=dedupeReports(AI.snapshot);
  }catch{return;}
  enhance();renderSavedView();
  const observer=new MutationObserver(()=>enhance());
  observer.observe(document.querySelector('main')||document.body,{subtree:true,childList:true});
  $('#region-select')?.addEventListener('change',()=>setTimeout(enhance,0));
  $('#country-select')?.addEventListener('change',()=>setTimeout(enhance,0));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
