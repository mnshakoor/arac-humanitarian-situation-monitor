const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const norm=v=>String(v||'').trim().toLowerCase();
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmt=n=>new Intl.NumberFormat().format(Number(n||0));
const round=(n,d=3)=>Number(Number(n||0).toFixed(d));

let snapshot=null;
let graph={nodes:[],links:[],reports:[]};
let metrics=new Map();
let communities=new Map();
let selectedId=null;
let refreshTimer=null;
const STORAGE_KEY='ahsm-network-investigation-v1';

function reportFields(r={}){
  const pc=r.primaryCountry||r.primary_country?.name||r.primary_country?.[0]?.name||'';
  const iso=norm(r.primaryCountryIso3||r.primary_country?.iso3||r.primary_country?.[0]?.iso3);
  const source=typeof r.source==='string'?r.source:(r.source||[]).map(x=>x.shortname||x.name).join(', ');
  const themes=(r.themes||r.theme||[]).map?.(x=>typeof x==='string'?x:x.name)||[];
  return {...r,primaryCountry:pc,primaryCountryIso3:iso,source,themes,dateOriginal:r.dateOriginal||r.date?.original||''};
}

function currentReports(){
  if(!snapshot)return[];
  const q=norm($('#network-search')?.value),theme=norm($('#network-theme')?.value),source=norm($('#network-source')?.value),country=norm($('#network-country')?.value),region=$('#network-region')?.value||'';
  const regionMap=window.AHSM_REGION_MAP||{};
  return (snapshot.reports||[]).filter(r=>{
    if(country&&r.primaryCountryIso3!==country)return false;
    if(source&&!norm(r.source).includes(source))return false;
    if(theme&&!r.themes.some(t=>norm(t).includes(theme)))return false;
    if(q&&!norm([r.title,r.primaryCountry,r.source,...r.themes].join(' ')).includes(q))return false;
    if(region&&regionMap[r.primaryCountryIso3]&&regionMap[r.primaryCountryIso3]!==region)return false;
    return true;
  }).slice(0,180);
}

function buildGraph(reports){
  const nodes=new Map(),links=new Map();
  const add=(id,label,type)=>{if(!id)return;const n=nodes.get(id)||{id,label,type,count:0};n.count++;nodes.set(id,n);};
  const link=(a,b)=>{if(!a||!b||a===b)return;const k=[a,b].sort().join('||');const l=links.get(k)||{source:a,target:b,weight:0};l.weight++;links.set(k,l);};
  for(const r of reports){
    const rid='r:'+norm(r.title);add(rid,r.title,'report');
    if(r.primaryCountryIso3){const cid='c:'+r.primaryCountryIso3;add(cid,r.primaryCountry||r.primaryCountryIso3.toUpperCase(),'country');link(rid,cid);}
    for(const s of String(r.source||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,2)){const id='s:'+norm(s);add(id,s,'source');link(rid,id);}
    for(const t of (r.themes||[]).slice(0,4)){const id='t:'+norm(t);add(id,t,'theme');link(rid,id);}
  }
  const keep=[...nodes.values()].sort((a,b)=>b.count-a.count).slice(0,120);
  const ids=new Set(keep.map(n=>n.id));
  return {nodes:keep,links:[...links.values()].filter(l=>ids.has(l.source)&&ids.has(l.target)),reports};
}

function adjacency(g){
  const a=new Map(g.nodes.map(n=>[n.id,new Map()]));
  for(const l of g.links){if(!a.has(l.source)||!a.has(l.target))continue;a.get(l.source).set(l.target,(a.get(l.source).get(l.target)||0)+l.weight);a.get(l.target).set(l.source,(a.get(l.target).get(l.source)||0)+l.weight);}
  return a;
}

function betweenness(g,a){
  const cb=new Map(g.nodes.map(n=>[n.id,0]));
  const ids=g.nodes.map(n=>n.id);
  for(const s of ids){
    const stack=[],pred=new Map(ids.map(v=>[v,[]])),sigma=new Map(ids.map(v=>[v,0])),dist=new Map(ids.map(v=>[v,-1]));
    sigma.set(s,1);dist.set(s,0);const queue=[s];
    while(queue.length){const v=queue.shift();stack.push(v);for(const w of a.get(v)?.keys()||[]){if(dist.get(w)<0){queue.push(w);dist.set(w,dist.get(v)+1);}if(dist.get(w)===dist.get(v)+1){sigma.set(w,sigma.get(w)+sigma.get(v));pred.get(w).push(v);}}}
    const delta=new Map(ids.map(v=>[v,0]));
    while(stack.length){const w=stack.pop();for(const v of pred.get(w)){const sw=sigma.get(w)||1;delta.set(v,delta.get(v)+(sigma.get(v)/sw)*(1+delta.get(w)));}if(w!==s)cb.set(w,cb.get(w)+delta.get(w));}
  }
  const div=ids.length>2?((ids.length-1)*(ids.length-2)):1;
  for(const id of ids)cb.set(id,(cb.get(id)/2)/div);
  return cb;
}

