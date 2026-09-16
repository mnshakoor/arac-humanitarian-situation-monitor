const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const norm=v=>String(v||'').trim().toLowerCase();
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[c]));
const fmt=n=>new Intl.NumberFormat().format(Number(n||0));
const pct=n=>`${n>=0?'+':''}${Number(n||0).toFixed(1)}%`;

let snapshot=null;
let temporalState={window:'7d',current:null,previous:null};

function reportFields(r={}){
  const pc=r.primaryCountry||r.primary_country?.name||r.primary_country?.[0]?.name||'';
  const iso=norm(r.primaryCountryIso3||r.primary_country?.iso3||r.primary_country?.[0]?.iso3);
  const source=typeof r.source==='string'?r.source:(r.source||[]).map(x=>x.shortname||x.name).join(', ');
  const themes=(r.themes||r.theme||[]).map?.(x=>typeof x==='string'?x:x.name)||[];
  return {...r,primaryCountry:pc,primaryCountryIso3:iso,source,themes,dateOriginal:r.dateOriginal||r.date?.original||''};
}
function parseDate(v){const d=new Date(v);return Number.isNaN(d.getTime())?null:d;}
function maxReportDate(reports){const dates=reports.map(r=>parseDate(r.dateOriginal)).filter(Boolean).sort((a,b)=>b-a);return dates[0]||new Date(snapshot?.generatedAt||Date.now());}
function windowMs(key){return key==='24h'?86400000:key==='30d'?30*86400000:7*86400000;}
function regionOf(iso){return window.AHSM_REGION_MAP?.[norm(iso)]||'Other / Global';}

