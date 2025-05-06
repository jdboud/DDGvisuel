// ─── Globals ─────────────────────────────────────────────────────────
let formattedData = [], objects = [];
let XY_FACTOR = 0.05, Z_SCALE_FACTOR = 500;
let xCenter, yCenter, colorScale;

// ─── 1. DOM Ready ───────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // seed from sliders
  const xySlider = document.getElementById('xyFactor');
  const zSlider  = document.getElementById('zScaleFactor');
  XY_FACTOR      = +xySlider.value;
  Z_SCALE_FACTOR = +zSlider.value;
  xySlider.addEventListener('input', e => { XY_FACTOR = +e.target.value; renderVisualization(formattedData); });
  zSlider .addEventListener('input', e => { Z_SCALE_FACTOR = +e.target.value; renderVisualization(formattedData); });

  // parse button
  document.getElementById('parseBtn').onclick = () => {
    const raw = document.getElementById('rawData').value.trim();
    if (!raw) return alert('Paste your data first.');
    const data = parseMyLines(raw);
    if (!data.length) return alert('No valid records found.');
    renderVisualization(data);
  };
});

// ─── 2. Text → flat array of 180 {rawReading,potVal} ────────────────────
function parseMyLines(text) {
  const recs = [];
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  lines.forEach(line => {
    for (let r=1; r<=4; r++) {
      const m = line.match(
        new RegExp(`Receiver\\s*${r}\\s*:\\s*([\\d,\\s]+?)\\s*-\\s*PotVals\\s*:\\s*([\\d,\\s]+)`)
      );
      if (!m) continue;
      const reads = m[1].split(',').map(s=>+s.trim());
      const pots  = m[2].split(',').map(s=>+s.trim());
      reads.forEach((val, i) => recs.push({ rawReading: val, potVal: pots[i] }));
    }
  });
  return recs;
}

// ─── 3. Render dispatcher ────────────────────────────────────────────────
function renderVisualization(data) {
  formattedData = data;
  computeScales();
  clearScene();
  createBarGraph();    // only bar‐plot right now
}

// ─── 4. Helpers ───────────────────────────────────────────────────────────
function computeScales() {
  const pots = formattedData.map(d=>d.potVal);
  colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                 .domain([d3.min(pots), d3.max(pots)]);
}

function clearScene() {
  objects.forEach(o=>scene.remove(o));
  objects = [];
}

// ─── 5. 6×30 Grid Bar‐Graph ────────────────────────────────────────────────
function createBarGraph() {
  const wrap = 6;
  formattedData.forEach((d, idx) => {
    const col = idx % wrap;
    const row = Math.floor(idx / wrap);
    // right⟶left:
    const x = (wrap - 1 - col) * XY_FACTOR;
    const y =  row               * XY_FACTOR;
    const h = d.rawReading / Z_SCALE_FACTOR;

    const geo = new THREE.BoxGeometry(0.9*XY_FACTOR, 0.9*XY_FACTOR, h);
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(colorScale(d.potVal)),
      transparent: true,
      opacity: +document.getElementById('opacity').value
    });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(x, y, h/2);
    scene.add(bar);
    objects.push(bar);
  });
}
