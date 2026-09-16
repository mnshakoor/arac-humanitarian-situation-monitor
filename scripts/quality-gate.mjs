import fs from 'node:fs';

const required=['index.html','manifest.webmanifest','sw.js','css/app.css','css/ui-patch.css','css/v04.css','js/app.js','js/ui-patch.js','js/v03.js','js/v04.js','js/config.js','data/snapshot.json'];
for(const file of required){if(!fs.existsSync(file))throw new Error(`Missing required asset: ${file}`);}
const html=fs.readFileSync('index.html','utf8');
for(const marker of ['id="main-content"','manifest.webmanifest','css/v04.css','aria-label="Primary navigation"'])if(!html.includes(marker))throw new Error(`index.html missing ${marker}`);
const ui=fs.readFileSync('js/ui-patch.js','utf8');
if(!ui.includes("import './v04.js'"))throw new Error('v0.4 layer is not loaded');
const config=fs.readFileSync('js/config.js','utf8');
if(!config.includes("0.4.0-beta"))throw new Error('Build version is not v0.4.0-beta');
const snapshot=JSON.parse(fs.readFileSync('data/snapshot.json','utf8'));
if(!snapshot.generatedAt||!snapshot.summary||!Array.isArray(snapshot.countries)||!Array.isArray(snapshot.reports)||!Array.isArray(snapshot.disasters))throw new Error('Snapshot schema missing required operational fields');
if(!snapshot.provenance?.provider)throw new Error('Snapshot provenance provider missing');
const badCountries=snapshot.countries.filter(c=>!c.iso3||typeof c.reports30d!=='number');
if(badCountries.length)throw new Error(`${badCountries.length} country records failed minimum schema validation`);
console.log(`AHSM quality gate passed: ${snapshot.countries.length} countries, ${snapshot.reports.length} core reports, ${snapshot.disasters.length} disaster contexts.`);
