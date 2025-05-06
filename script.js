// ─── 0. Globals ──────────────────────────────────────────────────────────────
let XY_FACTOR, Z_SCALE_FACTOR;
let formattedData = [], objects = [], xCenter, yCenter, colorScale;

// ─── 1. Three.js Setup ───────────────────────────────────────────────────────
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));

// ─── 2. DOM‑Ready Wiring ─────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // grab the sliders & initialize factors
  const xySlider = document.getElementById('xyFactor');
  const zSlider  = document.getElementById('zScaleFactor');
  XY_FACTOR      = +xySlider.value;
  Z_SCALE_FACTOR = +zSlider.value;

  // live‑update when user drags them
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
  };

  // visualization‐type dropdown
  document.getElementById('visualizationType')
    .addEventListener('change', () => renderVisualization(formattedData));
});

// ─── 3. Parsing ───────────────────────────────────────────────────────────────
function parseMyLines(text) {
  const recs = [];
  text.split(/\r?\n/).forEach(line => {
    const m = line.match(
      /Y1:\s*(\d+)\s*Y2:\s*(\d+).*?Receiver\s*1:\s*([\d,\s]+)\s*-\s*PotVals:\s*([\d,\s]+)/
    );
    if (!m) return;
    const X = +m[1], Y = +m[2];
    const zs = m[3].split(',').map(s => +s.trim());
    const ds = m[4].split(',').map(s => +s.trim());
    zs.forEach((z,i) => {
      if (ds[i] > 0) recs.push({ X, Y, Z: z, Density: ds[i] });
    });
  });
  return recs;
}

// ─── 4. Helpers ──────────────────────────────────────────────────────────────
function computeScales() {
  const xE = d3.extent(formattedData, d=>d.X);
  const yE = d3.extent(formattedData, d=>d.Y);
  xCenter   = (xE[0] + xE[1]) / 2;
  yCenter   = (yE[0] + yE[1]) / 2;
  colorScale = d3.scaleSequential(d3.interpolateRgb("white","salmon"))
                 .domain(d3.extent(formattedData, d=>d.Density));
}

function clearScene() {
  objects.forEach(o => scene.remove(o));
  objects = [];
}

// ─── 5. Plotters ─────────────────────────────────────────────────────────────
function createBarGraph(){
  formattedData.forEach(d => {
    const geom = new THREE.BoxGeometry(1,1,d.Z / Z_SCALE_FACTOR);
    const mat  = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      d.Z / (2 * Z_SCALE_FACTOR)
    );
    scene.add(mesh);
    objects.push(mesh);
  });
}

function createScatterPlot(){
  formattedData.forEach(d => {
    const geom = new THREE.SphereGeometry(d.Z / Z_SCALE_FACTOR / 2,16,16);
    const mat  = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      d.Z / Z_SCALE_FACTOR
    );
    scene.add(mesh);
    objects.push(mesh);
  });
}

function createHeatmap(){
  formattedData.forEach(d => {
    const geom = new THREE.PlaneGeometry(1,1);
    const mat  = new THREE.MeshBasicMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      0
    );
    scene.add(mesh);
    objects.push(mesh);
  });
}

function createLineGraph(){
  const geom  = new THREE.BufferGeometry();
  const verts = [], cols = [];
  formattedData.forEach(d => {
    verts.push(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      d.Z / Z_SCALE_FACTOR
    );
    const c = new THREE.Color(colorScale(d.Density));
    cols.push(c.r,c.g,c.b);
  });
  geom.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));
  geom.setAttribute('color',   new THREE.Float32BufferAttribute(cols, 3));
  const mat = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      +document.getElementById('opacity').value
  });
  const line = new THREE.Line(geom, mat);
  scene.add(line);
  objects.push(line);
}

// ─── 6. Dispatcher ──────────────────────────────────────────────────────────
function renderVisualization(data){
  formattedData = data;
  computeScales();
  clearScene();
  switch(document.getElementById('visualizationType').value){
    case 'bar':     createBarGraph();    break;
    case 'scatter': createScatterPlot(); break;
    case 'heatmap': createHeatmap();     break;
    case 'line':    createLineGraph();   break;
  }
}

// ─── 7. Animate + Resize ─────────────────────────────────────────────────────
camera.position.set(50,50,50);
camera.lookAt(scene.position);

function animate(){
  requestAnimationFrame(animate);
  camera.zoom = +document.getElementById('zoom').value/50;
  camera.updateProjectionMatrix();
  camera.rotation.z = +document.getElementById('rotation').value*Math.PI/180;
  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
