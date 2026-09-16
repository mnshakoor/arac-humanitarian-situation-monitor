import './v03.js';
import './v04.js';
import './region-map.js';
import './v05.js';
import './v06.js';
import './v07-style.js';
import './v07.js';

const ISO_NAMES={wld:'World',npl:'Nepal',sdn:'Sudan',pse:'State of Palestine',ukr:'Ukraine',lbn:'Lebanon',pak:'Pakistan',uga:'Uganda',idn:'Indonesia',caf:'Central African Republic',ner:'Niger',tur:'Türkiye',mli:'Mali',bfa:'Burkina Faso',ita:'Italy',mrt:'Mauritania',vut:'Vanuatu',rou:'Romania',tza:'United Republic of Tanzania',bra:'Brazil',dji:'Djibouti',egy:'Egypt',jor:'Jordan',sen:'Senegal',slv:'El Salvador',alb:'Albania',bih:'Bosnia and Herzegovina',irn:'Iran (Islamic Republic of)',irq:'Iraq',mda:'Republic of Moldova',ben:'Benin',gmb:'Gambia',kaz:'Kazakhstan',pol:'Poland',tgo:'Togo',vnm:'Viet Nam',fji:'Fiji',lso:'Lesotho',png:'Papua New Guinea',blz:'Belize',brb:'Barbados',btn:'Bhutan',chl:'Chile',esp:'Spain',jpn:'Japan',khm:'Cambodia',rwa:'Rwanda',tha:'Thailand',tls:'Timor-Leste',aus:'Australia',aut:'Austria',aze:'Azerbaijan',can:'Canada',chn:'China',com:'Comoros',cri:'Costa Rica',cyp:'Cyprus',gin:'Guinea',grc:'Greece',guy:'Guyana',hrv:'Croatia',kir:'Kiribati',kor:'Republic of Korea',lby:'Libya',mex:'Mexico',mys:'Malaysia',pri:'Puerto Rico',prk:"Democratic People's Republic of Korea",qat:'Qatar',sau:'Saudi Arabia',svn:'Slovenia',swz:'Eswatini',tun:'Tunisia',wsm:'Samoa'};

let snapshot=null;
let countryByIso=new Map();
let reportByTitle=new Map();

const norm=s=>String(s||'').trim().toLowerCase();
const isoName=(iso,raw='')=>{const code=norm(iso);const value=String(raw||'').trim();return !value||norm(value)===code?(ISO_NAMES[code]||value||code.toUpperCase()):value;};
const countryLabel=(iso,raw='')=>`${isoName(iso,raw)} (${String(iso||'').toUpperCase()})`;
const dateLabel=value=>{if(!value)return'';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(d);};
const localAsset=value=>{const v=String(value||'').trim();return v.startsWith('./assets/report-thumbs/')?v:'';};

function indexSnapshot(data){
  snapshot=data;
  countryByIso=new Map((data.countries||[]).map(c=>[norm(c.iso3),c]));
  const reports=[...(data.reports||[])];
  for(const c of data.countries||[]) reports.push(...(c.recentReports||[]));
  reportByTitle=new Map();
  for(const r of reports){if(r?.title&&!reportByTitle.has(norm(r.title)))reportByTitle.set(norm(r.title),r);}
}

function normalizeCountryControls(root=document){
  for(const select of root.querySelectorAll?.('#country-select,#query-country')||[]){
    for(const opt of select.options||[]){
      if(!opt.value)continue;
      const c=countryByIso.get(norm(opt.value));
      const label=countryLabel(opt.value,c?.name||opt.textContent);
      if(opt.textContent!==label)opt.textContent=label;
    }
  }
  for(const el of root.querySelectorAll?.('.country-open,.country-open-pulse')||[]){
    const iso=norm(el.dataset.iso3);if(!iso)continue;
    const c=countryByIso.get(iso);
    const label=countryLabel(iso,c?.name||el.textContent);
    if(el.textContent!==label)el.textContent=label;
  }
}

