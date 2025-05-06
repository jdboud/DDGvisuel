// ─── 1. Parse & button hook ─────────────────────────────────────────────────
// how “wide” to spread X and Y (was 80)
const XY_FACTOR = 0.55;
// how much to compress Z heights (was 1000)
const Z_SCALE_FACTOR = 500;

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

document.getElementById('parseBtn').addEventListener('click', () => {
  const raw = document.getElementById('rawData').value.trim();
  if (!raw) return alert('Paste your data first.');
  const data = parseMyLines(raw);
  if (!data.length) return alert('No valid records found.');
  renderVisualization(data);
});

// ─── 2. Three.js + D3 setup ──────────────────────────────────────────────────

const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));

let formattedData = [];
let objects       = [];
let xCenter,yCenter,xRange,yRange,colorScale;

function computeScales() {
  const xE = d3.extent(formattedData, d=>d.X);
  const yE = d3.extent(formattedData, d=>d.Y);
  xRange = xE[1]-xE[0]; yRange = yE[1]-yE[0];
  xCenter = (xE[0]+xE[1])/2;
  yCenter = (yE[0]+yE[1])/2;
  colorScale = d3.scaleSequential(d3.interpolateRgb("white","salmon"))
                 .domain(d3.extent(formattedData, d=>d.Density));
}

// ─── 3. Plotters ──────────────────────────────────────────────────────────────

function clearScene() {
  objects.forEach(o => scene.remove(o));
  objects = [];
}

function createBarGraph(){
  formattedData.forEach(d=>{
    const geom = new THREE.BoxGeometry(1, 1, d.Z / Z_SCALE_FACTOR);
    const m    = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const bar  = new THREE.Mesh(geom, m);

    bar.position.set(
      (d.X - xCenter)/xRange * XY_FACTOR,
      (d.Y - yCenter)/yRange * XY_FACTOR,
      d.Z / (2 * Z_SCALE_FACTOR)
    );

    scene.add(bar);
    objects.push(bar);
  });
}

function createScatterPlot(){
  formattedData.forEach(d=>{
    const geom = new THREE.SphereGeometry(d.Z / Z_SCALE_FACTOR / 2, 16, 16);
    const m    = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const pt   = new THREE.Mesh(geom, m);
    pt.position.set(
      (d.X - xCenter)/xRange * XY_FACTOR,
      (d.Y - yCenter)/yRange * XY_FACTOR,
      d.Z / Z_SCALE_FACTOR
    );
    scene.add(pt);
    objects.push(pt);
  });
}


function createHeatmap() {
  formattedData.forEach(d => {
    const geom = new THREE.PlaneGeometry(1, 1);
    const mat  = new THREE.MeshBasicMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const mesh = new THREE.Mesh(geom, mat);

    mesh.position.set(
      (d.X - xCenter),
      (d.Y - yCenter),
      0
    );

    scene.add(mesh);
    objects.push(mesh);
  });
}

function createLineGraph() {
  const geom  = new THREE.BufferGeometry();
  const verts = [];
  const cols  = [];

  formattedData.forEach(d => {
    const x = (d.X - xCenter) * XY_FACTOR;
    const y = (d.Y - yCenter) * XY_FACTOR;
    const z = d.Z / Z_SCALE_FACTOR;
    verts.push(x, y, z);

    const c = new THREE.Color(colorScale(d.Density));
    cols.push(c.r, c.g, c.b);
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute('color',    new THREE.Float32BufferAttribute(cols,  3));

  const mat  = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      +document.getElementById('opacity').value
  });
  const line = new THREE.Line(geom, mat);

  scene.add(line);
  objects.push(line);
}


function createLineGraph(){
  const geom  = new THREE.BufferGeometry();
  const verts = [];
  const cols  = [];

  formattedData.forEach(d => {
    const x = (d.X - xCenter) / xRange * XY_FACTOR;
    const y = (d.Y - yCenter) / yRange * XY_FACTOR;
    const z = d.Z / Z_SCALE_FACTOR;
    verts.push(x, y, z);

    const c = new THREE.Color(colorScale(d.Density));
    cols.push(c.r, c.g, c.b);
  });

  geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geom.setAttribute('color',    new THREE.Float32BufferAttribute(cols,  3));

  const mat  = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent:  true,
    opacity:      +document.getElementById('opacity').value
  });
  const line = new THREE.Line(geom, mat);

  scene.add(line);
  objects.push(line);
}

function renderVisualization(data){
  formattedData = data;
  computeScales();
  clearScene();
  const type = document.getElementById('visualizationType').value;
  if(type==='bar')      createBarGraph();
  else if(type==='scatter') createScatterPlot();
  else if(type==='heatmap')  createHeatmap();
  else if(type==='line')     createLineGraph();
}

// redraw on type change
document.getElementById('visualizationType')
  .addEventListener('change',()=>renderVisualization(formattedData));

// ─── 4. Camera controls & animate ─────────────────────────────────────────────

camera.position.set(50,50,50);
camera.lookAt(scene.position);

function animate(){
  requestAnimationFrame(animate);
  // zoom slider
  camera.zoom = +document.getElementById('zoom').value/50;
  camera.updateProjectionMatrix();
  // rotation slider
  camera.rotation.z = +document.getElementById('rotation').value * Math.PI/180;
  renderer.render(scene,camera);
}
animate();

// handle resize
window.addEventListener('resize',()=>{
  renderer.setSize(window.innerWidth,window.innerHeight);
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
});
