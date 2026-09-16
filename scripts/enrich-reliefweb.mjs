import fs from 'node:fs/promises';

const appname=process.env.RELIEFWEB_APPNAME;
if(!appname) throw new Error('RELIEFWEB_APPNAME is required.');
const base='https://api.reliefweb.int/v2';
const TOP_LIMIT=30;
const MAX_TARGETS=40;
const BATCH=4;
const PRIORITY=['sdn','cod','moz','som','tcd','ssd','eth','mli','ner','nga','cmr','mrt','bfa','ben','tgo','gha','civ','sen','sle','gin','lbr','caf','bdi'];

async function post(body,timeoutMs=22000){
  const res=await fetch(`${base}/reports?appname=${encodeURIComponent(appname)}`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
  if(!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
function facetRoot(obj){return obj?.embedded?.facets||obj?._embedded?.facets||obj?.facets||{};}
function facetMap(obj,name){const root=facetRoot(obj);const f=root?.[name]||(Array.isArray(root)?root.find(x=>x?.name===name):null);const data=f?.data||(Array.isArray(f)?f:[]);return Array.isArray(data)?data:[];}
const facetValue=x=>x?.value??x?.name??x?.term??'';
const facetCount=x=>x?.count??x?.value_count??0;
const normalizeFacet=arr=>arr.map(x=>({name:String(facetValue(x)),count:facetCount(x)}));
const first=x=>Array.isArray(x)?x[0]:x;
const uniq=a=>[...new Set(a.filter(Boolean))];
const absoluteReliefWebUrl=value=>{const v=String(value||'').trim();if(!v)return'';if(/^https?:\/\//i.test(v))return v;if(v.startsWith('//'))return`https:${v}`;if(v.startsWith('/'))return`https://reliefweb.int${v}`;return'';};
const thumbnailCandidatesFromFields=f=>{const files=Array.isArray(f?.file)?f.file:(f?.file?[f.file]:[]);const previews=files.map(x=>first(x?.preview)).filter(Boolean);const image=first(f?.image);const values=[];for(const p of previews)values.push(p?.['url-thumb'],p?.['url-small'],p?.url,p?.['url-large']);if(image)values.push(image?.['url-thumb'],image?.['url-small'],image?.url,image?.['url-large']);return uniq(values.map(absoluteReliefWebUrl));};
const reportFields=['title','date.original','primary_country','country','source','theme','format','disaster','disaster_type','language','url','url_alias','image','image.url','image.url-large','image.url-small','image.url-thumb','image.copyright','file','file.url','file.preview','file.preview.url','file.preview.url-large','file.preview.url-small','file.preview.url-thumb'];
const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
const now=new Date();
const reliefWebIso=d=>d.toISOString().replace(/\.\d{3}Z$/,'+00:00');
const daysAgo=n=>new Date(now.getTime()-n*86400000);

function normalizeReport(item){const f=item.fields||{},pc=f.primary_country||{},image=first(f.image),thumbnailCandidates=thumbnailCandidatesFromFields(f);return{id:item.id,title:f.title,dateOriginal:f.date?.original||f['date.original'],primaryCountry:pc?.name||pc?.[0]?.name||'',primaryCountryIso3:String(pc?.iso3||pc?.[0]?.iso3||'').toLowerCase(),primaryCountryLocation:pc?.location||pc?.[0]?.location||null,source:(f.source||[]).map(s=>s.shortname||s.name).join(', '),format:(f.format||[]).map(x=>x.name).join(', '),themes:(f.theme||[]).map(x=>x.name),disasterTypes:(f.disaster_type||[]).map(x=>x.name),thumbnail:thumbnailCandidates[0]||'',thumbnailCandidates,thumbnailCopyright:image?.copyright||'',url:f.url_alias||f.url||item.href};}
function periodFilter(c,from,to){return{operator:'AND',conditions:[{field:'status',value:'published'},{field:'primary_country.iso3',value:c.iso3},{field:'date.original',value:{from:reliefWebIso(from),to:reliefWebIso(to)}}]};}
function profileBody(c){return{limit:12,profile:'list',sort:['date.original:desc'],filter:periodFilter(c,daysAgo(30),now),fields:{include:reportFields},facets:[{name:'themes',field:'theme.name',limit:30,sort:'count:desc'},{name:'sources',field:'source.shortname',limit:60,sort:'count:desc'},{name:'formats',field:'format.name',limit:30,sort:'count:desc'},{name:'disasterTypes',field:'disaster_type.name',limit:30,sort:'count:desc'},{name:'timeline',field:'date.original',interval:'day'}]};}
function compareBody(c,from,to){return{limit:0,filter:periodFilter(c,from,to),facets:[{name:'themes',field:'theme.name',limit:40,sort:'count:desc'},{name:'sources',field:'source.shortname',limit:80,sort:'count:desc'},{name:'formats',field:'format.name',limit:40,sort:'count:desc'}]};}
function buildMomentum(current=[],previous=[]){const cur=new Map(current.map(x=>[String(facetValue(x)),facetCount(x)])),prev=new Map(previous.map(x=>[String(facetValue(x)),facetCount(x)]));const names=uniq([...cur.keys(),...prev.keys()]);return names.map(name=>{const c=cur.get(name)||0,p=prev.get(name)||0;return{name,current:c,previous:p,absolute:c-p,changePct:p>0?((c-p)/p)*100:(c>0?null:0)}}).sort((a,b)=>(b.current+b.previous)-(a.current+a.previous));}
function ecology(rows=[]){const vals=rows.map(x=>Number(x.count||0)).filter(x=>x>0),total=vals.reduce((a,b)=>a+b,0);if(!total)return null;const shares=vals.map(v=>v/total);const h=-shares.reduce((s,p)=>s+p*Math.log(p),0);return{sourceAssignments:total,uniqueSources:rows.length,top1Share:(shares[0]||0)*100,top5Share:shares.slice(0,5).reduce((a,b)=>a+b,0)*100,shannonEntropy:h,effectiveSourceCount:Math.exp(h)};}

const ranked=[...(snapshot.countries||[])].sort((a,b)=>(b.reports30d||0)-(a.reports30d||0));
const top=ranked.slice(0,TOP_LIMIT);
const byIso=new Map(ranked.map(c=>[String(c.iso3||'').toLowerCase(),c]));
const targets=[];const seen=new Set();
for(const c of [...top,...PRIORITY.map(x=>byIso.get(x)).filter(Boolean)]){const iso=String(c.iso3||'').toLowerCase();if(!iso||seen.has(iso))continue;seen.add(iso);targets.push(c);if(targets.length>=MAX_TARGETS)break;}
let completed=0;
for(let i=0;i<targets.length;i+=BATCH){
  const batch=targets.slice(i,i+BATCH);
  const results=await Promise.all(batch.map(async c=>{
    try{
      const [profile,current7,previous7]=await Promise.all([post(profileBody(c),26000),post(compareBody(c,daysAgo(7),now),18000),post(compareBody(c,daysAgo(14),daysAgo(7)),18000)]);
      c.topThemes=normalizeFacet(facetMap(profile,'themes'));
      c.topSources=normalizeFacet(facetMap(profile,'sources'));
      c.topFormats=normalizeFacet(facetMap(profile,'formats'));
      c.disasterTypes=normalizeFacet(facetMap(profile,'disasterTypes'));
      c.timeline=facetMap(profile,'timeline').map(x=>({date:facetValue(x),count:facetCount(x)}));
      c.uniqueSources=c.topSources.length;c.themeBreadth=c.topThemes.length;c.formatBreadth=c.topFormats.length;
      c.themeMomentum=buildMomentum(facetMap(current7,'themes'),facetMap(previous7,'themes'));
      c.sourceMomentum=buildMomentum(facetMap(current7,'sources'),facetMap(previous7,'sources'));
      c.formatMomentum=buildMomentum(facetMap(current7,'formats'),facetMap(previous7,'formats'));
      c.sourceEcology=ecology(c.topSources);
      c.recentReports=(profile.data||[]).map(normalizeReport);
      const exemplar=c.recentReports.find(r=>r.primaryCountry);
      if(exemplar?.primaryCountry){c.name=exemplar.primaryCountry;c.shortname=exemplar.primaryCountry;}
      if(!c.location){const loc=c.recentReports.find(r=>r.primaryCountryLocation)?.primaryCountryLocation;if(loc)c.location=loc;}
      c.enrichmentStatus='complete-v0.3';c.enrichedAt=now.toISOString();
      return true;
    }catch(error){console.warn(`Deferred ${c.iso3}: ${error.message}`);c.enrichmentStatus='deferred';return false;}
  }));
  completed+=results.filter(Boolean).length;
}

snapshot.schema='arac.ahsm.snapshot.v3';
snapshot.summary={...(snapshot.summary||{}),profiledCountries:(snapshot.countries||[]).filter(c=>String(c.enrichmentStatus||'').startsWith('complete')).length,profileTargets:targets.length};
snapshot.enrichedAt=now.toISOString();
snapshot.provenance={...(snapshot.provenance||{}),countryEnrichment:'Daily/manual ReliefWeb analytical enrichment for top-volume plus ARAC priority countries',countryProfileTargetCount:targets.length,countryProfileTopVolume:TOP_LIMIT,themeMomentum:'Current 7d vs previous 7d ReliefWeb theme facets',sourceEcology:'30d ReliefWeb source-assignment concentration and Shannon effective source count',reportThumbnailSource:'ReliefWeb file.preview preferred; report image fallback; invalid previews suppressed in UI'};
await fs.writeFile('data/snapshot.json',JSON.stringify(snapshot,null,2));
console.log(`Enriched ${completed}/${targets.length} country profiles with v0.3 analytics.`);