function normalizeWorkspace(root=document){
  const workspace=root.querySelector?.('#country-workspace');
  if(!workspace)return;
  const select=document.querySelector('#country-select');
  const iso=norm(select?.value);if(!iso)return;
  const c=countryByIso.get(iso);const name=isoName(iso,c?.name);
  const head=workspace.querySelector('.country-head');
  if(head){
    const eyebrow=head.querySelector('.eyebrow');const eyebrowText=`${name} (${iso.toUpperCase()}) · COUNTRY WORKSPACE`;if(eyebrow&&eyebrow.textContent!==eyebrowText)eyebrow.textContent=eyebrowText;
    const h2=head.querySelector('h2');if(h2&&h2.textContent!==name)h2.textContent=name;
  }
}

function fallbackTrend(root=document){
  const canvas=root.querySelector?.('#country-trend');
  if(!canvas||canvas.dataset.fallbackApplied==='1')return;
  const iso=norm(document.querySelector('#country-select')?.value);const c=countryByIso.get(iso);if(!c)return;
  if(Array.isArray(c.timeline)&&c.timeline.length)return;
  canvas.dataset.fallbackApplied='1';
  const prev=Number(c.previous7d||0),cur=Number(c.reports7d||0),max=Math.max(prev,cur,1);
  const box=document.createElement('div');box.className='trend-fallback';
  box.innerHTML=`<p class="micro">Daily country-level 30-day series is pending detailed enrichment. Showing the latest comparable 7-day periods instead.</p><div class="trend-bars"><div class="trend-bar"><div class="trend-bar-fill" style="height:${Math.max(6,(prev/max)*160)}px"></div><strong>${prev.toLocaleString()}</strong><span>Previous 7 days</span></div><div class="trend-bar"><div class="trend-bar-fill" style="height:${Math.max(6,(cur/max)*160)}px"></div><strong>${cur.toLocaleString()}</strong><span>Current 7 days</span></div></div>`;
  canvas.replaceWith(box);
}

function addThumbnail(card,r){
  const src=localAsset(r.localThumbnail);if(!src)return;
  const img=document.createElement('img');
  img.className='report-thumb';img.loading='lazy';img.decoding='async';img.alt='ReliefWeb report preview';img.src=src;
  img.addEventListener('error',()=>{img.remove();card.classList.remove('has-thumb');},{once:true});
  card.prepend(img);card.classList.add('has-thumb');
}

function enhanceReportCards(root=document){
  for(const card of root.querySelectorAll?.('.report-card')||[]){
    if(card.dataset.enhanced==='1')continue;
    const title=card.querySelector('h3')?.textContent?.trim();if(!title)continue;
    const r=reportByTitle.get(norm(title));if(!r)continue;
    card.dataset.enhanced='1';
    addThumbnail(card,r);
    const p=card.querySelector('p');
    if(p&&r.dateOriginal){p.className='report-meta-date';p.innerHTML=`${String(r.source||'ReliefWeb')} · <time datetime="${String(r.dateOriginal).replace(/"/g,'&quot;')}">${dateLabel(r.dateOriginal)}</time>`;}
  }
}

function apply(root=document){normalizeCountryControls(root);normalizeWorkspace(root);fallbackTrend(root);enhanceReportCards(root);}

async function boot(){
  try{const res=await fetch('./data/snapshot.json',{cache:'no-store'});if(!res.ok)return;indexSnapshot(await res.json());}
  catch{return;}
  apply(document);
  const observer=new MutationObserver(mutations=>{for(const m of mutations){for(const n of m.addedNodes){if(n.nodeType===1)apply(n);}}apply(document);});
  observer.observe(document.body,{childList:true,subtree:true});
  document.querySelector('#country-select')?.addEventListener('change',()=>setTimeout(()=>apply(document),0));
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
