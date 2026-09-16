import fs from 'node:fs/promises';

const appname=process.env.RELIEFWEB_APPNAME;
if(!appname) throw new Error('RELIEFWEB_APPNAME is required.');
const base='https://api.reliefweb.int/v2';
const LIMIT=16;
const BATCH=4;

async function post(body,timeoutMs=20000){
  const res=await fetch(`${base}/reports?appname=${encodeURIComponent(appname)}`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(timeoutMs)});
  if(!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}
function facetRoot(obj){return obj?.embedded?.facets||obj?._embedded?.facets||obj?.facets||{};}
function facetMap(obj,name){const root=facetRoot(obj);const f=root?.[name]||(Array.isArray(root)?root.find(x=>x?.name===name):null);const data=f?.data||(Array.isArray(f)?f:[]);return Array.isArray(data)?data:[];}
const facetValue=x=>x?.value??x?.name??x?.term??'';
const facetCount=x=>x?.count??x?.value_count??0;
const normalizeFacet=arr=>arr.map(x=>({name:String(facetValue(x)),count:facetCount(x)}));
const reportFields=['title','date.original','primary_country','country','source','theme','format','disaster','disaster_type','language','url','url_alias'];
const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
const now=new Date();
const reliefWebIso=d=>d.toISOString().replace(/\.\d{3}Z$/,'+00:00');
const from=new Date(now.getTime()-30*86400000);

function normalizeReport(item){const f=item.fields||{},pc=f.primary_country||{};return{id:item.id,title:f.title,dateOriginal:f.date?.original||f['date.original'],primaryCountry:pc?.name||pc?.[0]?.name||'',primaryCountryIso3:String(pc?.iso3||pc?.[0]?.iso3||'').toLowerCase(),primaryCountryLocation:pc?.location||pc?.[0]?.location||null,source:(f.source||[]).map(s=>s.shortname||s.name).join(', '),format:(f.format||[]).map(x=>x.name).join(', '),themes:(f.theme||[]).map(x=>x.name),disasterTypes:(f.disaster_type||[]).map(x=>x.name),url:f.url_alias||f.url||item.href};}
function bodyFor(c){return{limit:12,sort:['date.original:desc'],filter:{operator:'AND',conditions:[{field:'status',value:'published'},{field:'primary_country.iso3',value:c.iso3},{field:'date.original',value:{from:reliefWebIso(from),to:reliefWebIso(now)}}]},fields:{include:reportFields},facets:[{name:'themes',field:'theme.name',limit:20,sort:'count:desc'},{name:'sources',field:'source.shortname',limit:30,sort:'count:desc'},{name:'formats',field:'format.name',limit:20,sort:'count:desc'},{name:'disasterTypes',field:'disaster_type.name',limit:20,sort:'count:desc'},{name:'timeline',field:'date.original',interval:'day'}]};}

const targets=[...(snapshot.countries||[])].sort((a,b)=>(b.reports30d||0)-(a.reports30d||0)).slice(0,LIMIT);
let completed=0;
for(let i=0;i<targets.length;i+=BATCH){
  const batch=targets.slice(i,i+BATCH);
  const results=await Promise.all(batch.map(async c=>{
    try{
      const response=await post(bodyFor(c));
      c.topThemes=normalizeFacet(facetMap(response,'themes'));
      c.topSources=normalizeFacet(facetMap(response,'sources'));
      c.topFormats=normalizeFacet(facetMap(response,'formats'));
      c.disasterTypes=normalizeFacet(facetMap(response,'disasterTypes'));
      c.timeline=facetMap(response,'timeline').map(x=>({date:facetValue(x),count:facetCount(x)}));
      c.uniqueSources=c.topSources.length;c.themeBreadth=c.topThemes.length;c.formatBreadth=c.topFormats.length;
      c.recentReports=(response.data||[]).map(normalizeReport);
      const exemplar=c.recentReports.find(r=>r.primaryCountry);
      if(exemplar?.primaryCountry){c.name=exemplar.primaryCountry;c.shortname=exemplar.primaryCountry;}
      if(!c.location){const loc=c.recentReports.find(r=>r.primaryCountryLocation)?.primaryCountryLocation;if(loc)c.location=loc;}
      c.enrichmentStatus='complete';
      return true;
    }catch(error){console.warn(`Deferred ${c.iso3}: ${error.message}`);c.enrichmentStatus='deferred';return false;}
  }));
  completed+=results.filter(Boolean).length;
}

snapshot.summary={...(snapshot.summary||{}),profiledCountries:completed,profileTargets:targets.length};
snapshot.enrichedAt=now.toISOString();
snapshot.provenance={...(snapshot.provenance||{}),countryEnrichment:'Daily/manual isolated ReliefWeb country profile pass',countryProfileLimit:LIMIT};
await fs.writeFile('data/snapshot.json',JSON.stringify(snapshot,null,2));
console.log(`Enriched ${completed}/${targets.length} country profiles.`);