function filteredBaseReports(){
  const reports=(snapshot?.reports||[]).map(reportFields);
  const q=norm($('#network-search')?.value),theme=norm($('#network-theme')?.value),source=norm($('#network-source')?.value),country=norm($('#network-country')?.value),region=$('#network-region')?.value||'';
  return reports.filter(r=>{
    if(country&&r.primaryCountryIso3!==country)return false;
    if(region&&regionOf(r.primaryCountryIso3)!==region)return false;
    if(source&&!norm(r.source).includes(source))return false;
    if(theme&&!r.themes.some(t=>norm(t).includes(theme)))return false;
    if(q&&!norm([r.title,r.primaryCountry,r.source,...r.themes].join(' ')).includes(q))return false;
    return true;
  });
}
function sliceWindow(reports,key,offset=0){
  const anchor=maxReportDate(reports.length?reports:(snapshot?.reports||[]));
  const size=windowMs(key);const end=new Date(anchor.getTime()-offset*size);const start=new Date(end.getTime()-size);
  return {start,end,reports:reports.filter(r=>{const d=parseDate(r.dateOriginal);return d&&d>start&&d<=end;})};
}
function entityGraph(reports){
  const nodes=new Map(),edges=new Map();
  const add=(id,label,type)=>{if(!id)return;const n=nodes.get(id)||{id,label,type,reports:0,weightedDegree:0,degree:0};n.reports++;nodes.set(id,n);};
  const edge=(a,b)=>{if(!a||!b||a===b)return;const [x,y]=[a,b].sort();const k=x+'||'+y;const e=edges.get(k)||{id:k,source:x,target:y,weight:0};e.weight++;edges.set(k,e);};
  for(const r of reports){
    const entities=[];
    if(r.primaryCountryIso3){const id='c:'+r.primaryCountryIso3;add(id,r.primaryCountry||r.primaryCountryIso3.toUpperCase(),'country');entities.push(id);}
    for(const s of String(r.source||'').split(',').map(x=>x.trim()).filter(Boolean).slice(0,3)){const id='s:'+norm(s);add(id,s,'source');entities.push(id);}
    for(const t of (r.themes||[]).slice(0,6)){const id='t:'+norm(t);add(id,t,'theme');entities.push(id);}
    const uniq=[...new Set(entities)];
    for(let i=0;i<uniq.length;i++)for(let j=i+1;j<uniq.length;j++)edge(uniq[i],uniq[j]);
  }
  const adj=new Map([...nodes.keys()].map(id=>[id,new Map()]));
  for(const e of edges.values()){adj.get(e.source)?.set(e.target,e.weight);adj.get(e.target)?.set(e.source,e.weight);}
  for(const n of nodes.values()){const a=adj.get(n.id)||new Map();n.degree=a.size;n.weightedDegree=[...a.values()].reduce((s,x)=>s+x,0);}
  return {nodes:[...nodes.values()],edges:[...edges.values()],adj,reports};
}
function labelCommunities(graph){
  const labels=new Map(graph.nodes.map((n,i)=>[n.id,i]));
  for(let iter=0;iter<12;iter++){
    let changed=0;
    for(const n of [...graph.nodes].sort((a,b)=>b.weightedDegree-a.weightedDegree)){
      const score=new Map();for(const [other,w] of graph.adj.get(n.id)||[]){const l=labels.get(other);score.set(l,(score.get(l)||0)+w);}if(!score.size)continue;
      const best=[...score.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];if(labels.get(n.id)!==best){labels.set(n.id,best);changed++;}
    }
    if(!changed)break;
  }
  const remap=new Map();let i=1;for(const l of labels.values())if(!remap.has(l))remap.set(l,i++);
  return new Map([...labels].map(([id,l])=>[id,remap.get(l)]));
}
function changeAnalysis(current,previous){
  const prevNodes=new Map(previous.nodes.map(n=>[n.id,n]));
  const curNodes=new Map(current.nodes.map(n=>[n.id,n]));
  const nodeChanges=current.nodes.map(n=>{const p=prevNodes.get(n.id);return {...n,previousWeighted:p?.weightedDegree||0,deltaWeighted:n.weightedDegree-(p?.weightedDegree||0),deltaReports:n.reports-(p?.reports||0)};});
  const curEdges=new Map(current.edges.map(e=>[e.id,e]));const prevEdges=new Map(previous.edges.map(e=>[e.id,e]));
  const emerging=current.edges.filter(e=>!prevEdges.has(e.id)).sort((a,b)=>b.weight-a.weight);
  const disappearing=previous.edges.filter(e=>!curEdges.has(e.id)).sort((a,b)=>b.weight-a.weight);
  const strengthened=current.edges.filter(e=>prevEdges.has(e.id)&&e.weight>prevEdges.get(e.id).weight).map(e=>({...e,delta:e.weight-prevEdges.get(e.id).weight})).sort((a,b)=>b.delta-a.delta);
  const weakened=current.edges.filter(e=>prevEdges.has(e.id)&&e.weight<prevEdges.get(e.id).weight).map(e=>({...e,delta:e.weight-prevEdges.get(e.id).weight})).sort((a,b)=>a.delta-b.delta);
  const curCom=labelCommunities(current),prevCom=labelCommunities(previous);
  const common=[...curNodes.keys()].filter(id=>prevNodes.has(id));let moved=0;for(const id of common)if(curCom.get(id)!==prevCom.get(id))moved++;
  return {nodeChanges,emerging,disappearing,strengthened,weakened,curCom,prevCom,clusterShift:common.length?moved/common.length*100:0};
}
function labelFor(id,graphs){for(const g of graphs){const n=g.nodes.find(x=>x.id===id);if(n)return n.label;}return id;}
function edgeRows(edges,cur,prev,mode='weight'){
  return edges.slice(0,10).map(e=>`<button class="temporal-row" data-temporal-node="${safe(e.source)}"><span>${safe(labelFor(e.source,[cur,prev]))} ↔ ${safe(labelFor(e.target,[cur,prev]))}</span><strong>${mode==='delta'?(e.delta>0?'+':'')+e.delta:e.weight}</strong></button>`).join('')||'<p class="micro">None detected in this comparison.</p>';
}
function nodeRows(items){return items.slice(0,10).map(n=>`<button class="temporal-row" data-temporal-node="${safe(n.id)}"><span>${safe(n.label)}</span><strong>${n.deltaWeighted>=0?'+':''}${n.deltaWeighted}</strong></button>`).join('')||'<p class="micro">No comparable nodes.</p>';}