function labelCommunities(g,a){
  const labels=new Map(g.nodes.map((n,i)=>[n.id,i]));
  const ordered=[...g.nodes].sort((x,y)=>y.count-x.count||x.id.localeCompare(y.id));
  for(let iter=0;iter<12;iter++){
    let changed=0;
    for(const n of ordered){const scores=new Map();for(const [other,w] of a.get(n.id)||[]){const lab=labels.get(other);scores.set(lab,(scores.get(lab)||0)+w);}if(!scores.size)continue;const best=[...scores.entries()].sort((x,y)=>y[1]-x[1]||x[0]-y[0])[0][0];if(labels.get(n.id)!==best){labels.set(n.id,best);changed++;}}
    if(!changed)break;
  }
  const raw=[...new Set(labels.values())];const remap=new Map(raw.map((v,i)=>[v,i+1]));
  return new Map([...labels].map(([id,v])=>[id,remap.get(v)]));
}

function compute(g){
  const a=adjacency(g),bc=betweenness(g,a),comm=labelCommunities(g,a),out=new Map();
  const maxWeighted=Math.max(1,...g.nodes.map(n=>[...(a.get(n.id)?.values()||[])].reduce((x,y)=>x+y,0)));
  for(const n of g.nodes){const degree=a.get(n.id)?.size||0,weighted=[...(a.get(n.id)?.values()||[])].reduce((x,y)=>x+y,0);out.set(n.id,{degree,degreeNorm:g.nodes.length>1?degree/(g.nodes.length-1):0,weighted,weightedNorm:weighted/maxWeighted,betweenness:bc.get(n.id)||0,community:comm.get(n.id)||0});}
  metrics=out;communities=comm;
}

function metricValue(m,key){return key==='degree'?m.degree:key==='betweenness'?m.betweenness:m.weighted;}
function metricLabel(key){return key==='degree'?'Degree':key==='betweenness'?'Betweenness':'Weighted influence';}

function renderLeaders(){
  const host=$('#network-centrality');if(!host)return;
  const key=$('#network-metric')?.value||'weighted';
  const ranked=graph.nodes.map(n=>({...n,...metrics.get(n.id)})).filter(n=>n.type!=='report').sort((a,b)=>metricValue(b,key)-metricValue(a,key)).slice(0,12);
  host.innerHTML=ranked.length?ranked.map((n,i)=>`<button class="intel-row" data-intel-node="${safe(n.id)}"><span><b>${i+1}</b> ${safe(n.label)}<small>${safe(n.type)} · C${n.community}</small></span><strong>${key==='betweenness'?round(n.betweenness,4):fmt(metricValue(n,key))}</strong></button>`).join(''):'<p class="micro">No network leaders in the current filtered slice.</p>';
  $$('[data-intel-node]',host).forEach(b=>b.addEventListener('click',()=>focusNode(b.dataset.intelNode)));
  const label=$('#centrality-heading');if(label)label.textContent=`${metricLabel(key)} leaders`;
}

function renderCommunities(){
  const host=$('#network-communities');if(!host)return;
  const groups=new Map();
  for(const n of graph.nodes){const c=communities.get(n.id)||0;if(!c)continue;const g=groups.get(c)||{id:c,nodes:[],weight:0};g.nodes.push(n);g.weight+=n.count;groups.set(c,g);}
  const ranked=[...groups.values()].sort((a,b)=>b.nodes.length-a.nodes.length).slice(0,10);
  host.innerHTML=ranked.map(g=>{const anchors=[...g.nodes].sort((a,b)=>b.count-a.count).slice(0,4);return `<button class="community-row" data-community="${g.id}"><span><b>Community ${g.id}</b><small>${g.nodes.length} nodes · ${anchors.map(x=>x.label).join(' · ')}</small></span><strong>${fmt(g.weight)}</strong></button>`}).join('')||'<p class="micro">No communities detected.</p>';
  $$('[data-community]',host).forEach(b=>b.addEventListener('click',()=>highlightCommunity(Number(b.dataset.community))));
  $('#network-community-count').textContent=`${groups.size} communities`;
}

