const q=(s,r=document)=>r.querySelector(s);

function arrangeNetworkExplorer(){
  const view=q('#view-network');
  if(!view)return false;
  const shell=q('.network-shell',view);
  const ticker=q('.ticker',view);
  const temporal=q('#temporal-intelligence',view);
  const evidence=q('#temporal-investigation',view);
  const pinboard=q('.investigation-tray',view);
  if(!shell||!ticker||!temporal)return false;

  // Analyst workflow: filters/structural controls -> current network -> ticker -> temporal change -> evidence -> pinboard.
  if(ticker.previousElementSibling!==shell) shell.insertAdjacentElement('afterend',ticker);
  if(temporal.previousElementSibling!==ticker) ticker.insertAdjacentElement('afterend',temporal);
  if(evidence&&evidence.previousElementSibling!==temporal) temporal.insertAdjacentElement('afterend',evidence);
  const anchor=evidence||temporal;
  if(pinboard&&pinboard.previousElementSibling!==anchor) anchor.insertAdjacentElement('afterend',pinboard);

  view.dataset.workflowLayout='v083';
  return true;
}

function bootLayout(){
  if(arrangeNetworkExplorer())return;
  let attempts=0;
  const observer=new MutationObserver(()=>{
    attempts++;
    if(arrangeNetworkExplorer()||attempts>40)observer.disconnect();
  });
  observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>observer.disconnect(),8000);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootLayout,{once:true});else bootLayout();
