import fs from 'node:fs/promises';

const appname = process.env.RELIEFWEB_APPNAME;
if (!appname) throw new Error('RELIEFWEB_APPNAME is required. Add it as a GitHub Actions repository secret.');
const base = 'https://api.reliefweb.int/v2';

async function post(endpoint, body) {
  const res = await fetch(`${base}/${endpoint}?appname=${encodeURIComponent(appname)}`, {
    method:'POST',
    headers:{'content-type':'application/json','accept':'application/json'},
    body:JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${endpoint} request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const now = new Date();
const reliefWebIso = d => d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
const daysAgo = n => new Date(now.getTime() - n * 86400000);

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

const reportFields=['title','date.original','primary_country','country','source','theme','format','disaster','disaster_type','language','url','url_alias'];
const published={field:'status',value:'published'};
const date30={field:'date.original',value:{from:reliefWebIso(daysAgo(30)),to:reliefWebIso(now)}};

const aggregateBody={limit:0,filter:{operator:'AND',conditions:[published,date30]},facets:[
  {name:'countries',field:'primary_country.iso3',limit:200,sort:'count:desc'},
  {name:'themes',field:'theme.name',limit:60,sort:'count:desc'},
  {name:'sources',field:'source.shortname',limit:150,sort:'count:desc'},
  {name:'formats',field:'format.name',limit:60,sort:'count:desc'},
  {name:'timeline',field:'date.original',interval:'day'}
]};
const latestBody={limit:50,sort:['date.original:desc'],filter:{operator:'AND',conditions:[published,date30]},fields:{include:reportFields}};
const current7Body={limit:0,filter:{operator:'AND',conditions:[published,{field:'date.original',value:{from:reliefWebIso(daysAgo(7)),to:reliefWebIso(now)}}]},facets:[{name:'countries',field:'primary_country.iso3',limit:200,sort:'count:desc'}]};
const previous7Body={limit:0,filter:{operator:'AND',conditions:[published,{field:'date.original',value:{from:reliefWebIso(daysAgo(14)),to:reliefWebIso(daysAgo(7))}}]},facets:[{name:'countries',field:'primary_country.iso3',limit:200,sort:'count:desc'}]};
const disasterBody={limit:150,filter:{field:'status',value:['ongoing','alert'],operator:'OR'},fields:{include:['name','date.event','status','glide','country','primary_country','primary_type','type','url']}};

const [aggregate,latest,current7,previous7,disasters]=await Promise.all([
  post('reports',aggregateBody),post('reports',latestBody),post('reports',current7Body),post('reports',previous7Body),post('disasters',disasterBody)
]);

function normalizeReport(item) {
  const f=item.fields || {}, pc=f.primary_country || {};
  return {id:item.id,title:f.title,dateOriginal:f.date?.original||f['date.original'],primaryCountry:pc?.name||pc?.[0]?.name||'',primaryCountryIso3:String(pc?.iso3||pc?.[0]?.iso3||'').toLowerCase(),primaryCountryLocation:pc?.location||pc?.[0]?.location||null,source:(f.source||[]).map(s=>s.shortname||s.name).join(', '),format:(f.format||[]).map(x=>x.name).join(', '),themes:(f.theme||[]).map(x=>x.name),disasterTypes:(f.disaster_type||[]).map(x=>x.name),url:f.url_alias||f.url||item.href};
}
const reports=(latest.data||[]).map(normalizeReport);
const normalizedDisasters=(disasters.data||[]).map(d=>{const f=d.fields||{};return {id:d.id,name:f.name,status:f.status,glide:f.glide,dateEvent:f.date?.event,url:f.url||d.href,primaryCountry:f.primary_country?.name||'',primaryCountryIso3:String(f.primary_country?.iso3||'').toLowerCase(),location:f.primary_country?.location||null,primaryType:f.primary_type?.name||'',types:(f.type||[]).map(x=>x.name)};});

const nameMap=new Map(), locationMap=new Map();
for (const r of reports) { if (r.primaryCountryIso3&&r.primaryCountry) nameMap.set(r.primaryCountryIso3,r.primaryCountry); if (r.primaryCountryIso3&&r.primaryCountryLocation) locationMap.set(r.primaryCountryIso3,r.primaryCountryLocation); }
for (const d of normalizedDisasters) { if (d.primaryCountryIso3&&d.primaryCountry) nameMap.set(d.primaryCountryIso3,d.primaryCountry); if (d.primaryCountryIso3&&d.location) locationMap.set(d.primaryCountryIso3,d.location); }

const m7=countByValue(facetMap(current7,'countries')), mp7=countByValue(facetMap(previous7,'countries'));
const countries=facetMap(aggregate,'countries').map(x=>{
  const iso3=String(facetValue(x)).toLowerCase();
  const reports30d=facetCount(x), reports7d=m7.get(iso3)||0, previous7d=mp7.get(iso3)||0;
  const change7d=previous7d>0?((reports7d-previous7d)/previous7d)*100:null;
  const recentReports=reports.filter(r=>r.primaryCountryIso3===iso3);
  return {name:nameMap.get(iso3)||iso3.toUpperCase(),shortname:nameMap.get(iso3)||iso3.toUpperCase(),iso3,location:locationMap.get(iso3)||null,overview:'',countryUrl:'',reports30d,reports7d,previous7d,change7d,uniqueSources:0,themeBreadth:0,formatBreadth:0,topThemes:[],topSources:[],topFormats:[],disasterTypes:[],timeline:[],recentReports,enrichmentStatus:'pending-daily'};
});

const snapshot={
  schema:'arac.ahsm.snapshot.v2',generatedAt:now.toISOString(),status:'RELIEFWEB LIVE SNAPSHOT',stale:false,
  summary:{reports30d:aggregate.totalCount??aggregate.total_count??0,countries:countries.length,uniqueSources:facetMap(aggregate,'sources').length,activeDisasters:disasters.totalCount??disasters.total_count??normalizedDisasters.length,profiledCountries:0,profileTargets:16},
  timeline:facetMap(aggregate,'timeline').map(x=>({date:facetValue(x),count:facetCount(x)})),
  globalThemes:normalizeFacet(facetMap(aggregate,'themes')),globalSources:normalizeFacet(facetMap(aggregate,'sources')),globalFormats:normalizeFacet(facetMap(aggregate,'formats')),
  countries,reports,disasters:normalizedDisasters,
  provenance:{provider:'ReliefWeb API V2',appname,queryGeneratedAt:now.toISOString(),dateBasis:'date.original',status:'published',countryCounting:'primary_country.iso3',aggregateStrategy:'Hourly core snapshot; country enrichment runs separately',coordinateSource:'Embedded ReliefWeb primary_country.location where available',countryNameSource:'Embedded ReliefWeb primary_country names; ISO3 fallback where unavailable',analyticalBoundary:'Reporting intensity and momentum are information-environment signals, not humanitarian severity measures.'}
};

await fs.mkdir('data',{recursive:true});
const target='data/snapshot.json',tmp='data/snapshot.next.json';
await fs.writeFile(tmp,JSON.stringify(snapshot,null,2));
await fs.rename(tmp,target);
console.log(`Wrote ${target}: ${snapshot.summary.reports30d} reports, ${snapshot.summary.countries} countries, ${snapshot.summary.activeDisasters} active/alert disasters.`);
