// ─── 1. DOM Ready ────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('parseBtn').onclick = () => {
    const raw = document.getElementById('rawData').value.trim();
    if (!raw) return alert('Paste your data first.');
    const data = parseLines(raw);
    if (!data.length) return alert('No valid records found.');
    renderHeatmap(data);
  };
});

// ─── 2. Parse the raw lines into {receiver, index, potVal} records ──────────
function parseLines(text) {
  const recs = [];
  text.split(/\r?\n/).forEach(line => {
    // find all four receivers in one pass
    for (let r = 1; r <= 4; r++) {
      // e.g. “Receiver 2: 11179, 11312… – PotVals: 22, 19…”
      const re = new RegExp(
        `Receiver\\s*${r}\\s*:\\s*([\\d,\\s]+?)\\s*-\\s*PotVals\\s*:\\s*([\\d,\\s]+)`
      );
      const m = re.exec(line);
      if (!m) continue;
      const zs = m[1].split(',').map(s => +s.trim());   // you can ignore the actual readings if you want
      const ps = m[2].split(',').map(s => +s.trim());
      ps.forEach((pv, i) => {
        recs.push({ receiver: r, index: i, potVal: pv });
      });
    }
  });
  return recs;
}

// ─── 3. Render a simple heatmap ───────────────────────────────────────────────
function renderHeatmap(data) {
  // ensure D3 is available
  if (typeof d3 === 'undefined') {
    console.error('d3.js is required for the heatmap');
    return;
  }

  // prepare container
  let container = document.getElementById('heatmap');
  if (!container) {
    container = document.createElement('div');
    container.id = 'heatmap';
    container.style.position = 'absolute';
    container.style.top      = '220px';
    container.style.left     = '10px';
    container.style.zIndex   = 10;
    document.body.appendChild(container);
  }
  container.innerHTML = '';

  // group and sort by receiver
  const byReceiver = d3.group(data, d => d.receiver);
  const potValues  = data.map(d => d.potVal);
  const colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                       .domain([d3.min(potValues), d3.max(potValues)]);

  // for each receiver, make a row of 9 squares
  Array.from(byReceiver.keys()).sort((a,b)=>a-b).forEach(r => {
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.alignItems = 'center';
    row.style.margin = '4px 0';

    // label
    const label = document.createElement('div');
    label.textContent = `Receiver ${r}:`;
    label.style.width = '80px';
    label.style.fontWeight = 'bold';
    label.style.marginRight = '8px';
    row.appendChild(label);

    // cells
    byReceiver.get(r)
      .sort((a,b)=>a.index-b.index)
      .forEach(d => {
        const cell = document.createElement('div');
        cell.textContent = d.potVal;
        cell.style.width  = '30px';
        cell.style.height = '30px';
        cell.style.lineHeight = '30px';
        cell.style.textAlign = 'center';
        cell.style.margin = '0 2px';
        cell.style.background = colorScale(d.potVal);
        cell.style.color = d.potVal > (d3.max(potValues)/2) ? '#000' : '#333';
        cell.style.borderRadius = '4px';
        row.appendChild(cell);
      });

    container.appendChild(row);
  });
}
