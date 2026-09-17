const RC11={timer:null};
const q=(s,r=document)=>r.querySelector(s);

function injectRc11Styles(){
  if(q('#ahsm-rc11-style'))return;
  const style=document.createElement('style');
  style.id='ahsm-rc11-style';
  style.textContent=`
    #network-analysis-flow>#network-secondary-analysis{order:2;margin-top:14px}
    #network-analysis-flow>.ticker{order:3}
    #network-analysis-flow>#temporal-intelligence{order:4}
    #network-analysis-flow>#temporal-investigation{order:5}
    #network-analysis-flow>.investigation-tray{order:6}
    #network-secondary-analysis{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.35fr);gap:14px;align-items:start}
    #network-secondary-analysis .network-secondary-card{min-width:0;border:1px solid var(--line);border-radius:12px;background:var(--panel);overflow:hidden}
    #network-secondary-analysis .network-secondary-card>header{display:flex;align-items:end;justify-content:space-between;gap:12px;padding:14px 14px 0}
    #network-secondary-analysis .network-secondary-card>header h3{margin:2px 0 0}
    #network-secondary-analysis .network-secondary-card .wordcloud{min-height:180px;padding:16px}
    #network-secondary-analysis .network-intelligence-panel{margin:0;border:0;background:transparent;border-radius:0;max-height:none!important;overflow:visible!important}
    #view-network .network-column.analysis{max-height:none!important;overflow:visible!important}
    #view-network .network-shell{align-items:start}
    #view-network .network-stage{min-height:0}
    @media(max-width:1180px){#network-secondary-analysis{grid-template-columns:1fr}}
    @media(max-width:820px){
      #network-analysis-flow>#network-secondary-analysis{order:2}
      #network-analysis-flow>#temporal-intelligence{order:3}
      #network-analysis-flow>#temporal-investigation{order:4}
      #network-analysis-flow>.investigation-tray{order:5}
      #network-analysis-flow>.ticker{order:6}
      #network-secondary-analysis{margin-top:12px}
    }
  `;
  document.head.append(style);
}

function arrangeSecondaryAnalysis(){
  const view=q('#view-network');
  const flow=q('#network-analysis-flow',view);
  const shell=q('.network-shell',view);
  const analysis=q('.network-column.analysis',shell);
  const intel=q('.network-intelligence-panel',view);
  const cloud=q('#network-wordcloud',view);
  if(!view||!flow||!shell||!analysis||!intel||!cloud)return false;
  if(q('#network-secondary-analysis',view))return true;

  const topicHeading=cloud.previousElementSibling?.tagName==='H3'?cloud.previousElementSibling:null;
  const band=document.createElement('section');
  band.id='network-secondary-analysis';
  band.setAttribute('aria-label','Network interpretation and intelligence');

  const topics=document.createElement('section');
  topics.className='network-secondary-card';
  const topicHeader=document.createElement('header');
  topicHeader.innerHTML='<div><span class="eyebrow">TOPIC SIGNALS</span><h3>Topics & keywords</h3></div><span class="muted">filtered corpus</span>';
  topics.append(topicHeader,cloud);
  topicHeading?.remove();

  const intelligence=document.createElement('section');
  intelligence.className='network-secondary-card';
  const intelHeader=document.createElement('header');
  intelHeader.innerHTML='<div><span class="eyebrow">NETWORK INTERPRETATION</span><h3>Centrality, communities & selected-node metrics</h3></div><span class="muted">current graph</span>';
  intelligence.append(intelHeader,intel);

  band.append(topics,intelligence);
  shell.insertAdjacentElement('afterend',band);
  view.dataset.rc11Layout='secondary-analysis-band';
  return true;
}

function bootRc11(){
  injectRc11Styles();
  let attempts=0;
  RC11.timer=setInterval(()=>{
    attempts++;
    if(arrangeSecondaryAnalysis()||attempts>=80){clearInterval(RC11.timer);RC11.timer=null;}
  },100);
  setTimeout(()=>{if(RC11.timer){clearInterval(RC11.timer);RC11.timer=null;}},9000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootRc11,{once:true});else bootRc11();
