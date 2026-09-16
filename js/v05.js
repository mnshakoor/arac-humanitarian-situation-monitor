const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase();
const fmt=n=>new Intl.NumberFormat().format(Number(n||0));

const REGION_MAP={
  // Africa
  ben:'West Africa',bfa:'West Africa',gmb:'West Africa',gin:'West Africa',mli:'West Africa',mrt:'West Africa',ner:'West Africa',sen:'West Africa',tgo:'West Africa',
  caf:'Central Africa',com:'East & Southern Africa',dji:'East & Southern Africa',lso:'East & Southern Africa',rwa:'East & Southern Africa',swz:'East & Southern Africa',tza:'East & Southern Africa',uga:'East & Southern Africa',
  egy:'Middle East & North Africa',lby:'Middle East & North Africa',tun:'Middle East & North Africa',sdn:'East & Southern Africa',
  // Middle East
  irq:'Middle East & North Africa',jor:'Middle East & North Africa',lbn:'Middle East & North Africa',pse:'Middle East & North Africa',qat:'Middle East & North Africa',sau:'Middle East & North Africa',tur:'Middle East & North Africa',
  // Asia-Pacific
  afg:'South & Central Asia',btn:'South & Central Asia',kaz:'South & Central Asia',npl:'South & Central Asia',pak:'South & Central Asia',
  chn:'East & Southeast Asia',idn:'East & Southeast Asia',jpn:'East & Southeast Asia',khm:'East & Southeast Asia',kor:'East & Southeast Asia',mys:'East & Southeast Asia',prk:'East & Southeast Asia',tha:'East & Southeast Asia',tls:'East & Southeast Asia',vnm:'East & Southeast Asia',
  aus:'Pacific',fji:'Pacific',kir:'Pacific',png:'Pacific',vut:'Pacific',wsm:'Pacific',
  // Europe
  alb:'Europe',aut:'Europe',aze:'Europe',bih:'Europe',cyp:'Europe',esp:'Europe',grc:'Europe',hrv:'Europe',ita:'Europe',mda:'Europe',pol:'Europe',rou:'Europe',svn:'Europe',ukr:'Europe',
  // Americas
  blz:'Latin America & Caribbean',bra:'Latin America & Caribbean',brb:'Latin America & Caribbean',chl:'Latin America & Caribbean',cri:'Latin America & Caribbean',guy:'Latin America & Caribbean',mex:'Latin America & Caribbean',pri:'Latin America & Caribbean',slv:'Latin America & Caribbean',
  can:'North America'
};

const STOP=new Set('a an and are as at be been by for from has have in into is it its of on or that the their this to was were will with amid after before over under about across during new latest report reports update situation humanitarian relief response appeal assessment emergency people country countries million thousands says said'.split(' '));
let snapshot=null;
let rss=[];
let network={nodes:[],links:[],reports:[]};
let selectedNode=null;

function reportFields(r={}){
  const pc=r.primaryCountry||r.primary_country?.name||r.primary_country?.[0]?.name||'';
  const iso=norm(r.primaryCountryIso3||r.primary_country?.iso3||r.primary_country?.[0]?.iso3);
  const source=typeof r.source==='string'?r.source:(r.source||[]).map(x=>x.shortname||x.name).join(', ');
  const themes=(r.themes||r.theme||[]).map?.(x=>typeof x==='string'?x:x.name)||[];
  return {...r,primaryCountry:pc,primaryCountryIso3:iso,source,themes,url:r.url_alias||r.url||r.href||'',dateOriginal:r.dateOriginal||r.date?.original||''};
}
function regionOf(iso){return REGION_MAP[norm(iso)]||'Other / Global';}

async function loadData(){
  const res=await fetch('./data/snapshot.json',{cache:'no-store'}); if(!res.ok) throw new Error('snapshot unavailable');
  snapshot=await res.json();
  snapshot.reports=(snapshot.reports||[]).map(reportFields);
  try{const rr=await fetch('./data/rss.json',{cache:'no-store'});if(rr.ok){const j=await rr.json();rss=j.items||[];}}catch{}
  if(!rss.length) rss=snapshot.reports.slice(0,35).map(r=>({title:r.title,url:r.url,pubDate:r.dateOriginal}));
  renderRegions();
  setupNetworkExplorer();
  renderTicker();
}

