import fs from 'node:fs';

const required=['index.html','manifest.webmanifest','sw.js','css/app.css','css/ui-patch.css','css/v04.css','css/v05.css','css/v06.css','css/v07.css','css/v08.css','js/app.js','js/ui-patch.js','js/v03.js','js/v04.js','js/v05.js','js/v06.js','js/v07.js','js/v07-style.js','js/v08.js','js/v08-style.js','js/region-map.js','js/config.js','data/snapshot.json'];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing required asset: ${file}`);}
const html=fs.readFileSync('index.html','utf8');
for(const marker of ['id="main-content"','manifest.webmanifest','css/v04.css','css/v05.css','css/v06.css','aria-label="Primary navigation"','data-view="network"','id="network-svg"'])if(!html.includes(marker))throw new Error(`index.html missing ${marker}`);
const ui=fs.readFileSync('js/ui-patch.js','utf8');
for(const layer of ["import './v04.js'","import './v05.js'","import './v06.js'","import './v07.js'","import './v08.js'","import './v07-style.js'","import './v08-style.js'","import './region-map.js'"])if(!ui.includes(layer))throw new Error(`UI layer missing ${layer}`);
const config=fs.readFileSync('js/config.js','utf8');
if(!config.includes("0.8.0-beta"))throw new Error('Build version is not v0.8.0-beta');
const v06=fs.readFileSync('js/v06.js','utf8');
for(const marker of ['betweenness','labelCommunities','network-fullscreen','network-pinboard','network-centrality'])if(!v06.includes(marker))throw new Error(`Network intelligence layer missing ${marker}`);
const v07=fs.readFileSync('js/v07.js','utf8');
for(const marker of ['TEMPORAL NETWORK INTELLIGENCE','24h','7d','30d','clusterShift','emerging','disappearing','entityGraph'])if(!v07.includes(marker))throw new Error(`Temporal network layer missing ${marker}`);
const v08=fs.readFileSync('js/v08.js','utf8');
for(const marker of ['app-fullscreen','temporal-investigation','communityLineage','temporal-network.v1','evidence-card','STORAGE_SNAP','STORAGE_WATCH'])if(!v08.includes(marker))throw new Error(`v0.8 investigation layer missing ${marker}`);
const snapshot=JSON.parse(fs.readFileSync('data/snapshot.json','utf8'));
if(!snapshot.generatedAt||!snapshot.summary||!Array.isArray(snapshot.countries)||!Array.isArray(snapshot.reports)||!Array.isArray(snapshot.disasters))throw new Error('Snapshot schema missing required operational fields');
if(!snapshot.provenance?.provider)throw new Error('Snapshot provenance provider missing');
const badCountries=snapshot.countries.filter(c=>!c.iso3||typeof c.reports30d!=='number');
if(badCountries.length)throw new Error(`${badCountries.length} country records failed minimum schema validation`);
console.log(`AHSM v0.8 quality gate passed: ${snapshot.countries.length} countries, ${snapshot.reports.length} core reports, ${snapshot.disasters.length} disaster contexts.`);
