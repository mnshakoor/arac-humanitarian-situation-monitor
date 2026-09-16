import fs from 'node:fs/promises';

const FEED='https://reliefweb.int/updates/rss.xml';
const out='data/rss.json';
const xml=await fetch(FEED,{headers:{'user-agent':'ARAC-Humanitarian-Situation-Monitor/0.5 (+https://arac-international.org)'}}).then(async r=>{if(!r.ok)throw new Error(`RSS ${r.status}`);return r.text();});
const decode=s=>String(s||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const tag=(block,name)=>{const m=block.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`,'i'));return decode(m?.[1]||'');};
const items=[...xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)].slice(0,60).map(m=>({title:tag(m[1],'title'),url:tag(m[1],'link'),pubDate:tag(m[1],'pubDate'),guid:tag(m[1],'guid')})).filter(x=>x.title&&x.url);
await fs.writeFile(out,JSON.stringify({source:FEED,generatedAt:new Date().toISOString(),items},null,2)+'\n');
console.log(`cached ${items.length} ReliefWeb RSS items`);
