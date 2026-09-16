import fs from 'node:fs/promises';

const FEED='https://reliefweb.int/updates/rss.xml';
const out='data/rss.json';
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const tag=(block,name)=>{const m=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return decode(m?.[1]||'');};

let items=[];
let mode='rss';
let warning='';
try{
  const res=await fetch(FEED,{headers:{
    'user-agent':'Mozilla/5.0 (compatible; ARAC Humanitarian Situation Monitor; +https://arac-international.org)',
    'accept':'application/rss+xml, application/xml, text/xml, */*;q=0.8',
    'referer':'https://reliefweb.int/updates'
  }});
  if(!res.ok) throw new Error(`RSS ${res.status}`);
  const xml=await res.text();
  items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,60).map(m=>({title:tag(m[1],'title'),url:tag(m[1],'link'),pubDate:tag(m[1],'pubDate'),guid:tag(m[1],'guid')})).filter(x=>x.title&&x.url);
  if(!items.length) throw new Error('RSS returned no parseable items');
}catch(err){
  mode='snapshot-fallback';
  warning=String(err?.message||err);
  const snapshot=JSON.parse(await fs.readFile('data/snapshot.json','utf8'));
  items=(snapshot.reports||[]).slice(0,60).map(r=>({
    title:r.title,
    url:r.url_alias||r.url||r.href||'',
    pubDate:r.dateOriginal||r.date?.original||'',
    guid:String(r.id||r.url_alias||r.url||r.title||'')
  })).filter(x=>x.title&&x.url);
}

await fs.writeFile(out,JSON.stringify({source:FEED,generatedAt:new Date().toISOString(),mode,warning,items},null,2)+'\n');
console.log(`cached ${items.length} ReliefWeb ticker items (${mode})${warning?`: ${warning}`:''}`);
