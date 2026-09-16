import fs from 'node:fs/promises';

const appname = process.env.RELIEFWEB_APPNAME;
if (!appname) throw new Error('RELIEFWEB_APPNAME is required. Add it as a GitHub Actions repository secret.');
const base = 'https://api.reliefweb.int/v2';
const PROFILE_LIMIT = 20;

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

function facetRoot(obj) {
  return obj?.embedded?.facets || obj?._embedded?.facets || obj?.facets || {};
}
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
const globalBody={
  limit:50,
  sort:['date.original:desc'],
  filter:{operator:'AND',conditions:[
    {field:'status',value:'published'},
    {field:'date.original',value:{from:reliefWebIso(daysAgo(30)),to:reliefWebIso(now)}}
  ]},
  fields:{include:reportFields},
  facets:[
    {name:'countries',field:'primary_country.iso3',limit:250,sort:'count:desc'},
    {name:'themes',field:'theme.name',limit:100,sort:'count:desc'},
    {name:'sources',field:'source.shortname',limit:250,sort:'count:desc'},
    {name:'formats',field:'format.name',limit:100,sort:'count:desc'},
    {name:'timeline',field:'date.original',interval:'day'}
  ]
};
const current7Body={...globalBody,limit:0,filter:{operator:'AND',conditions:[{field:'status',value:'published'},{field:'date.original',value:{from:reliefWebIso(daysAgo(7)),to:reliefWebIso(now)}}]},facets:[{name:'countries',field:'primary_country.iso3',limit:250,sort:'count:desc'}]};
const previous7Body={...globalBody,limit:0,filter:{operator:'AND',conditions:[{field:'status',value:'published'},{field:'date.original',value:{from:reliefWebIso(daysAgo(14)),to:reliefWebIso(daysAgo(7))}}]},facets:[{name:'countries',field:'primary_country.iso3',limit:250,sort:'count:desc'}]};
const disasterBody={limit:150,filter:{field:'status',value:['ongoing','alert'],operator:'OR'},fields:{include:['name','date.event','status','glide','country','primary_country','primary_type','type','url']}};

const [global,current7,previous7,disasters,catalogResponse]=await Promise.all([
  post('reports',globalBody),post('reports',current7Body),post('reports',previous7Body),post('disasters',disasterBody),post('countries',{limit:300})
]);

const countryCatalog=new Map();
for (const item of catalogResponse.data || []) {
  const f=item.fields || {};
  if (!f.iso3) continue;
  countryCatalog.set(String(f.iso3).toLowerCase(),{
    id:item.id,
    name:f.name || f.shortname || String(f.iso3).toUpperCase(),
    shortname:f.shortname || f.name,
    iso3:String(f.iso3).toLowerCase(),
    overview:f.profile?.overview || '',
    url:f.url || item.href || ''
  });
}

function normalizeReport(item) {
  const f=item.fields || {};
  const pc=f.primary_country || {};
  return {
    id:item.id,title:f.title,dateOriginal:f.date?.original || f['date.original'],
    primaryCountry:pc?.name || pc?.[0]?.name || '',
    primaryCountryIso3:String(pc?.iso3 || pc?.[0]?.iso3 || '').toLowerCase(),
    primaryCountryLocation:pc?.location || pc?.[0]?.location || null,
    source:(f.source||[]).map(s=>s.shortname||s.name).join(', '),
    format:(f.format||[]).map(x=>x.name).join(', '),
    themes:(f.theme||[]).map(x=>x.name),
    disasterTypes:(f.disaster_type||[]).map(x=>x.name),
    url:f.url_alias || f.url || item.href
  };
}
const reports=(global.data||[]).map(normalizeReport);

const normalizedDisasters=(disasters.data||[]).map(d=>{
  const f=d.fields||{};
  return {id:d.id,name:f.name,status:f.status,glide:f.glide,dateEvent:f.date?.event,url:f.url||d.href,primaryCountry:f.primary_country?.name||'',primaryCountryIso3:String(f.primary_country?.iso3||'').toLowerCase(),location:f.primary_country?.location||null,primaryType:f.primary_type?.name||'',types:(f.type||[]).map(x=>x.name)};
});

const locationMap=new Map();
for (const r of reports) if (r.primaryCountryIso3 && r.primaryCountryLocation) locationMap.set(r.primaryCountryIso3,r.primaryCountryLocation);
for (const d of normalizedDisasters) if (d.primaryCountryIso3 && d.location) locationMap.set(d.primaryCountryIso3,d.location);