function renderRegions(){
  const host=$('#view-regions'); if(!host||!snapshot)return;
  const countries=(snapshot.countries||[]).map(c=>({...c,region:regionOf(c.iso3)}));
  const groups=new Map();
  for(const c of countries){if(c.region==='Other / Global')continue;const g=groups.get(c.region)||{name:c.region,countries:[],reports30d:0,reports7d:0,previous7d:0};g.countries.push(c);g.reports30d+=Number(c.reports30d||0);g.reports7d+=Number(c.reports7d||0);g.previous7d+=Number(c.previous7d||0);groups.set(c.region,g);}
  const regions=[...groups.values()].sort((a,b)=>b.reports30d-a.reports30d);
  const sel=$('#region-select'); sel.innerHTML=regions.map(g=>`<option value="${safe(g.name)}">${safe(g.name)}</option>`).join('');
  $('#region-cards').innerHTML=regions.map(g=>{const delta=g.previous7d?((g.reports7d-g.previous7d)/g.previous7d)*100:null;return `<button class="region-card" data-region="${safe(g.name)}"><span>${safe(g.name)}</span><strong>${fmt(g.reports30d)}</strong><small>30d reports · ${g.countries.length} countries · ${delta==null?'n/a':`${delta>=0?'+':''}${delta.toFixed(1)}%`} 7d</small></button>`}).join('');
  const draw=name=>renderRegionDetail(groups.get(name));
  sel.addEventListener('change',()=>draw(sel.value));
  $$('.region-card',host).forEach(b=>b.addEventListener('click',()=>{sel.value=b.dataset.region;draw(b.dataset.region);host.scrollIntoView({behavior:'smooth',block:'start'});}));
  if(regions[0])draw(regions[0].name);
}
function renderRegionDetail(g){
  if(!g)return;
  const regionReports=snapshot.reports.filter(r=>regionOf(r.primaryCountryIso3)===g.name);
  const themeCounts=countTerms(regionReports.flatMap(r=>r.themes||[]));
  const sourceCounts=countTerms(regionReports.flatMap(r=>String(r.source||'').split(',').map(x=>x.trim()).filter(Boolean)));
  const countries=[...g.countries].sort((a,b)=>Number(b.reports30d||0)-Number(a.reports30d||0));
  const delta=g.reports7d-g.previous7d;
  $('#region-kpis').innerHTML=[['Reports · 30d',g.reports30d],['Reports · 7d',g.reports7d],['Δ vs prior 7d',`${delta>=0?'+':''}${fmt(delta)}`],['Countries',g.countries.length]].map(([k,v])=>`<article><span>${safe(k)}</span><strong>${safe(v)}</strong></article>`).join('');
  $('#region-country-table').innerHTML=countries.map(c=>`<tr><td>${safe(c.name||String(c.iso3).toUpperCase())}</td><td>${fmt(c.reports30d)}</td><td>${fmt(c.reports7d)}</td><td>${c.change7d==null?'n/a':`${Number(c.change7d)>=0?'+':''}${Number(c.change7d).toFixed(1)}%`}</td></tr>`).join('');
  $('#region-themes').innerHTML=rankRows(themeCounts.slice(0,10));
  $('#region-sources').innerHTML=rankRows(sourceCounts.slice(0,10));
  $('#region-report-list').innerHTML=regionReports.slice(0,14).map(r=>`<article class="network-result"><span>${safe(r.primaryCountry)} · ${safe(r.source)}</span><a href="${safe(r.url)}" target="_blank" rel="noopener">${safe(r.title)}</a><small>${safe(r.dateOriginal)}</small></article>`).join('')||'<p class="micro">No reports in the synchronized snapshot.</p>';
}
function countTerms(items){const m=new Map();for(const x of items){const k=String(x||'').trim();if(k)m.set(k,(m.get(k)||0)+1);}return [...m].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count);}
function rankRows(items){return items.length?items.map(x=>`<div class="rank-row"><span>${safe(x.name)}</span><strong>${fmt(x.count)}</strong></div>`).join(''):'<p class="micro">No data for this slice.</p>';}

