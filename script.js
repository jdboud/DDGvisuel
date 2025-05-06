// ─── Globals ─────────────────────────────────────────────────────────────
let formattedData = [],
    objects       = [],
    colorScale;

// group that will hold all bars
const container = new THREE.Group();

// ─── 1. Three.js Setup ────────────────────────────────────────────────────
const scene    = new THREE.Scene();
const camera   = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// lights
scene.add(new THREE.DirectionalLight(0xffffff,1).position.set(0,1,1));
scene.add(new THREE.AmbientLight(0xfffff4,1));

// add our container to the scene
scene.add(container);

// initial camera pos/orientation
camera.position.set(1, 1, 15);
camera.rotation.set(0, 0, 0);


// ─── 2. Simple parser ──────────────────────────────────────────────────────
function parseMyLines(text) {
  const recs = [];
  text.split(/\r?\n/).forEach(line=>{
    for(let r=1; r<=4; r++){
      const m = line.match(
        new RegExp(`Receiver\\s*${r}\\s*:\\s*([\\d,\\s]+)\\s*-\\s*PotVals\\s*:\\s*([\\d,\\s]+)`)
      );
      if(!m) continue;
      const reads = m[1].split(',').map(s=>+s.trim());
      const pots  = m[2].split(',').map(s=>+s.trim());
      reads.forEach((val,i)=> recs.push({ rawReading: val, potVal: pots[i] }));
    }
  });
  return recs;
}

// ─── 3. Render dispatcher ───────────────────────────────────────────────────
function render(data) {
  formattedData = data;

  // build color scale
  const allP = formattedData.map(d=>d.potVal);
  colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                 .domain([d3.min(allP), d3.max(allP)]);

  // clear old bars
  container.clear();
  objects = [];

  // draw new bars in container
  const wrap    = 6;
  const spacing = 1.5;
  formattedData.forEach((d,i)=>{
    const col = i % wrap,
          row = Math.floor(i/wrap),
          x   = (wrap-1-col)*spacing,
          y   = row*spacing,
          h   = d.rawReading / 2000;

    const geo = new THREE.BoxGeometry(0.4, 0.4, h);
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(colorScale(d.potVal)),
      transparent: true, opacity: 0.8
    });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(x, y, h/2);
    container.add(bar);
    objects.push(bar);
  });

  // --- recenter container so its grid midpoint sits at world‐origin ---
  const cols  = wrap;
  const rows  = Math.ceil(formattedData.length / wrap);
  const cx    = (cols - 1)*spacing/2;
  const cy    = (rows - 1)*spacing/2;
  container.position.set(-cx, -cy, 0);
}

// ─── 4. Hooks ───────────────────────────────────────────────────────────────
document.getElementById('parseBtn').onclick = () => {
  const txt = document.getElementById('rawData').value.trim();
  const d   = parseMyLines(txt);
  if (d.length) render(d);
  else alert('No valid records found.');
};

// X‐tilt
document.getElementById('tiltX').addEventListener('input', e => {
  camera.rotation.x = +e.target.value * Math.PI/180;
});
// Y‐tilt
document.getElementById('tiltY').addEventListener('input', e => {
  camera.rotation.y = +e.target.value * Math.PI/180;
});
// Zoom
document.getElementById('zoom').addEventListener('input', e => {
  camera.zoom = +e.target.value / 50;
  camera.updateProjectionMatrix();
});
// Rotate around Z
document.getElementById('rotateZ').addEventListener('input', e => {
  camera.rotation.z = +e.target.value * Math.PI/180;
});

// ─── 5. Animate & Resize ───────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
});
