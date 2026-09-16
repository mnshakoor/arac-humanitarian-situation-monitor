const CACHE='ahsm-shell-v04';
const SHELL=['./','./index.html','./css/app.css','./css/ui-patch.css','./css/v04.css','./js/app.js','./js/ui-patch.js','./js/v03.js','./js/v04.js','./js/config.js','./js/signals.js','./js/storage.js','./js/export.js','./js/charts.js','./manifest.webmanifest'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(url.pathname.endsWith('/data/snapshot.json')||url.pathname.endsWith('data/snapshot.json')){
    event.respondWith(fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res;}).catch(()=>caches.match(req)));
    return;
  }
  event.respondWith(caches.match(req).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});