function applyGraphIntelligence(){
  const minWeight=Number($('#network-min-weight')?.value||1);
  const lines=$$('#network-svg .net-links line');
  graph.links.forEach((l,i)=>{if(lines[i]){lines[i].dataset.weight=String(l.weight);lines[i].style.opacity=l.weight>=minWeight?'':'0.07';}});
  for(const el of $$('#network-svg [data-node-id]')){const id=el.dataset.nodeId,m=metrics.get(id);if(!m)continue;el.dataset.community=String(m.community);el.dataset.degree=String(m.degree);el.dataset.betweenness=String(round(m.betweenness,4));}
}

function highlightCommunity(id){
  for(const n of $$('#network-svg [data-node-id]'))n.classList.toggle('intel-dim',Number(n.dataset.community)!==id);
  for(const l of $$('#network-svg .net-links line'))l.classList.toggle('intel-dim',false);
  $('#community-focus-label').textContent=`Community ${id} focus`;
}
function clearCommunityHighlight(){for(const n of $$('#network-svg [data-node-id]'))n.classList.remove('intel-dim');$('#community-focus-label').textContent='All communities';}

function selectedFromDom(){return $('#network-svg .net-node.selected')?.dataset.nodeId||selectedId;}
function focusNode(id){selectedId=id;const el=$(`#network-svg [data-node-id="${CSS.escape(id)}"]`);if(el){el.dispatchEvent(new MouseEvent('click',{bubbles:true}));el.scrollIntoView({behavior:'smooth',block:'center'});}renderSelectedIntelligence(id);}
function renderSelectedIntelligence(id=selectedFromDom()){
  const host=$('#selected-intelligence');if(!host)return;const n=graph.nodes.find(x=>x.id===id),m=metrics.get(id);if(!n||!m){host.innerHTML='<p class="micro">Select a graph node to view centrality and bridge metrics.</p>';return;}
  selectedId=id;host.innerHTML=`<div class="intel-selected"><span class="eyebrow">NETWORK INTELLIGENCE</span><h4>${safe(n.label)}</h4><div class="intel-metrics"><article><span>Degree</span><strong>${m.degree}</strong></article><article><span>Weighted</span><strong>${m.weighted}</strong></article><article><span>Betweenness</span><strong>${round(m.betweenness,4)}</strong></article><article><span>Community</span><strong>C${m.community}</strong></article></div><button id="pin-selected-node" class="button ghost">Pin to investigation</button></div>`;
  $('#pin-selected-node')?.addEventListener('click',()=>pinNode(id));
}