const c30=facetMap(global,'countries');
const m7=countByValue(facetMap(current7,'countries'));
const mp7=countByValue(facetMap(previous7,'countries'));
const countries=c30.map(x=>{
  const iso3=String(facetValue(x)).toLowerCase();
  const meta=countryCatalog.get(iso3)||{};
  const reports30d=facetCount(x),reports7d=m7.get(iso3)||0,previous7d=mp7.get(iso3)||0;
  const change7d=previous7d>0?((reports7d-previous7d)/previous7d)*100:null;
  return {name:meta.name||iso3.toUpperCase(),shortname:meta.shortname||meta.name||iso3.toUpperCase(),iso3,location:locationMap.get(iso3)||null,overview:meta.overview||'',countryUrl:meta.url||'',reports30d,reports7d,previous7d,change7d,uniqueSources:0,themeBreadth:0,formatBreadth:0,topThemes:[],topSources:[],topFormats:[],disasterTypes:[],timeline:[],recentReports:[]};
});

const profileTargets=countries.slice(0,PROFILE_LIMIT);
const profileResponses=await Promise.all(profileTargets.map(c=>post('reports',{
  limit:12,sort:['date.original:desc'],
  filter:{operator:'AND',conditions:[{field:'status',value:'published'},{field:'primary_country.iso3',value:c.iso3},{field:'date.original',value:{from:reliefWebIso(daysAgo(30)),to:reliefWebIso(now)}}]},
  fields:{include:reportFields},
  facets:[
    {name:'themes',field:'theme.name',limit:20,sort:'count:desc'},
    {name:'sources',field:'source.shortname',limit:30,sort:'count:desc'},
    {name:'formats',field:'format.name',limit:20,sort:'count:desc'},
    {name:'disasterTypes',field:'disaster_type.name',limit:20,sort:'count:desc'},
    {name:'timeline',field:'date.original',interval:'day'}
  ]
})));
profileResponses.forEach((response,i)=>{
  const c=profileTargets[i];
  c.topThemes=normalizeFacet(facetMap(response,'themes'));
  c.topSources=normalizeFacet(facetMap(response,'sources'));
  c.topFormats=normalizeFacet(facetMap(response,'formats'));
  c.disasterTypes=normalizeFacet(facetMap(response,'disasterTypes'));
  c.timeline=facetMap(response,'timeline').map(x=>({date:facetValue(x),count:facetCount(x)}));
  c.uniqueSources=c.topSources.length;
  c.themeBreadth=c.topThemes.length;
  c.formatBreadth=c.topFormats.length;
  c.recentReports=(response.data||[]).map(normalizeReport);
  if (!c.location) {
    const withLocation=c.recentReports.find(r=>r.primaryCountryLocation)?.primaryCountryLocation;
    if (withLocation) c.location=withLocation;
  }
});

const snapshot={
  schema:'arac.ahsm.snapshot.v2',generatedAt:now.toISOString(),status:'RELIEFWEB LIVE SNAPSHOT',stale:false,
  summary:{reports30d:global.totalCount??global.total_count??reports.length,countries:countries.length,uniqueSources:facetMap(global,'sources').length,activeDisasters:disasters.totalCount??disasters.total_count??normalizedDisasters.length,profiledCountries:profileTargets.length},
  timeline:facetMap(global,'timeline').map(x=>({date:facetValue(x),count:facetCount(x)})),
  globalThemes:normalizeFacet(facetMap(global,'themes')),globalSources:normalizeFacet(facetMap(global,'sources')),globalFormats:normalizeFacet(facetMap(global,'formats')),
  countries,reports,disasters:normalizedDisasters,
  provenance:{provider:'ReliefWeb API V2',appname,queryGeneratedAt:now.toISOString(),dateBasis:'date.original',status:'published',countryCounting:'primary_country.iso3',countryProfileLimit:PROFILE_LIMIT,coordinateSource:'Embedded ReliefWeb primary_country.location where available',analyticalBoundary:'Reporting intensity and momentum are information-environment signals, not humanitarian severity measures.'}
};

await fs.mkdir('data',{recursive:true});
const target='data/snapshot.json',tmp='data/snapshot.next.json';
await fs.writeFile(tmp,JSON.stringify(snapshot,null,2));
await fs.rename(tmp,target);
console.log(`Wrote ${target}: ${snapshot.summary.reports30d} reports, ${snapshot.summary.countries} countries, ${snapshot.summary.profiledCountries} enriched country profiles, ${snapshot.summary.activeDisasters} active/alert disasters.`);
