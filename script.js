// ─── 0. Globals ─────────────────────────────────────────────────────────────
let formattedData = [], objects = [];
const XY_FACTOR      = 0.5;    // horizontal/vertical spacing
const Z_SCALE_FACTOR = 1500;   // height compression
let colorScale;

// ─── 1. Three.js setup ─────────────────────────────────────────────────────
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(
  75, window.innerWidth/window.innerHeight, 0.1, 1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

// simple light
scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));

// ─── 2. Hook the Parse button ───────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.getElementById('parseBtn').onclick = () => {
    const raw = document.getElementById('rawData').value.trim();
    if (!raw) return alert('Paste your data first.');
    const data = parseMyLines(raw);
    if (!data.length) return alert('No valid records found.');
    renderVisualization(data);
  };
});

// ─── 3. Parser: flatten 4×5×9 readings into [{rawReading,potVal},…] ─────────
function parseMyLines(text) {
  const recs = [];
  text.split(/\r?\n/).filter(l=>l.trim()).forEach(line => {
    for (let r = 1; r <= 4; r++) {
      const m = line.match(
        new RegExp(
          `Receiver\\s*${r}\\s*:` +
          `\\s*([\\d,\\s]+?)\\s*` +
          `-\\s*PotVals\\s*:\\s*([\\d,\\s]+)`
        )
      );
      if (!m) continue;
      const reads = m[1].split(',').map(s=>+s.trim());
      const pots  = m[2].split(',').map(s=>+s.trim());
      reads.forEach((val,i) => recs.push({ rawReading: val, potVal: pots[i] }));
    }
  });
  // expect recs.length === 4×5×9 = 180
  return recs;
}

// ─── 4. Render dispatcher ───────────────────────────────────────────────────
function renderVisualization(data) {
  formattedData = data;
  computeColorScale();
  clearScene();
  createBarGraph();
}

// ─── 5. Helpers ─────────────────────────────────────────────────────────────
function computeColorScale() {
  const pots = formattedData.map(d=>d.potVal);
  colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                 .domain([d3.min(pots), d3.max(pots)]);
}

function clearScene() {
  objects.forEach(o=>scene.remove(o));
  objects = [];
}

// ─── 6. Grid‑wrapped 6×30 bar graph ──────────────────────────────────────────
function createBarGraph() {
  const wrap    = 6;
  const total   = formattedData.length;
  const rows    = Math.ceil(total / wrap);
  const spacing = XY_FACTOR * 4;

  // Auto‑center camera on grid
  const cx = (wrap - 1) * spacing / 2;
  const cy = (rows  - 1) * spacing / 2;
  camera.position.set(cx, cy, Math.max(cx,cy) * 1.5);
  camera.lookAt(cx, cy, 0);

  formattedData.forEach((d, idx) => {
    const col = idx % wrap;
    const row = Math.floor(idx / wrap);
    const x   = (wrap - 1 - col) * spacing; // right→left
    const y   = row * spacing;
    const h   = d.rawReading / Z_SCALE_FACTOR;

    // bar geometry
    const cellSize = XY_FACTOR * 2;
    const geo = new THREE.BoxGeometry(
      cellSize * 0.8,
      cellSize * 0.8,
      h
    );
    const mat = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.potVal)),
      transparent: true,
      opacity:     0.8
    });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(x, y, h/2);  // lift so base sits on z=0

    scene.add(bar);
    objects.push(bar);
  });
}

// ─── 7. Animation loop + resize ────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});