function getPins(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]');}catch{return[];}}
function setPins(v){localStorage.setItem(STORAGE_KEY,JSON.stringify(v));renderPinboard();}
function pinNode(id){const n=graph.nodes.find(x=>x.id===id),m=metrics.get(id);if(!n||!m)return;const pins=getPins();if(!pins.some(x=>x.id===id))pins.push({id:n.id,label:n.label,type:n.type,community:m.community,degree:m.degree,weighted:m.weighted,betweenness:round(m.betweenness,5),pinnedAt:new Date().toISOString()});setPins(pins);}
function renderPinboard(){const host=$('#network-pinboard');if(!host)return;const pins=getPins();host.innerHTML=pins.length?pins.map(p=>`<article class="pin-card"><button class="pin-focus" data-pin-focus="${safe(p.id)}"><span>${safe(p.type)} · C${p.community}</span><strong>${safe(p.label)}</strong><small>degree ${p.degree} · weighted ${p.weighted}</small></button><button class="icon-button pin-remove" data-pin-remove="${safe(p.id)}" aria-label="Remove ${safe(p.label)} from investigation">×</button></article>`).join(''):'<p class="micro">Pin important nodes from Node Analysis to build a temporary investigation set. Pins are stored only in this browser.</p>';
  $$('[data-pin-focus]',host).forEach(b=>b.addEventListener('click',()=>focusNode(b.dataset.pinFocus)));
  $$('[data-pin-remove]',host).forEach(b=>b.addEventListener('click',()=>setPins(getPins().filter(x=>x.id!==b.dataset.pinRemove))));
}
function exportPins(){const pins=getPins();const blob=new Blob([JSON.stringify({schema:'quanta.reliefweb.network-investigation.v1',generatedAt:new Date().toISOString(),filters:readFilters(),nodes:pins},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='quanta-reliefweb-network-investigation.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500);}
function readFilters(){return {keyword:$('#network-search')?.value||'',theme:$('#network-theme')?.value||'',source:$('#network-source')?.value||'',country:$('#network-country')?.value||'',region:$('#network-region')?.value||''};}

function refreshIntelligence(){
  if(!snapshot||!$('#view-network'))return;
  graph=buildGraph(currentReports());compute(graph);renderLeaders();renderCommunities();renderPinboard();setTimeout(()=>{applyGraphIntelligence();renderSelectedIntelligence();},40);
}
function queueRefresh(){clearTimeout(refreshTimer);refreshTimer=setTimeout(refreshIntelligence,100);}

function injectUi(){
  const view=$('#view-network');if(!view||$('#network-intelligence-controls'))return;
  const hero=view.querySelector('.hero');
  const full=document.createElement('button');full.id='network-fullscreen';full.className='button ghost network-fullscreen';full.type='button';full.setAttribute('aria-label','Open Network Explorer in full screen');full.innerHTML='⛶ Full screen';hero?.append(full);
  const shell=view.querySelector('.network-shell');
  const controls=document.createElement('section');controls.id='network-intelligence-controls';controls.className='panel network-intelligence-controls';controls.innerHTML=`<div><span class="eyebrow">NETWORK INTELLIGENCE</span><strong>Structural analysis</strong></div><label>Rank by<select id="network-metric" class="select"><option value="weighted">Weighted influence</option><option value="degree">Degree</option><option value="betweenness">Betweenness</option></select></label><label>Weak-tie threshold<select id="network-min-weight" class="select"><option value="1">Show all links</option><option value="2">Weight ≥ 2</option><option value="3">Weight ≥ 3</option><option value="5">Weight ≥ 5</option></select></label><button id="network-clear-community" class="button ghost"><span id="community-focus-label">All communities</span></button>`;
  shell?.before(controls);
  const analysis=view.querySelector('.network-column.analysis');
  const intel=document.createElement('section');intel.className='network-intelligence-panel';intel.innerHTML=`<div class="intel-head"><div><span class="eyebrow">CENTRALITY</span><h3 id="centrality-heading">Weighted influence leaders</h3></div><span id="network-community-count" class="muted"></span></div><div id="network-centrality" class="intel-list"></div><div class="intel-head"><div><span class="eyebrow">COMMUNITIES</span><h3>Detected clusters</h3></div></div><div id="network-communities" class="intel-list"></div><div id="selected-intelligence"></div>`;
  analysis?.append(intel);
  const tray=document.createElement('section');tray.className='panel investigation-tray';tray.innerHTML=`<div class="panel-head"><div><span class="eyebrow">ANALYST WORKSPACE</span><h2>Investigation pinboard</h2><p>Pin nodes for comparison without changing the underlying ReliefWeb evidence.</p></div><button id="export-network-investigation" class="button ghost">Export investigation JSON</button></div><div id="network-pinboard" class="pinboard"></div>`;
  shell?.after(tray);

  $('#network-metric')?.addEventListener('change',renderLeaders);
  $('#network-min-weight')?.addEventListener('change',applyGraphIntelligence);
  $('#network-clear-community')?.addEventListener('click',clearCommunityHighlight);
  $('#export-network-investigation')?.addEventListener('click',exportPins);
  full.addEventListener('click',toggleFullscreen);
  document.addEventListener('fullscreenchange',syncFullscreenButton);
  document.addEventListener('keydown',e=>{if(e.key.toLowerCase()==='f'&&!/input|select|textarea/i.test(e.target?.tagName||'')&&!view.hidden){e.preventDefault();toggleFullscreen();}});
  for(const id of ['network-search','network-theme','network-source','network-country','network-region'])$('#'+id)?.addEventListener('input',queueRefresh);
  $('#network-reset')?.addEventListener('click',()=>setTimeout(queueRefresh,0));
  $('#network-svg')?.addEventListener('click',e=>{const node=e.target.closest?.('[data-node-id]');if(node){selectedId=node.dataset.nodeId;setTimeout(()=>renderSelectedIntelligence(selectedId),0);}});
  const observer=new MutationObserver(()=>{if(!view.hidden){applyGraphIntelligence();renderSelectedIntelligence();}});observer.observe($('#network-svg'),{childList:true,subtree:true});
}

async function toggleFullscreen(){const view=$('#view-network');if(!view)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await view.requestFullscreen();}catch{view.classList.toggle('pseudo-fullscreen');syncFullscreenButton();}}
function syncFullscreenButton(){const view=$('#view-network'),btn=$('#network-fullscreen');if(!view||!btn)return;const active=document.fullscreenElement===view||view.classList.contains('pseudo-fullscreen');btn.innerHTML=active?'⛶ Exit full screen':'⛶ Full screen';btn.setAttribute('aria-label',active?'Exit Network Explorer full screen':'Open Network Explorer in full screen');if(active)setTimeout(()=>$('#network-svg')?.scrollIntoView({block:'center'}),60);}

async function boot(){
  try{const r=await fetch('./data/snapshot.json',{cache:'no-store'});if(!r.ok)return;snapshot=await r.json();snapshot.reports=(snapshot.reports||[]).map(reportFields);}catch{return;}
  injectUi();refreshIntelligence();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
