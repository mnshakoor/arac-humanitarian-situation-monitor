const RC1_PATCH={snapshot:null,reportObserver:null,disasterObserver:null};
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtDate=value=>{if(!value)return'unknown';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(d);};

function injectStyles(){
  if($('#ahsm-rc1-field-style'))return;
  const style=document.createElement('style');style.id='ahsm-rc1-field-style';style.textContent=`
    .progressive-controls{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid var(--line)}
    .progressive-controls .micro{margin:0}.progressive-controls[hidden]{display:none!important}
    .methodology-public-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:14px}.methodology-public-grid article{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--panel)}.methodology-public-grid h3{margin:0 0 8px}.methodology-public-grid p{margin:0;color:var(--muted)}
    .provenance-list{display:grid!important;grid-template-columns:minmax(120px,.8fr) minmax(0,1.2fr)!important;gap:8px 14px!important}.provenance-list dt{color:var(--muted)}.provenance-list dd{margin:0!important;overflow-wrap:anywhere!important;word-break:normal!important}
    .rc-mobile-toggle{display:none;margin:10px 0 0}
    .disaster-card .disaster-snapshot-note{display:block;margin-top:4px;color:var(--muted);font-size:12px}
    #view-network .network-shell{align-items:start}
    @media(min-width:1181px){#view-network .network-column.analysis{max-height:650px;overflow:auto}}
    @media(max-width:820px){
      .rc-mobile-toggle{display:inline-flex}
      #temporal-intelligence.rc-mobile-collapsed>:not(.temporal-head):not(.rc-mobile-toggle),#temporal-investigation.rc-mobile-collapsed>:not(.panel-head):not(.rc-mobile-toggle){display:none!important}
      .methodology-public-grid{grid-template-columns:1fr}
      .provenance-list{grid-template-columns:1fr!important;gap:2px!important}.provenance-list dd{margin-bottom:8px!important}
    }
  `;document.head.append(style);
}

function deriveHealth(snapshot){
  const age=(Date.now()-new Date(snapshot?.generatedAt||0).getTime())/36e5;
  const fresh=snapshot?.syncHealth?.componentFresh||{};
  const secondary=['latestReports','momentum','disasters'];
  const secondaryOld=secondary.filter(k=>fresh[k]===false);
  if(!Number.isFinite(age)||age>30)return{label:'STALE',level:'bad',note:'The retained aggregate snapshot is older than the operational freshness window. AHSM is serving the last known-good dataset.'};
  if(fresh.aggregate===false)return{label:'DEGRADED',level:'bad',note:`The latest global aggregate request was unavailable. AHSM is preserving a ${age.toFixed(1)}-hour-old last-known-good aggregate while newer component data are retained where available.`};
  if(secondaryOld.length)return{label:'PARTIAL',level:'warn',note:`The global aggregate is fresh. ${secondaryOld.length} secondary component${secondaryOld.length===1?' is':'s are'} using last-known-good data: ${secondaryOld.join(', ')}.`};
  if(age>6)return{label:'PARTIAL',level:'warn',note:'The snapshot is usable but is older than the preferred six-hour freshness window.'};
  return{label:'LIVE',level:'good',note:'All synchronized components are current within the operational freshness window.'};
}

function patchHealth(){
  const button=$('#data-health'),panel=$('#data-health-panel');if(!button||!panel||!RC1_PATCH.snapshot)return false;
  const state=deriveHealth(RC1_PATCH.snapshot);
  button.classList.remove('good','warn','bad');button.classList.add(state.level);button.innerHTML=`Data <strong>${esc(state.label)}</strong>`;button.title=state.note;
  const intro=panel.querySelector(':scope > p');if(intro)intro.textContent=state.note;
  return true;
}

function makePager(target,selector,key,pageSize=25){
  if(!target)return;
  let host=document.querySelector(`[data-pager-for="${key}"]`);
  if(!host){host=document.createElement('div');host.className='progressive-controls';host.dataset.pagerFor=key;target.parentElement?.insertBefore(host,target.nextSibling);}
  const items=[...target.querySelectorAll(`:scope > ${selector}`)];
  let visible=Number(target.dataset.visibleRows||pageSize);if(!Number.isFinite(visible)||visible<pageSize)visible=pageSize;visible=Math.min(visible,items.length||pageSize);target.dataset.visibleRows=String(visible);
  items.forEach((item,i)=>item.hidden=i>=visible);
  const remaining=Math.max(0,items.length-visible);
  host.hidden=items.length<=pageSize;
  host.innerHTML=`<p class="micro" aria-live="polite">Showing ${Math.min(visible,items.length)} of ${items.length}</p>${remaining?`<button type="button" class="button ghost" data-show-more="${key}">Show ${Math.min(pageSize,remaining)} more</button>`:'<button type="button" class="button ghost" data-show-all="'+key+'">Show all loaded</button>'}`;
  host.querySelector('[data-show-more]')?.addEventListener('click',()=>{target.dataset.visibleRows=String(Math.min(items.length,visible+pageSize));makePager(target,selector,key,pageSize);});
  host.querySelector('[data-show-all]')?.addEventListener('click',()=>{target.dataset.visibleRows=String(items.length);items.forEach(x=>x.hidden=false);host.hidden=true;});
}

function setupProgressiveRendering(){
  const table=$('#country-table-body');if(table){makePager(table,'tr','countries',25);}
  const reports=$('#reports-list');if(reports){makePager(reports,'.report-card','reports',25);let timer=null;RC1_PATCH.reportObserver?.disconnect();RC1_PATCH.reportObserver=new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(()=>{reports.dataset.visibleRows='25';makePager(reports,'.report-card','reports',25);},40);});RC1_PATCH.reportObserver.observe(reports,{childList:true});}
}

