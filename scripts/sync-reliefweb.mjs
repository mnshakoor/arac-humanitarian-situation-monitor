import fs from 'node:fs/promises';

const appname = process.env.RELIEFWEB_APPNAME;
if (!appname) throw new Error('RELIEFWEB_APPNAME is required. Add it as a GitHub Actions repository secret.');
const base = 'https://api.reliefweb.int/v2';

async function post(endpoint, body, timeoutMs = 70000) {
  const res = await fetch(`${base}/${endpoint}?appname=${encodeURIComponent(appname)}`, {
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify(body),
    signal:AbortSignal.timeout(timeoutMs)
  });
  if (!res.ok) throw new Error(`${endpoint} request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const now = new Date();
const reliefWebIso = d => d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
const daysAgo = n => new Date(now.getTime() - n * 86400000);

let previousSnapshot = null;
try { previousSnapshot = JSON.parse(await fs.readFile('data/snapshot.json','utf8')); } catch { previousSnapshot = null; }
const previousCountryByIso = new Map((previousSnapshot?.countries || []).map(c => [String(c.iso3 || '').toLowerCase(), c]));
const previousProvenance = {...(previousSnapshot?.provenance || {})};
delete previousProvenance.appname;

function facetRoot(obj) { return obj?.embedded?.facets || obj?._embedded?.facets || obj?.facets || {}; }
function facetMap(obj,name) {
  const facets=facetRoot(obj);
  const f=facets?.[name] || (Array.isArray(facets)?facets.find(x=>x?.name===name):null);
  const data=f?.data || (Array.isArray(f)?f:[]);
  return Array.isArray(data)?data:[];
}
const facetValue=x=>x?.value ?? x?.name ?? x?.term ?? '';
const facetCount=x=>x?.count ?? x?.value_count ?? 0;
const countByValue=arr=>new Map(arr.map(x=>[String(facetValue(x)).toLowerCase(),facetCount(x)]));
const normalizeFacet=arr=>arr.map(x=>({name:String(facetValue(x)),count:facetCount(x)}));
const mergeReports=(fresh=[],preserved=[])=>{
  const seen=new Set(), out=[];
  for(const r of [...fresh,...preserved]) { const key=String(r?.id || r?.url || r?.title || ''); if(!key || seen.has(key)) continue; seen.add(key); out.push(r); }
  return out.slice(0,12);
};
const reason = result => result.status === 'rejected' ? String(result.reason?.message || result.reason || 'unavailable').slice(0,240) : null;
const first=x=>Array.isArray(x)?x[0]:x;
const absoluteReliefWebUrl=value=>{
  const v=String(value||'').trim();
  if(!v) return '';
  if(/^https?:\/\//i.test(v)) return v;
  if(v.startsWith('//')) return `https:${v}`;
  if(v.startsWith('/')) return `https://reliefweb.int${v}`;
  return '';
};
const thumbnailCandidatesFromFields=f=>{
  const files=Array.isArray(f?.file)?f.file:(f?.file?[f.file]:[]);
  const previews=files.map(x=>first(x?.preview)).filter(Boolean);
  const image=first(f?.image);
  const values=[];
  for(const p of previews) values.push(p?.['url-thumb'],p?.['url-small'],p?.url,p?.['url-large']);
  if(image) values.push(image?.['url-thumb'],image?.['url-small'],image?.url,image?.['url-large']);
  return [...new Set(values.map(absoluteReliefWebUrl).filter(Boolean))];
};

const reportFields=['title','date.original','primary_country','country','source','theme','format','disaster','disaster_type','language','url','url_alias','image','image.url','image.url-large','image.url-small','image.url-thumb','image.copyright','file','file.url','file.preview','file.preview.url','file.preview.url-large','file.preview.url-small','file.preview.url-thumb'];
const published={field:'status',value:'published'};
const date30={field:'date.original',value:{from:reliefWebIso(daysAgo(30)),to:reliefWebIso(now)}};
const aggregateBody={limit:0,filter:{operator:'AND',conditions:[published,date30]},facets:[
  {name:'countries',field:'primary_country.iso3',limit:200,sort:'count:desc'},
  {name:'themes',field:'theme.name',limit:60,sort:'count:desc'},
  {name:'sources',field:'source.shortname',limit:150,sort:'count:desc'},
  {name:'formats',field:'format.name',limit:60,sort:'count:desc'},
  {name:'timeline',field:'date.original',interval:'day'}
]};
const latestBody={limit:50,profile:'list',sort:['date.original:desc'],filter:{operator:'AND',conditions:[published,date30]},fields:{include:reportFields}};
const current7Body={limit:0,filter:{operator:'AND',conditions:[published,{field:'date.original',value:{from:reliefWebIso(daysAgo(7)),to:reliefWebIso(now)}}]},facets:[{name:'countries',field:'primary_country.iso3',limit:200,sort:'count:desc'}]};
const previous7Body={limit:0,filter:{operator:'AND',conditions:[published,{field:'date.original',value:{from:reliefWebIso(daysAgo(14)),to:reliefWebIso(daysAgo(7))}}]},facets:[{name:'countries',field:'primary_country.iso3',limit:200,sort:'count:desc'}]};
const disasterBody={limit:150,filter:{field:'status',value:['ongoing','alert'],operator:'OR'},fields:{include:['name','date.event','status','glide','country','primary_country','primary_type','type','url']}};

const [aggregateResult,latestResult,current7Result,previous7Result,disastersResult]=await Promise.allSettled([
  post('reports',aggregateBody,70000),
  post('reports',latestBody,70000),
  post('reports',current7Body,35000),
  post('reports',previous7Body,35000),
  post('disasters',disasterBody,70000)
]);

const aggregateFresh=aggregateResult.status==='fulfilled';
const latestFresh=latestResult.status==='fulfilled';
const disastersFresh=disastersResult.status==='fulfilled';
const momentumFresh=current7Result.status==='fulfilled' && previous7Result.status==='fulfilled';

if (!aggregateFresh && !previousSnapshot) throw aggregateResult.reason;
if (!aggregateFresh) console.warn(`Global aggregate retained from last known good snapshot: ${reason(aggregateResult)}`);
if (!latestFresh) console.warn(`Latest reports retained from last known good snapshot: ${reason(latestResult)}`);
if (!disastersFresh) console.warn(`Disaster set retained from last known good snapshot: ${reason(disastersResult)}`);
if (!momentumFresh) console.warn('Momentum comparison retained from last known good snapshot because one or both 7-day ReliefWeb queries were unavailable.');

function normalizeReport(item) {
  if (item?.primaryCountry !== undefined) return item;
  const f=item.fields || {}, pc=f.primary_country || {}, image=first(f.image);
  const thumbnailCandidates=thumbnailCandidatesFromFields(f);
  return {id:item.id,title:f.title,dateOriginal:f.date?.original||f['date.original'],primaryCountry:pc?.name||pc?.[0]?.name||'',primaryCountryIso3:String(pc?.iso3||pc?.[0]?.iso3||'').toLowerCase(),primaryCountryLocation:pc?.location||pc?.[0]?.location||null,source:(f.source||[]).map(s=>s.shortname||s.name).join(', '),format:(f.format||[]).map(x=>x.name).join(', '),themes:(f.theme||[]).map(x=>x.name),disasterTypes:(f.disaster_type||[]).map(x=>x.name),thumbnail:thumbnailCandidates[0]||'',thumbnailCandidates,thumbnailCopyright:image?.copyright||'',url:f.url_alias||f.url||item.href};
}
function normalizeDisaster(d) {
  if (d?.primaryCountryIso3 !== undefined) return d;
  const f=d.fields||d||{};
  return {id:d.id,name:f.name,status:f.status,glide:f.glide,dateEvent:f.date?.event,url:f.url||d.href,primaryCountry:f.primary_country?.name||'',primaryCountryIso3:String(f.primary_country?.iso3||'').toLowerCase(),location:f.primary_country?.location||null,primaryType:f.primary_type?.name||'',types:(f.type||[]).map(x=>typeof x==='string'?x:x.name)};
}

const aggregate=aggregateFresh?aggregateResult.value:null;
const reports=latestFresh?(latestResult.value.data||[]).map(normalizeReport):(previousSnapshot?.reports||[]).map(normalizeReport);
const normalizedDisasters=disastersFresh?(disastersResult.value.data||[]).map(normalizeDisaster):(previousSnapshot?.disasters||[]).map(normalizeDisaster);

const nameMap=new Map(), locationMap=new Map();
for (const r of reports) { if (r.primaryCountryIso3&&r.primaryCountry) nameMap.set(r.primaryCountryIso3,r.primaryCountry); if (r.primaryCountryIso3&&r.primaryCountryLocation) locationMap.set(r.primaryCountryIso3,r.primaryCountryLocation); }
for (const d of normalizedDisasters) { if (d.primaryCountryIso3&&d.primaryCountry) nameMap.set(d.primaryCountryIso3,d.primaryCountry); if (d.primaryCountryIso3&&d.location) locationMap.set(d.primaryCountryIso3,d.location); }

let countries;
if (aggregateFresh) {
  const m7=momentumFresh?countByValue(facetMap(current7Result.value,'countries')):new Map();
  const mp7=momentumFresh?countByValue(facetMap(previous7Result.value,'countries')):new Map();
  countries=facetMap(aggregate,'countries').map(x=>{
    const iso3=String(facetValue(x)).toLowerCase();
    const old=previousCountryByIso.get(iso3)||{};
    const reports30d=facetCount(x);
    const reports7d=momentumFresh?(m7.get(iso3)||0):(old.reports7d??0);
    const previous7d=momentumFresh?(mp7.get(iso3)||0):(old.previous7d??0);
    const change7d=momentumFresh?(previous7d>0?((reports7d-previous7d)/previous7d)*100:null):(old.change7d??null);
    const freshRecent=reports.filter(r=>r.primaryCountryIso3===iso3);
    const preservedEnrichment=(old.enrichmentStatus==='complete'||old.topThemes?.length||old.topSources?.length);
    return {
      name:nameMap.get(iso3)||old.name||iso3.toUpperCase(),shortname:nameMap.get(iso3)||old.shortname||old.name||iso3.toUpperCase(),iso3,
      location:locationMap.get(iso3)||old.location||null,overview:old.overview||'',countryUrl:old.countryUrl||'',reports30d,reports7d,previous7d,change7d,
      uniqueSources:preservedEnrichment?(old.uniqueSources||0):0,themeBreadth:preservedEnrichment?(old.themeBreadth||0):0,formatBreadth:preservedEnrichment?(old.formatBreadth||0):0,
      topThemes:preservedEnrichment?(old.topThemes||[]):[],topSources:preservedEnrichment?(old.topSources||[]):[],topFormats:preservedEnrichment?(old.topFormats||[]):[],disasterTypes:preservedEnrichment?(old.disasterTypes||[]):[],timeline:preservedEnrichment?(old.timeline||[]):[],
      recentReports:mergeReports(freshRecent,preservedEnrichment?(old.recentReports||[]):[]),enrichmentStatus:preservedEnrichment?'complete':'pending-daily'
    };
  });
} else {
  countries=(previousSnapshot?.countries||[]).map(c=>({...c,location:locationMap.get(String(c.iso3||'').toLowerCase())||c.location||null}));
}
const profiledCountries=countries.filter(c=>c.enrichmentStatus==='complete'||c.topThemes?.length||c.topSources?.length).length;
const componentFresh={aggregate:aggregateFresh,latestReports:latestFresh,momentum:momentumFresh,disasters:disastersFresh};
const degraded=Object.values(componentFresh).some(v=>!v);
const retainedGeneratedAt=aggregateFresh?now.toISOString():(previousSnapshot?.generatedAt||now.toISOString());
const retainedAgeHours=Math.max(0,(now-new Date(retainedGeneratedAt))/36e5);
const aggregateStale=!aggregateFresh&&(!Number.isFinite(retainedAgeHours)||retainedAgeHours>30);

const snapshot={
  schema:'arac.ahsm.snapshot.v2',
  generatedAt:retainedGeneratedAt,
  lastSyncAttemptAt:now.toISOString(),
  enrichedAt:previousSnapshot?.enrichedAt||null,
  status:aggregateStale?'RELIEFWEB STALE / LAST-KNOWN-GOOD':degraded?'RELIEFWEB PARTIAL / LAST-KNOWN-GOOD':'RELIEFWEB LIVE SNAPSHOT',
  stale:aggregateStale,
  syncHealth:{state:degraded?'degraded':'healthy',componentFresh,errors:{aggregate:reason(aggregateResult),latestReports:reason(latestResult),current7:reason(current7Result),previous7:reason(previous7Result),disasters:reason(disastersResult)}},
  summary:{
    reports30d:aggregateFresh?(aggregate.totalCount??aggregate.total_count??0):(previousSnapshot?.summary?.reports30d??0),
    countries:countries.length,
    uniqueSources:aggregateFresh?facetMap(aggregate,'sources').length:(previousSnapshot?.summary?.uniqueSources??0),
    activeDisasters:disastersFresh?(disastersResult.value.totalCount??disastersResult.value.total_count??normalizedDisasters.length):(previousSnapshot?.summary?.activeDisasters??normalizedDisasters.length),
    profiledCountries,profileTargets:16,momentumFresh
  },
  timeline:aggregateFresh?facetMap(aggregate,'timeline').map(x=>({date:facetValue(x),count:facetCount(x)})):(previousSnapshot?.timeline||[]),
  globalThemes:aggregateFresh?normalizeFacet(facetMap(aggregate,'themes')):(previousSnapshot?.globalThemes||[]),
  globalSources:aggregateFresh?normalizeFacet(facetMap(aggregate,'sources')):(previousSnapshot?.globalSources||[]),
  globalFormats:aggregateFresh?normalizeFacet(facetMap(aggregate,'formats')):(previousSnapshot?.globalFormats||[]),
  countries,reports,disasters:normalizedDisasters,
  provenance:{...previousProvenance,provider:'ReliefWeb API V2',queryGeneratedAt:now.toISOString(),dateBasis:'date.original',status:'published',countryCounting:'primary_country.iso3',aggregateStrategy:'Component-resilient hourly snapshot with separate daily country enrichment',momentumStatus:momentumFresh?'fresh':'last-known-good',coordinateSource:'Embedded ReliefWeb primary_country.location where available',countryNameSource:'Embedded ReliefWeb primary_country names; ISO3 fallback where unavailable',reportThumbnailSource:'ReliefWeb file.preview preferred; report image fallback; invalid previews suppressed in UI',analyticalBoundary:'Reporting intensity and momentum are information-environment signals, not humanitarian severity measures.'}
};

await fs.mkdir('data',{recursive:true});
const target='data/snapshot.json',tmp='data/snapshot.next.json';
await fs.writeFile(tmp,JSON.stringify(snapshot,null,2));
await fs.rename(tmp,target);
console.log(`Wrote ${target}: state=${snapshot.syncHealth.state}, stale=${snapshot.stale}, ${snapshot.summary.reports30d} reports, ${snapshot.summary.countries} countries, ${snapshot.summary.activeDisasters} active/alert disasters.`);
