import fs from 'node:fs/promises';
import path from 'node:path';

const appname=process.env.RELIEFWEB_APPNAME;
if(!appname) throw new Error('RELIEFWEB_APPNAME is required.');

const base='https://api.reliefweb.int/v2';
const snapshotPath='data/snapshot.json';
const outDir='assets/report-thumbs';
const MAX_REPORTS=120;
const QUERY_BATCH=40;
const DOWNLOAD_BATCH=6;

const snapshot=JSON.parse(await fs.readFile(snapshotPath,'utf8'));
await fs.mkdir(outDir,{recursive:true});

const reportRefs=[];
const seen=new Set();
for(const r of snapshot.reports||[]){
  const id=String(r?.id||'');
  if(id&&!seen.has(id)){seen.add(id);reportRefs.push(r);}
}
for(const c of snapshot.countries||[]){
  for(const r of c.recentReports||[]){
    const id=String(r?.id||'');
    if(id&&!seen.has(id)){seen.add(id);reportRefs.push(r);}
  }
}

const existingExts=['jpg','jpeg','png','webp','gif'];
async function existingLocal(id){
  for(const ext of existingExts){
    const rel=`./assets/report-thumbs/rw-${id}.${ext}`;
    try{await fs.access(rel.slice(2));return rel;}catch{}
  }
  return '';
}

const pending=[];
for(const r of reportRefs){
  const id=String(r.id||'');
  if(!id)continue;
  const existing=await existingLocal(id);
  if(existing){r.localThumbnail=existing;continue;}
  if(pending.length<MAX_REPORTS)pending.push(r);
}

function absoluteUrl(value){
  const v=String(value||'').trim();
  if(!v)return'';
  if(/^https?:\/\//i.test(v))return v;
  if(v.startsWith('//'))return`https:${v}`;
  if(v.startsWith('/'))return`https://reliefweb.int${v}`;
  return'';
}
function arr(v){return Array.isArray(v)?v:(v?[v]:[]);}
function mediaCandidates(fields={}){
  const out=[];
  for(const file of arr(fields.file)){
    for(const preview of arr(file?.preview)){
      out.push(preview?.['url-thumb'],preview?.['url-small'],preview?.['url-large'],preview?.url);
    }
  }
  for(const image of arr(fields.image)){
    out.push(image?.['url-thumb'],image?.['url-small'],image?.['url-large'],image?.url);
  }
  for(const headline of arr(fields.headline)){
    for(const image of arr(headline?.image))out.push(image?.url);
  }
  return [...new Set(out.map(absoluteUrl).filter(Boolean))];
}

async function postReports(ids){
  const body={
    limit:ids.length,
    filter:{field:'id',value:ids.map(Number),operator:'OR'},
    fields:{include:['title','image','image.url','image.url-large','image.url-small','image.url-thumb','image.copyright','file','file.id','file.preview','file.preview.url','file.preview.url-large','file.preview.url-small','file.preview.url-thumb','headline.image','headline.image.url']}
  };
  const res=await fetch(`${base}/reports?appname=${encodeURIComponent(appname)}`,{
    method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)
  });
  if(!res.ok)throw new Error(`ReliefWeb media query failed: ${res.status} ${await res.text()}`);
  return res.json();
}

const mediaById=new Map();
for(let i=0;i<pending.length;i+=QUERY_BATCH){
  const batch=pending.slice(i,i+QUERY_BATCH);
  try{
    const response=await postReports(batch.map(r=>r.id));
    for(const item of response.data||[])mediaById.set(String(item.id),mediaCandidates(item.fields||{}));
  }catch(error){console.warn(error.message);}
}

function extFromType(type=''){
  const t=type.toLowerCase();
  if(t.includes('png'))return'png';
  if(t.includes('webp'))return'webp';
  if(t.includes('gif'))return'gif';
  if(t.includes('jpeg')||t.includes('jpg'))return'jpg';
  return'';
}
async function downloadOne(report){
  const id=String(report.id||'');
  const candidates=mediaById.get(id)||[];
  for(const url of candidates){
    try{
      const res=await fetch(url,{headers:{accept:'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8','user-agent':'ARAC-Humanitarian-Situation-Monitor/0.2 (+https://github.com/mnshakoor/arac-humanitarian-situation-monitor)'},redirect:'follow',signal:AbortSignal.timeout(12000)});
      if(!res.ok)continue;
      const type=res.headers.get('content-type')||'';
      if(!type.toLowerCase().startsWith('image/'))continue;
      const buffer=Buffer.from(await res.arrayBuffer());
      if(buffer.length<200||buffer.length>2500000)continue;
      const ext=extFromType(type);if(!ext)continue;
      const filename=`rw-${id}.${ext}`;
      await fs.writeFile(path.join(outDir,filename),buffer);
      report.localThumbnail=`./assets/report-thumbs/${filename}`;
      report.thumbnailSourceUrl=url;
      return true;
    }catch{}
  }
  delete report.localThumbnail;
  return false;
}

let cached=0;
for(let i=0;i<pending.length;i+=DOWNLOAD_BATCH){
  const results=await Promise.all(pending.slice(i,i+DOWNLOAD_BATCH).map(downloadOne));
  cached+=results.filter(Boolean).length;
}

snapshot.provenance={...(snapshot.provenance||{}),reportThumbnailStrategy:'ReliefWeb preview metadata cached into GitHub Pages assets; browser hotlinking is not required.',reportThumbnailCacheAt:new Date().toISOString()};
await fs.writeFile(snapshotPath,JSON.stringify(snapshot,null,2));
console.log(`Thumbnail cache: ${cached} new local previews, ${reportRefs.length} reports inspected.`);