function setupNetworkExplorer(){
  const view=$('#view-network');if(!view)return;
  const countrySel=$('#network-country');
  const countries=[...new Map(snapshot.reports.filter(r=>r.primaryCountryIso3).map(r=>[r.primaryCountryIso3,r.primaryCountry||r.primaryCountryIso3.toUpperCase()])).entries()].sort((a,b)=>a[1].localeCompare(b[1]));
  countrySel.innerHTML='<option value="">All countries</option>'+countries.map(([iso,n])=>`<option value="${safe(iso)}">${safe(n)}</option>`).join('');
  const regionSel=$('#network-region');
  const regions=[...new Set(Object.values(REGION_MAP))].sort();
  regionSel.innerHTML='<option value="">All regions</option>'+regions.map(x=>`<option>${safe(x)}</option>`).join('');
  for(const id of ['network-search','network-theme','network-source','network-country','network-region']) $(id.startsWith('#')?id:'#'+id)?.addEventListener('input',renderNetwork);
  $('#network-reset')?.addEventListener('click',()=>{for(const id of ['network-search','network-theme','network-source','network-country','network-region'])$('#'+id).value='';renderNetwork();});
  renderNetwork();
}

function filteredReports(){
  const q=norm($('#network-search')?.value),theme=norm($('#network-theme')?.value),source=norm($('#network-source')?.value),country=norm($('#network-country')?.value),region=$('#network-region')?.value||'';
  return snapshot.reports.filter(r=>{
    if(country&&r.primaryCountryIso3!==country)return false;
    if(region&&regionOf(r.primaryCountryIso3)!==region)return false;
    if(source&&!norm(r.source).includes(source))return false;
    if(theme&&!r.themes.some(t=>norm(t).includes(theme)))return false;
    if(q&&!norm([r.title,r.primaryCountry,r.source,...r.themes].join(' ')).includes(q))return false;
    return true;
  }).slice(0,180);
}
function buildNetwork(reports){
  const nodes=new Map(), links=new Map();
  const add=(id,label,type)=>{if(!id)return;const n=nodes.get(id)||{id,label,type,count:0};n.count++;nodes.set(id,n);};
  const link=(a,b)=>{if(!a||!b||a===b)return;const k=[a,b].sort().join('||');const l=links.get(k)||{source:a,target:b,weight:0};l.weight++;links.set(k,l);};
  for(const r of reports){
    const rid='r:'+norm(r.title);add(rid,r.title,'report');
    const cid='c:'+r.primaryCountryIso3;if(r.primaryCountryIso3){add(cid,r.primaryCountry||r.primaryCountryIso3.toUpperCase(),'country');link(rid,cid);}
    for(const s of String(r.source||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,2)){const id='s:'+norm(s);add(id,s,'source');link(rid,id);}
    for(const t of (r.themes||[]).slice(0,4)){const id='t:'+norm(t);add(id,t,'theme');link(rid,id);}
  }
  const keep=[...nodes.values()].filter(n=>n.type!=='report'||n.count||true).sort((a,b)=>b.count-a.count).slice(0,120);
  const ids=new Set(keep.map(n=>n.id));
  return {nodes:keep,links:[...links.values()].filter(l=>ids.has(l.source)&&ids.has(l.target)),reports};
}
function renderNetwork(){
  const reports=filteredReports();network=buildNetwork(reports);
  $('#network-count').textContent=`${reports.length} reports · ${network.nodes.length} nodes · ${network.links.length} edges`;
  $('#network-results').innerHTML=reports.slice(0,28).map(r=>`<article class="network-result"><span>${safe(r.primaryCountry)} · ${safe(r.source)}</span><button data-report-node="r:${safe(norm(r.title))}">${safe(r.title)}</button><small>${safe(r.dateOriginal)}</small></article>`).join('')||'<p class="micro">No matches.</p>';
  $$('[data-report-node]').forEach(b=>b.addEventListener('click',()=>selectNode(b.dataset.reportNode)));
  drawNetworkSvg(network);
  renderWordCloud(reports);
  renderNetworkStats(reports);
}
function drawNetworkSvg(net){
  const svg=$('#network-svg');if(!svg)return;const W=900,H=560,cx=W/2,cy=H/2;
  const typeAngle={country:-Math.PI/2,theme:0,source:Math.PI/2,report:Math.PI};
  const groups={country:[],theme:[],source:[],report:[]};net.nodes.forEach(n=>(groups[n.type]||groups.report).push(n));
  for(const [type,arr] of Object.entries(groups)){const base=typeAngle[type];arr.forEach((n,i)=>{const spread=Math.PI*0.72;const a=base-spread/2+(i/(Math.max(1,arr.length-1)))*spread;const ring=type==='report'?245:185+(i%3)*24;n.x=cx+Math.cos(a)*ring;n.y=cy+Math.sin(a)*ring;});}
  const byId=new Map(net.nodes.map(n=>[n.id,n]));
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.innerHTML=`<g class="net-links">${net.links.map(l=>{const a=byId.get(l.source),b=byId.get(l.target);if(!a||!b)return'';return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke-width="${Math.min(3,0.5+l.weight*.22)}"></line>`}).join('')}</g><g class="net-nodes">${net.nodes.map(n=>`<g class="net-node ${n.type}${selectedNode===n.id?' selected':''}" data-node-id="${safe(n.id)}" transform="translate(${n.x},${n.y})"><circle r="${Math.max(4,Math.min(15,4+Math.sqrt(n.count)*2.2))}"></circle><title>${safe(n.label)} · ${n.type} · ${n.count}</title></g>`).join('')}</g>`;
  $$('[data-node-id]',svg).forEach(g=>g.addEventListener('click',()=>selectNode(g.dataset.nodeId)));
}
function selectNode(id){selectedNode=id;const n=network.nodes.find(x=>x.id===id);if(!n)return;const neighbors=[];for(const l of network.links){if(l.source===id||l.target===id){const other=l.source===id?l.target:l.source;const node=network.nodes.find(x=>x.id===other);if(node)neighbors.push({...node,weight:l.weight});}}neighbors.sort((a,b)=>b.weight-a.weight);
  $('#node-detail').innerHTML=`<span class="eyebrow">${safe(n.type)} node</span><h3>${safe(n.label)}</h3><div class="node-metrics"><article><span>Occurrences</span><strong>${fmt(n.count)}</strong></article><article><span>Connections</span><strong>${fmt(neighbors.length)}</strong></article></div><h4>Strongest links</h4><div class="rank-list">${neighbors.slice(0,12).map(x=>`<button class="rank-row node-link" data-node-link="${safe(x.id)}"><span>${safe(x.label)}</span><strong>${fmt(x.weight)}</strong></button>`).join('')||'<p class="micro">No linked nodes in this filtered view.</p>'}</div>`;
  $$('[data-node-link]').forEach(b=>b.addEventListener('click',()=>selectNode(b.dataset.nodeLink)));
  drawNetworkSvg(network);
}
function renderNetworkStats(reports){
  const countries=new Set(reports.map(r=>r.primaryCountryIso3).filter(Boolean));const sources=new Set(reports.flatMap(r=>String(r.source||'').split(',').map(x=>x.trim()).filter(Boolean)));const themes=new Set(reports.flatMap(r=>r.themes||[]));
  $('#network-stats').innerHTML=[['Reports',reports.length],['Countries',countries.size],['Sources',sources.size],['Themes',themes.size]].map(([k,v])=>`<div><span>${k}</span><strong>${fmt(v)}</strong></div>`).join('');
}
function renderWordCloud(reports){
  const m=new Map();
  for(const r of reports){for(const t of r.themes||[])m.set(t,(m.get(t)||0)+3);for(const w of String(r.title||'').toLowerCase().match(/[a-z][a-z-]{3,}/g)||[]){if(STOP.has(w))continue;m.set(w,(m.get(w)||0)+1);}}
  const words=[...m].map(([word,count])=>({word,count})).sort((a,b)=>b.count-a.count).slice(0,42);const max=Math.max(1,...words.map(x=>x.count));
  $('#network-wordcloud').innerHTML=words.map(x=>`<button style="font-size:${12+Math.round(23*x.count/max)}px" data-cloud="${safe(x.word)}">${safe(x.word)}</button>`).join('')||'<p class="micro">No keywords available.</p>';
  $$('[data-cloud]').forEach(b=>b.addEventListener('click',()=>{$('#network-search').value=b.dataset.cloud;renderNetwork();}));
}
function renderTicker(){
  const host=$('#rw-ticker-track');if(!host)return;const items=rss.slice(0,30).filter(x=>x.title&&x.url);const html=items.map(x=>`<a href="${safe(x.url)}" target="_blank" rel="noopener"><strong>ReliefWeb</strong> ${safe(x.title)}</a>`).join('');host.innerHTML=html+html;
}

function ensureViewAwareness(){
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-view]');if(!b)return;if(b.dataset.view==='network')setTimeout(()=>drawNetworkSvg(network),60);});
}
ensureViewAwareness();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>loadData().catch(console.error),{once:true});else loadData().catch(console.error);
