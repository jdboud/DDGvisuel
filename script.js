// ─── What is Three.js? ──────────────────────────────────────────────────────
// Three.js is a lightweight JS library on top of WebGL that gives you:
// • a Scene graph, Cameras, Lights, Geometries & Materials,
// • easy Mesh creation (Box, Sphere, BufferGeometry…),
// • and a WebGLRenderer that handles the low‑level plumbing for you.

// ─── 0. Globals ─────────────────────────────────────────────────────────────
let formattedData = [],
    objects       = [],
    XY_FACTOR     = 0.05,
    Z_SCALE_FACTOR= 500,
    colorScale;

// ─── 1. Three.js Setup ─────────────────────────────────────────────────────
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new THREE.OrbitControls(camera, renderer.domElement);

// initial camera—will get repositioned in createBarGraph()
camera.position.set(0, 0, 1);
controls.target.set(0,0,0);
controls.update();

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

// lights
scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));

// ─── 2. DOM Ready: hook parse button & sliders & dropdown ─────────────────
window.addEventListener('DOMContentLoaded', () => {
  const xySlider = document.getElementById('xyFactor');
        xySlider.value = 0.5;  // default
  const zSlider  = document.getElementById('zScaleFactor');

  XY_FACTOR      = +xySlider.value;
  Z_SCALE_FACTOR = +zSlider.value;

  xySlider.addEventListener('input', e => {
    XY_FACTOR = +e.target.value;
    renderVisualization(formattedData);
  });
  zSlider.addEventListener('input', e => {
    Z_SCALE_FACTOR = +e.target.value;
    renderVisualization(formattedData);
  });

  document.getElementById('parseBtn').onclick = () => {
    const raw = document.getElementById('rawData').value.trim();
    if (!raw) return alert('Paste your data first.');
    const data = parseMyLines(raw);
    if (!data.length) return alert('No valid records found.');
    renderVisualization(data);
    console.log('got records:', data.length);
  };

  document.getElementById('visualizationType')
          .addEventListener('change', () => renderVisualization(formattedData));
});

// ─── 3. Parser: flatten 4×5×9 readings into [{rawReading,potVal},…] ─────────
function parseMyLines(text) {
  const recs = [];
  text.split(/\r?\n/).filter(l=>l.trim()).forEach(line => {
    for (let r = 1; r <= 4; r++) {
      const m = line.match(
        new RegExp(`Receiver\\s*${r}\\s*:\\s*([\\d,\\s]+?)\\s*-\\s*PotVals\\s*:\\s*([\\d,\\s]+)`)
      );
      if (!m) continue;
      const reads = m[1].split(',').map(s=>+s.trim());
      const pots  = m[2].split(',').map(s=>+s.trim());
      reads.forEach((val,i) => recs.push({ rawReading: val, potVal: pots[i] }));
    }
  });
  return recs;
}

// ─── 4. Render Dispatcher ───────────────────────────────────────────────────
function renderVisualization(data) {
  formattedData = data;
  computeColorScale();
  clearScene();
  createBarGraph();  // only bar for now
}

// ─── 5. Helpers ─────────────────────────────────────────────────────────────
function computeColorScale() {
  const pots = formattedData.map(d => d.potVal);
  colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                 .domain([d3.min(pots), d3.max(pots)]);
}

function clearScene() {
  objects.forEach(o => scene.remove(o));
  objects = [];
}

// ─── 6. Grid‐wrapped 6×30 Bar Graph (with auto‐camera centering) ───────────
function createBarGraph() {
  const wrap    = 6;
  const spacing = XY_FACTOR * 4;
  const rows    = Math.ceil(formattedData.length / wrap);

  // center camera & controls on the grid
  const cx = (wrap - 1) * spacing / 2;
  const cy = (rows  - 1) * spacing / 2;
  camera.position.set(cx, cy, Math.max(cx, cy) * 1.5);
  controls.target.set(cx, cy, 0);
  controls.update();

  formattedData.forEach((d, idx) => {
    const col = idx % wrap;
    const row = Math.floor(idx / wrap);
    const x   = (wrap - 1 - col) * spacing; // right→left
    const y   = row * spacing;
    const h   = d.rawReading / Z_SCALE_FACTOR;

    const cellSize = XY_FACTOR * 2;
    const geo = new THREE.BoxGeometry(
      cellSize * 0.8,
      cellSize * 0.8,
      h
    );
    const mat = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.potVal)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(x, y, h/2); // lift base to z=0

    scene.add(bar);
    objects.push(bar);
  });
}

// ─── 7. Animate + Resize (NO more camera.rotation overrides!) ───────────────
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  // zoom still works via camera.zoom
  camera.zoom = +document.getElementById('zoom').value / 50;
  camera.updateProjectionMatrix();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