function patchDisasterCards(){
  for(const card of $$('.disaster-card')){
    for(const el of card.querySelectorAll('*')){
      if(el.children.length)continue;const text=el.textContent?.trim()||'';const m=text.match(/^Event date:\s*(.+)$/i);if(m&&/\d{4}-\d{2}-\d{2}T/.test(m[1]))el.textContent=`Event date: ${fmtDate(m[1])}`;
    }
    const b=card.querySelector('.disaster-reports-toggle');if(b&&/^Related reports \(0\)/.test(b.textContent||'')){b.textContent='Related reports (0 in snapshot)';b.title='No linked or type-matched reports are present in the synchronized AHSM report corpus.';}
  }
}
function setupDisasterObserver(){const list=$('#disaster-list');if(!list)return;patchDisasterCards();RC1_PATCH.disasterObserver?.disconnect();RC1_PATCH.disasterObserver=new MutationObserver(()=>patchDisasterCards());RC1_PATCH.disasterObserver.observe(list,{childList:true,subtree:true});}

function setupNetworkMobileCompression(){
  const mq=matchMedia('(max-width: 820px)');
  for(const [id,label] of [['temporal-intelligence','Temporal intelligence details'],['temporal-investigation','Temporal evidence and investigation details']]){
    const panel=$('#'+id);if(!panel||panel.dataset.rcCompact==='1')continue;panel.dataset.rcCompact='1';
    const toggle=document.createElement('button');toggle.type='button';toggle.className='button ghost rc-mobile-toggle';toggle.textContent=label;toggle.setAttribute('aria-controls',id);panel.querySelector('.temporal-head,.panel-head')?.insertAdjacentElement('afterend',toggle);
    const apply=expanded=>{panel.classList.toggle('rc-mobile-collapsed',mq.matches&&!expanded);toggle.setAttribute('aria-expanded',String(!panel.classList.contains('rc-mobile-collapsed')));toggle.textContent=panel.classList.contains('rc-mobile-collapsed')?`Show ${label.toLowerCase()}`:`Hide ${label.toLowerCase()}`;};
    apply(!mq.matches);toggle.addEventListener('click',()=>apply(panel.classList.contains('rc-mobile-collapsed')));mq.addEventListener?.('change',()=>apply(!mq.matches));
  }
}

function enhanceMethodology(){
  const panel=$('#view-methodology .panel');if(!panel||panel.dataset.publicMethod==='1'||!RC1_PATCH.snapshot)return;panel.dataset.publicMethod='1';
  const final=[...panel.querySelectorAll('p')].find(p=>p.textContent?.includes('BUILD-DESIGN-MANUAL'));if(final)final.textContent='The public methodology below summarizes the operational rules used by AHSM. Repository engineering documentation is maintained separately from the analytical methodology presented to users.';
  const prov=RC1_PATCH.snapshot.provenance||{};
  const grid=document.createElement('div');grid.className='methodology-public-grid';grid.innerHTML=`
    <article><h3>Data source & scope</h3><p>Provider: ${esc(prov.provider||'ReliefWeb API V2')}. Public analytical views use synchronized published ReliefWeb records and preserve component freshness separately.</p></article>
    <article><h3>Freshness model</h3><p><strong>LIVE</strong> means current core components. <strong>PARTIAL</strong> means the aggregate is current while one or more secondary components use last-known-good data. <strong>DEGRADED</strong> means the latest aggregate request failed but a still-current last-known-good aggregate is retained. <strong>STALE</strong> means the retained aggregate has exceeded the operational freshness window.</p></article>
    <article><h3>Interpretation boundary</h3><p>Report volume, HISI, regional roll-ups, source ecology and network measures describe the humanitarian information environment. They do not independently determine humanitarian severity, causality, source independence or organizational influence.</p></article>
    <article><h3>Network methods</h3><p>Network links represent co-occurrence among reports, countries, sources and themes in the synchronized corpus. Temporal comparisons use equivalent current and prior windows; centrality and community measures describe position inside that information network.</p></article>
    <article><h3>Regional aggregation</h3><p>Regional views roll up the same country-level signals used elsewhere in AHSM. Sparse enrichment can reduce available theme or source detail for low-volume countries and regions.</p></article>
    <article><h3>Reproducibility & provenance</h3><p>Date basis: ${esc(prov.dateBasis||'date.original')}. Country counting: ${esc(prov.countryCounting||'primary_country.iso3')}. Snapshot generation and component freshness are exposed through Data Health and the Source Register.</p></article>`;
  panel.append(grid);
}

function patchSourceRegister(){const list=$('#view-sources .provenance-list');if(!list)return false;for(const dd of list.querySelectorAll('dd'))dd.setAttribute('dir','auto');return true;}

async function loadSnapshot(){try{const r=await fetch('./data/snapshot.json',{cache:'no-store'});if(r.ok)RC1_PATCH.snapshot=await r.json();}catch{}}
function delayedApply(){patchHealth();setupProgressiveRendering();setupDisasterObserver();setupNetworkMobileCompression();enhanceMethodology();patchSourceRegister();}
async function boot(){injectStyles();await loadSnapshot();delayedApply();let tries=0;const timer=setInterval(()=>{tries++;delayedApply();if(tries>=40||($('#data-health')&&$('#temporal-intelligence')&&$('#view-sources')))clearInterval(timer);},150);setTimeout(()=>clearInterval(timer),7000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
