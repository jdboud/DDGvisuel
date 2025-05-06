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
camera.position.set(10, 10, 20);
camera.lookAt(0, 0, 0);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

// lights
scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));


// ─── 2. DOM Ready: hook parse button & sliders & dropdown ─────────────────
window.addEventListener('DOMContentLoaded', () => {
  // seed from the HTML sliders
  const xySlider = document.getElementById('xyFactor');
  const zSlider  = document.getElementById('zScaleFactor');
  xySlider.value      = 0.5;               // default, so grid is nicely spaced
  XY_FACTOR           = +xySlider.value;
  Z_SCALE_FACTOR      = +zSlider.value;
  xySlider.addEventListener('input', e => {
    XY_FACTOR = +e.target.value;
    renderVisualization(formattedData);
  });
  zSlider.addEventListener('input', e => {
    Z_SCALE_FACTOR = +e.target.value;
    renderVisualization(formattedData);
  });
  // parse button
  document.getElementById('parseBtn').onclick = () => {
    const raw = document.getElementById('rawData').value.trim();
    if (!raw) return alert('Paste your data first.');
    const data = parseMyLines(raw);
    if (!data.length) return alert('No valid records found.');
    renderVisualization(data);
    console.log('got records:', data.length, data);
  };

  // visualization type (if you want to support scatter / surface / etc.)
  document.getElementById('visualizationType')
          .addEventListener('change', () => renderVisualization(formattedData));
});


// ─── 3. Parser: flatten 4×5×9 readings into [{rawReading,potVal},…] ─────────
function parseMyLines(text) {
  const recs = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  lines.forEach(line => {
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
  return recs; // length = 4*5*9 = 180
}


// ─── 4. Render Dispatcher ───────────────────────────────────────────────────
function renderVisualization(data) {
  formattedData = data;
  computeColorScale();
  clearScene();
  createBarGraph();  // right now we only do bar; swap in other plotters if desired
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


// ─── 6. Grid‐wrapped 6×30 Bar Graph ────────────────────────────────────────
function createBarGraph() {
  const wrap = 6;
  formattedData.forEach((d, idx) => {
    const col = idx % wrap;
    const row = Math.floor(idx / wrap);

    // right→left
    const spacing = XY_FACTOR * 4;   // e.g. each cell 2 units wide
    const x = (wrap - 1 - col) * spacing;
    const y = row * spacing;            // same here
    const h = d.rawReading / Z_SCALE_FACTOR;

    // make each bar 80% of the cell, but cell is now 2*XY_FACTOR
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
    bar.position.set(x, y, h/2);

    scene.add(bar);
    objects.push(bar);
  });
}


// ─── 7. Animate + Resize ───────────────────────────────────────────────────

function animate(){
  requestAnimationFrame(animate);
  // update orbit controls
  controls.update();
  // apply zoom & rotation from sliders
  camera.zoom = +document.getElementById('zoom').value / 50;
  camera.updateProjectionMatrix();
  camera.rotation.z = +document.getElementById('rotation').value * Math.PI/180;
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
