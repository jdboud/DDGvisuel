// Globals
let formattedData = [], objects = [];
let colorScale;

// Default parameters (will be tweaked by GUI)
const params = {
  tilt: 0,
  zoom: 50,
  xySpacing: 0.05,
  zScale: 500,
  showR1: true,
  showR2: true,
  showR3: true,
  showR4: true,
  resetView() {
    gui.reset();
    applyView();
  },
  exportPNG() {
    renderer.domElement.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'visualization.png';
      a.click();
      URL.revokeObjectURL(url);
    });
  }
};

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const controls = new THREE.OrbitControls(camera, renderer.domElement);
camera.position.set(2,2,4);
controls.update();
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0xffffff, 1);
document.body.appendChild(renderer.domElement);

// Lights\scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));

// DAT.GUI
const gui = new dat.GUI({ width: 300 });
gui.add(params, 'tilt', -45, 45).onChange(applyView).name('Tilt');
gui.add(params, 'zoom', 10,200).onChange(applyView).name('Zoom');
gui.add(params, 'xySpacing', 0.01,0.5).onChange(renderCurrent).name('XY Spacing');
gui.add(params, 'zScale', 100,2000).onChange(renderCurrent).name('Z Scale');
const folder = gui.addFolder('Receivers');
folder.add(params, 'showR1').name('Receiver 1').onChange(renderCurrent);
folder.add(params, 'showR2').name('Receiver 2').onChange(renderCurrent);
folder.add(params, 'showR3').name('Receiver 3').onChange(renderCurrent);
folder.add(params, 'showR4').name('Receiver 4').onChange(renderCurrent);
folder.open();
gui.add(params, 'resetView').name('Reset View');
gui.add(params, 'exportPNG').name('Export PNG');

document.getElementById('parseBtn').addEventListener('click', () => {
  const raw = document.getElementById('rawData').value.trim();
  if (!raw) return alert('Paste your data first.');
  const data = parseMyLines(raw);
  if (!data.length) return alert('No valid records found.');
  renderVisualization(data);
});

function applyView(){
  camera.rotation.x = THREE.Math.degToRad(params.tilt);
  camera.zoom = params.zoom/50;
  camera.updateProjectionMatrix();
}

function parseMyLines(text) {
  const recs = [];
  text.split(/\r?\n/).filter(l=>l.trim()).forEach(line => {
    for (let r=1; r<=4; r++) {
      const m = line.match(new RegExp(`Receiver\\s*${r}\\s*:\\s*([\\d,\\s]+?)\\s*-\\s*PotVals\\s*:\\s*([\\d,\\s]+)`));
      if (!m) continue;
      const reads = m[1].split(',').map(s=>+s.trim());
      const pots  = m[2].split(',').map(s=>+s.trim());
      reads.forEach((val,i) => recs.push({ rawReading: val, potVal: pots[i], receiver: r }));
    }
  });
  return recs;
}

function renderVisualization(data) {
  formattedData = data;
  computeColorScale();
  clearScene();
  createBarGraph();
}

function computeColorScale() {
  const pots = formattedData.map(d=>d.potVal);
  colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                 .domain([d3.min(pots), d3.max(pots)]);
}

function clearScene(){
  objects.forEach(o=>scene.remove(o));
  objects = [];
}

function createBarGraph() {
  const wrap = 6;
  const spacing = params.xySpacing * 4;
  formattedData.forEach((d, idx) => {
    if (!params['showR'+d.receiver]) return;
    const col = idx % wrap;
    const row = Math.floor(idx / wrap);
    const x = (wrap-1-col)*spacing;
    const y = row*spacing;
    const h = d.rawReading / params.zScale;
    const cell = params.xySpacing*2;
    const geo = new THREE.BoxGeometry(cell*0.8, cell*0.8, h);
    const mat = new THREE.MeshPhongMaterial({ color:new THREE.Color(colorScale(d.potVal)), transparent:true, opacity:+document.getElementById('opacity').value });
    const bar = new THREE.Mesh(geo,mat);
    bar.position.set(x,y,h/2);
    scene.add(bar); objects.push(bar);
  });
}

function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene,camera);
}
animate();

window.addEventListener('resize',()=>{
  renderer.setSize(innerWidth,innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
