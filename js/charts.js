export function drawLineChart(canvas, series = []) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 700, height = canvas.clientHeight || 250;
  canvas.width = width*dpr; canvas.height = height*dpr; ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,width,height);
  if (!series.length) return;
  const max = Math.max(...series.map(d => d.count), 1);
  const pad = 28;
  ctx.strokeStyle = '#d7a84b'; ctx.lineWidth = 2;
  ctx.beginPath();
  series.forEach((d,i) => {
    const x = pad + (i/Math.max(1, series.length-1))*(width-pad*2);
    const y = height-pad - (d.count/max)*(height-pad*2);
    i ? ctx.lineTo(x,y) : ctx.moveTo(x,y);
  });
  ctx.stroke();
  ctx.fillStyle = '#9ca9bb'; ctx.font = '12px system-ui';
  ctx.fillText('0', 4, height-pad+4); ctx.fillText(String(max), 4, pad+4);
}
