const CACHE='ahsm-shell-v08-r2';
const SHELL=['./','./index.html','./css/app.css','./css/ui-patch.css','./css/v04.css','./css/v05.css','./css/v06.css','./css/v07.css','./css/v08.css','./js/app.js','./js/ui-patch.js','./js/v03.js','./js/v04.js','./js/v05.js','./js/v06.js','./js/v07.js','./js/v07-style.js','./js/v08.js','./js/v08-style.js','./js/region-map.js','./js/config.js','./js/signals.js','./js/storage.js','./js/export.js','./js/charts.js','./manifest.webmanifest'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k.startsWith('ahsm-')&&k!==CACHE).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
      .then(()=>self.clients.matchAll({type:'window',includeUncontrolled:true}))
      .then(clients=>clients.forEach(client=>client.postMessage({type:'AHSM_BUILD_READY',cache:CACHE})))
  );
});

function isCritical(url,req){
  if(req.mode==='navigate')return true;
  if(url.pathname.endsWith('/data/snapshot.json')||url.pathname.endsWith('data/snapshot.json'))return true;
  return /\.(?:html|js|css|webmanifest)$/.test(url.pathname);
}

async function networkFirst(req){
  const cache=await caches.open(CACHE);
  try{
    const fresh=await fetch(new Request(req,{cache:'no-store'}));
    if(fresh&&fresh.ok)await cache.put(req,fresh.clone());
    return fresh;
  }catch(error){
    const cached=await caches.match(req);
    if(cached)return cached;
    if(req.mode==='navigate'){
      const shell=await caches.match('./index.html');
      if(shell)return shell;
    }
    throw error;
  }
}

async function cacheFirst(req){
  const cached=await caches.match(req);
  if(cached)return cached;
  const fresh=await fetch(req);
  if(fresh&&fresh.ok){const cache=await caches.open(CACHE);await cache.put(req,fresh.clone());}
  return fresh;
}

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  event.respondWith(isCritical(url,req)?networkFirst(req):cacheFirst(req));
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
  if(event.data?.type==='AHSM_VERSION_QUERY')event.source?.postMessage({type:'AHSM_VERSION',cache:CACHE});
});
