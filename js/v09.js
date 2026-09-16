const RC={bootAt:Date.now(),longTasks:0,maxLongTask:0,errors:0,rejections:0,connectivityChanges:0,lastError:null,snapshot:null,observer:null};

const rcSafe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const rcAgeHours=value=>{const t=new Date(value).getTime();return Number.isFinite(t)?Math.max(0,(Date.now()-t)/36e5):null;};
const rcDuration=ms=>ms<1000?`${Math.round(ms)} ms`:`${(ms/1000).toFixed(1)} s`;

function injectRcStyles(){
  if(document.querySelector('#ahsm-rc-style'))return;
  const style=document.createElement('style');style.id='ahsm-rc-style';style.textContent=`
  .rc-health{margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
  .rc-health-head{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:9px}
  .rc-health-head h3{margin:0;font-size:14px}.rc-health dl{display:grid;grid-template-columns:minmax(125px,.8fr) minmax(0,1.2fr);gap:6px 14px;margin:0}
  .rc-health dt{font-size:12px;color:var(--muted)}.rc-health dd{margin:0;text-align:right;font-size:12px;overflow-wrap:anywhere}.rc-ok{color:var(--ok)}.rc-warn{color:#f1c66d}.rc-bad{color:var(--danger)}
  body.ahsm-background .ticker-track{animation-play-state:paused!important}body.ahsm-background .net-node,body.ahsm-background .net-links line{transition:none!important}
  @media(max-width:430px){.rc-health dl{grid-template-columns:1fr;gap:2px}.rc-health dd{text-align:left;margin-bottom:6px}}
  @media(prefers-reduced-motion:reduce){html{scroll-behavior:auto!important}.ticker-track{animation:none!important;transform:none!important}.net-node,.net-links line{transition:none!important}}
  `;document.head.append(style);
}

function runtimeLevel(){
  if(RC.errors||RC.rejections||RC.maxLongTask>=3000)return {label:'ATTENTION',cls:'rc-bad'};
  if(RC.longTasks>=8||RC.maxLongTask>=1000)return {label:'WATCH',cls:'rc-warn'};
  return {label:'STABLE',cls:'rc-ok'};
}

function componentSummary(){
  const fresh=RC.snapshot?.syncHealth?.componentFresh||{};
  const keys=['aggregate','latestReports','momentum','disasters'];
  const known=keys.filter(k=>typeof fresh[k]==='boolean');
  const ok=known.filter(k=>fresh[k]).length;
  return known.length?`${ok}/${known.length} fresh`:'not reported';
}

function renderRcHealth(){
  const panel=document.querySelector('#data-health-panel');if(!panel)return false;
  let host=panel.querySelector('#rc-health-section');
  if(!host){host=document.createElement('section');host.id='rc-health-section';host.className='rc-health';panel.append(host);}
  const level=runtimeLevel(),age=rcAgeHours(RC.snapshot?.generatedAt),uptime=Date.now()-RC.bootAt;
  host.innerHTML=`<div class="rc-health-head"><h3>Release Candidate Runtime</h3><strong class="${level.cls}">${level.label}</strong></div><dl>
    <dt>Session uptime</dt><dd>${rcSafe(rcDuration(uptime))}</dd>
    <dt>Snapshot age</dt><dd>${age==null?'unknown':`${age.toFixed(1)} h`}</dd>
    <dt>Core components</dt><dd>${rcSafe(componentSummary())}</dd>
    <dt>Long tasks</dt><dd>${RC.longTasks} · max ${rcSafe(rcDuration(RC.maxLongTask))}</dd>
    <dt>Script errors</dt><dd>${RC.errors}</dd>
    <dt>Promise rejections</dt><dd>${RC.rejections}</dd>
    <dt>Connectivity changes</dt><dd>${RC.connectivityChanges}</dd>
    <dt>Page visibility</dt><dd>${document.hidden?'background':'foreground'}</dd>
  </dl>${RC.lastError?`<p class="micro">Last runtime issue: ${rcSafe(RC.lastError)}</p>`:'<p class="micro">Runtime diagnostics are local to this browser session and are not transmitted.</p>'}`;
  return true;
}

function bindHealthPanel(){
  const button=document.querySelector('#data-health');
  if(!button||button.dataset.rcBound==='1')return false;
  button.dataset.rcBound='1';
  button.addEventListener('click',()=>setTimeout(renderRcHealth,0));
  renderRcHealth();return true;
}

function awaitHealthPanel(){
  if(bindHealthPanel())return;
  let attempts=0;
  RC.observer=new MutationObserver(()=>{attempts++;if(bindHealthPanel()||attempts>30){RC.observer?.disconnect();RC.observer=null;}});
  RC.observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{RC.observer?.disconnect();RC.observer=null;},8000);
}

function observeRuntime(){
  window.addEventListener('error',event=>{RC.errors++;RC.lastError=event.message||'Script error';renderRcHealth();});
  window.addEventListener('unhandledrejection',event=>{RC.rejections++;RC.lastError=String(event.reason?.message||event.reason||'Unhandled promise rejection');renderRcHealth();});
  window.addEventListener('online',()=>{RC.connectivityChanges++;renderRcHealth();});
  window.addEventListener('offline',()=>{RC.connectivityChanges++;renderRcHealth();});
  document.addEventListener('visibilitychange',()=>{document.body.classList.toggle('ahsm-background',document.hidden);renderRcHealth();});
  if('PerformanceObserver' in window){
    try{const po=new PerformanceObserver(list=>{for(const entry of list.getEntries()){RC.longTasks++;RC.maxLongTask=Math.max(RC.maxLongTask,entry.duration||0);}renderRcHealth();});po.observe({type:'longtask',buffered:true});}catch{}
  }
}

async function loadSnapshot(){
  try{const r=await fetch('./data/snapshot.json',{cache:'no-store'});if(r.ok)RC.snapshot=await r.json();}catch{}
}

async function bootRc(){
  injectRcStyles();observeRuntime();await loadSnapshot();awaitHealthPanel();renderRcHealth();
  window.__AHSM_RC_HEALTH__=RC;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootRc,{once:true});else bootRc();
