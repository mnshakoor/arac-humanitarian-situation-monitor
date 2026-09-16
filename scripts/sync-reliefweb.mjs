import fs from 'node:fs/promises';

const appname = process.env.RELIEFWEB_APPNAME;
if (!appname) throw new Error('RELIEFWEB_APPNAME is required. Add it as a GitHub Actions repository secret.');
const base = `https://api.reliefweb.int/v2`;

async function post(endpoint, body) {
  const res = await fetch(`${base}/${endpoint}?appname=${encodeURIComponent(appname)}`, {
    method: 'POST', headers: {'content-type':'application/json','accept':'application/json'}, body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error(`${endpoint} request failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const now = new Date();
const reliefWebIso = d => d.toISOString().replace(/\.\d{3}Z$/, '+00:00');
const daysAgo = n => new Date(now.getTime()-n*86400000);

function facetMap(obj, name) {
  const f = obj?.facets?.[name] || obj?.facets?.find?.(x => x.name === name);
  const data = f?.data || f || [];
  return Array.isArray(data) ? data : [];
}

const globalBody = {
  limit: 50,
  sort: ['date.original:desc'],
  filter: {operator:'AND',conditions:[
    {field:'status',value:'published'},
    {field:'date.original',value:{from:reliefWebIso(daysAgo(30)),to:reliefWebIso(now)}}
  ]},
  fields: {include:['title','date.original','primary_country','country','source','theme','format','disaster','disaster_type','language','url','url_alias']},
  facets: [
    {name:'countries',field:'primary_country.iso3',limit:250,sort:'count:desc'},
    {name:'themes',field:'theme.name',limit:100,sort:'count:desc'},
    {name:'sources',field:'source.shortname',limit:250,sort:'count:desc'},
    {name:'formats',field:'format.name',limit:100,sort:'count:desc'},
    {name:'timeline',field:'date.original',interval:'day'}
  ]
};

const current7Body = {...globalBody, limit:0, filter:{operator:'AND',conditions:[{field:'status',value:'published'},{field:'date.original',value:{from:reliefWebIso(daysAgo(7)),to:reliefWebIso(now)}}]}, facets:[{name:'countries',field:'primary_country.iso3',limit:250,sort:'count:desc'}]};
const previous7Body = {...globalBody, limit:0, filter:{operator:'AND',conditions:[{field:'status',value:'published'},{field:'date.original',value:{from:reliefWebIso(daysAgo(14)),to:reliefWebIso(daysAgo(7))}}]}, facets:[{name:'countries',field:'primary_country.iso3',limit:250,sort:'count:desc'}]};

const [global, current7, previous7, disasters] = await Promise.all([
  post('reports', globalBody), post('reports', current7Body), post('reports', previous7Body),
  post('disasters', {limit:100,filter:{field:'status',value:['current','alert'],operator:'OR'},fields:{include:['name','date.event','status','glide','country','primary_country','primary_type','type','url']}})
]);

// ReliefWeb facet response details can evolve. Preserve raw facet blocks for audit/debugging while normalizing what is safely available.
const c30 = facetMap(global,'countries');
const c7 = facetMap(current7,'countries');
const p7 = facetMap(previous7,'countries');
const countByValue = arr => new Map(arr.map(x => [x.value ?? x.name ?? x.term, x.count ?? x.value_count ?? 0]));
const m7 = countByValue(c7), mp7 = countByValue(p7);
const countries = c30.map(x => {
  const iso3 = x.value ?? x.name ?? x.term;
  const reports30d = x.count ?? 0, reports7d = m7.get(iso3)||0, previous7d = mp7.get(iso3)||0;
  const change7d = previous7d > 0 ? ((reports7d-previous7d)/previous7d)*100 : null;
  return {name:iso3,iso3,reports30d,reports7d,previous7d,change7d,uniqueSources:0,themeBreadth:0,topThemes:[],topSources:[]};
});

const reports = (global.data || []).map(item => {
  const f = item.fields || {};
  return {id:item.id,title:f.title,dateOriginal:f.date?.original || f['date.original'],primaryCountry:f.primary_country?.name || f.primary_country?.[0]?.name || '',source:(f.source||[]).map(s=>s.shortname||s.name).join(', '),format:(f.format||[]).map(x=>x.name).join(', '),themes:(f.theme||[]).map(x=>x.name),url:f.url_alias||f.url||item.href};
});

const snapshot = {
  schema:'arac.ahsm.snapshot.v1', generatedAt:now.toISOString(), status:'RELIEFWEB LIVE SNAPSHOT', stale:false,
  summary:{reports30d:global.totalCount ?? global.total_count ?? reports.length,countries:countries.length,uniqueSources:facetMap(global,'sources').length,activeDisasters:disasters.totalCount ?? disasters.total_count ?? (disasters.data||[]).length},
  timeline:facetMap(global,'timeline').map(x=>({date:x.value??x.name??x.term,count:x.count??0})),
  countries, reports,
  disasters:(disasters.data||[]).map(d=>({id:d.id,...(d.fields||{})})),
  rawFacets:global.facets,
  provenance:{provider:'ReliefWeb API V2',appname,queryGeneratedAt:now.toISOString(),dateBasis:'date.original',status:'published',countryCounting:'primary_country.iso3'}
};

await fs.mkdir('data',{recursive:true});
const target='data/snapshot.json', tmp='data/snapshot.next.json';
await fs.writeFile(tmp,JSON.stringify(snapshot,null,2));
await fs.rename(tmp,target);
console.log(`Wrote ${target}: ${snapshot.summary.reports30d} reports, ${snapshot.summary.countries} country facets.`);
