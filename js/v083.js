const NETWORK_FLOW_STYLE=`
#network-analysis-flow{display:flex;flex-direction:column;min-width:0}
#network-analysis-flow>.network-shell{order:1}
#network-analysis-flow>.ticker{order:2}
#network-analysis-flow>#temporal-intelligence{order:3;margin-top:14px}
#network-analysis-flow>#temporal-investigation{order:4}
#network-analysis-flow>.investigation-tray{order:5;margin-top:14px}
#view-network .network-shell{margin-top:10px}
@media(max-width:820px){
  #view-network .network-shell{display:grid;grid-template-columns:1fr}
  #view-network .network-shell>.network-column:nth-child(2){order:1}
  #view-network .network-shell>.network-column:nth-child(3){order:2}
  #view-network .network-shell>.network-column:nth-child(1){order:3}
  #network-analysis-flow>#temporal-intelligence{order:2}
  #network-analysis-flow>#temporal-investigation{order:3}
  #network-analysis-flow>.investigation-tray{order:4}
  #network-analysis-flow>.ticker{order:5;margin-top:14px}
}
`;

function injectNetworkFlowStyle(){
  if(document.querySelector('#ahsm-network-flow-style'))return;
  const style=document.createElement('style');
  style.id='ahsm-network-flow-style';
  style.textContent=NETWORK_FLOW_STYLE;
  document.head.append(style);
}

function arrangeNetworkExplorer(){
  const view=document.querySelector('#view-network');
  if(!view)return false;
  const shell=view.querySelector('.network-shell');
  const ticker=view.querySelector('.ticker');
  const temporal=view.querySelector('#temporal-intelligence');
  const evidence=view.querySelector('#temporal-investigation');
  const pinboard=view.querySelector('.investigation-tray');
  if(!shell||!ticker||!temporal||!evidence||!pinboard)return false;

  let flow=view.querySelector('#network-analysis-flow');
  if(!flow){
    flow=document.createElement('div');
    flow.id='network-analysis-flow';
    flow.setAttribute('aria-label','Network investigation workflow');
    shell.parentNode.insertBefore(flow,shell);
  }
  for(const node of [shell,ticker,temporal,evidence,pinboard]){
    if(node.parentNode!==flow)flow.append(node);
  }
  view.dataset.workflowLayout='graph-first';
  return true;
}

function bootNetworkFlow(){
  injectNetworkFlowStyle();
  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(arrangeNetworkExplorer()||attempts>=100)clearInterval(timer);
  },100);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootNetworkFlow,{once:true});else bootNetworkFlow();