function renderTemporal(){
  const host=$('#temporal-intelligence');if(!host||!snapshot)return;
  const key=$('#temporal-window')?.value||'7d';temporalState.window=key;
  const base=filteredBaseReports();const curSlice=sliceWindow(base,key,0),prevSlice=sliceWindow(base,key,1);
  const cur=entityGraph(curSlice.reports),prev=entityGraph(prevSlice.reports);temporalState.current=cur;temporalState.previous=prev;
  const ch=changeAnalysis(cur,prev);
  const reportDelta=cur.reports.length-prev.reports.length;const reportPct=prev.reports.length?reportDelta/prev.reports.length*100:0;
  const rising=[...ch.nodeChanges].sort((a,b)=>b.deltaWeighted-a.deltaWeighted).filter(x=>x.deltaWeighted>0);
  const falling=[...ch.nodeChanges].sort((a,b)=>a.deltaWeighted-b.deltaWeighted).filter(x=>x.deltaWeighted<0);
  $('#temporal-kpis').innerHTML=[['Current reports',cur.reports.length],['Prior reports',prev.reports.length],['Report change',prev.reports.length?pct(reportPct):(reportDelta>=0?`+${reportDelta}`:reportDelta)],['Emerging links',ch.emerging.length],['Disappearing links',ch.disappearing.length],['Cluster reassignment',`${ch.clusterShift.toFixed(1)}%`]].map(([k,v])=>`<article><span>${safe(k)}</span><strong>${safe(v)}</strong></article>`).join('');
  $('#temporal-period').textContent=`${curSlice.start.toISOString().slice(0,10)} → ${curSlice.end.toISOString().slice(0,10)} compared with ${prevSlice.start.toISOString().slice(0,10)} → ${prevSlice.end.toISOString().slice(0,10)}`;
  $('#temporal-rising').innerHTML=nodeRows(rising);
  $('#temporal-falling').innerHTML=nodeRows(falling);
  $('#temporal-emerging').innerHTML=edgeRows(ch.emerging,cur,prev);
  $('#temporal-disappearing').innerHTML=edgeRows(ch.disappearing,cur,prev);
  $('#temporal-strengthened').innerHTML=edgeRows(ch.strengthened,cur,prev,'delta');
  $('#temporal-weakened').innerHTML=edgeRows(ch.weakened,cur,prev,'delta');
  bindTemporalNodeClicks();
  renderTemporalSpark(cur,prev,ch);
}
function renderTemporalSpark(cur,prev,ch){
  const svg=$('#temporal-summary-svg');if(!svg)return;const vals=[prev.reports.length,cur.reports.length,prev.edges.length,cur.edges.length,prev.nodes.length,cur.nodes.length];const max=Math.max(1,...vals);const W=720,H=180,barW=65,gap=45;
  const labels=['Reports prior','Reports now','Links prior','Links now','Nodes prior','Nodes now'];
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.innerHTML=vals.map((v,i)=>{const h=110*v/max,x=24+i*(barW+gap),y=135-h;return `<g><rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="5"></rect><text x="${x+barW/2}" y="${Math.max(16,y-7)}" text-anchor="middle">${v}</text><text x="${x+barW/2}" y="158" text-anchor="middle">${labels[i]}</text></g>`}).join('')+`<text x="24" y="176">Cluster reassignment: ${ch.clusterShift.toFixed(1)}%</text>`;
}
function bindTemporalNodeClicks(){
  $$('[data-temporal-node]').forEach(b=>b.addEventListener('click',()=>{
    const id=b.dataset.temporalNode;const label=labelFor(id,[temporalState.current,temporalState.previous]);
    const search=$('#network-search');if(search){search.value=label.replace(/^c:|^s:|^t:/,'');search.dispatchEvent(new Event('input',{bubbles:true}));}
  }));
}
function injectUI(){
  const view=$('#view-network');const shell=view?.querySelector('.network-shell');if(!view||!shell||$('#temporal-intelligence'))return;
  const panel=document.createElement('section');panel.id='temporal-intelligence';panel.className='panel temporal-intelligence';panel.innerHTML=`<div class="temporal-head"><div><span class="eyebrow">TEMPORAL NETWORK INTELLIGENCE</span><h2>How is the ReliefWeb information network changing?</h2><p class="micro" id="temporal-period"></p></div><label>Compare window<select id="temporal-window" class="select"><option value="24h">24 hours</option><option value="7d" selected>7 days</option><option value="30d">30 days</option></select></label></div><div id="temporal-kpis" class="temporal-kpis"></div><svg id="temporal-summary-svg" class="temporal-summary" role="img" aria-label="Temporal network comparison summary"></svg><div class="temporal-grid"><section><h3>Rising centrality</h3><div id="temporal-rising"></div></section><section><h3>Falling centrality</h3><div id="temporal-falling"></div></section><section><h3>Emerging relationships</h3><div id="temporal-emerging"></div></section><section><h3>Disappearing relationships</h3><div id="temporal-disappearing"></div></section><section><h3>Strengthening relationships</h3><div id="temporal-strengthened"></div></section><section><h3>Weakening relationships</h3><div id="temporal-weakened"></div></section></div><p class="micro temporal-boundary">Temporal change describes movement in the synchronized ReliefWeb information network. It does not independently establish worsening conditions, causality, influence, coordination, or organizational behavior.</p>`;
  view.insertBefore(panel,shell);
  $('#temporal-window').addEventListener('change',renderTemporal);
  for(const id of ['network-search','network-theme','network-source','network-country','network-region'])$('#'+id)?.addEventListener('input',()=>setTimeout(renderTemporal,0));
  $('#network-reset')?.addEventListener('click',()=>setTimeout(renderTemporal,0));
}
async function init(){
  const r=await fetch('./data/snapshot.json',{cache:'no-store'});if(!r.ok)return;snapshot=await r.json();injectUI();renderTemporal();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>init().catch(console.error),{once:true});else init().catch(console.error);
