// ─── Globals ───────────────────────────────────────────────────────────────
let formattedData = [],
    objects       = [],
    colorScale;

// spherical angles & roll
let tiltX = 0,    // pitch, from −90…+90
    tiltY = 0,    // yaw,   from −180…+180
    rollZ = 0;    // roll   around view axis

// remember our “radius” from the origin
const initialR = Math.sqrt(1*1 + 1*1 + 15*15); // matches camera.position.set(1,1,15)


// ─── 1. Three.js Setup ──────────────────────────────────────────────────────
const scene = new THREE.Scene();

// Orthographic camera params
let aspect  = innerWidth / innerHeight;
const frustumSize = 20;   // adjust to zoom the whole grid in/out

// create orthographic camera
const camera = new THREE.OrthographicCamera(
  -frustumSize * aspect / 2,   // left
   frustumSize * aspect / 2,   // right
   frustumSize / 2,            // top
  -frustumSize / 2,            // bottom
   0.1,                         // near
   1000                         // far
);

// place it at exactly the same spot you used before,
// so initialR math still works:
camera.position.set(0, 0, 15);
camera.up.set(1, 0, 0);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
document.body.appendChild(renderer.domElement);

// lights & container stay unchanged
scene.add(new THREE.DirectionalLight(0xffffff, 1).position.set(0, 1, 1));
scene.add(new THREE.AmbientLight(0xfffff4, 1));
const container = new THREE.Group();
scene.add(container);


// ─── 2. Parser ──────────────────────────────────────────────────────────────
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


// ─── 3. Render dispatcher ────────────────────────────────────────────────────
function render(data) {
  formattedData = data;

  // build color scale
  const allP = formattedData.map(d=>d.potVal);
  colorScale = d3.scaleSequential(d3.interpolateYlOrRd)
                 .domain([d3.min(allP), d3.max(allP)]);

  // clear old bars
  container.clear();
  objects = [];

  // draw new bars
  const wrap    = 6,
        spacing = 1.5;

  formattedData.forEach((d,i)=>{
    const col = i % wrap,
          row = Math.floor(i/wrap),
          x   = (wrap-1-col)*spacing,
          y   = row*spacing,
          h   = d.rawReading / 2000;

    const geo = new THREE.BoxGeometry(0.4,0.4,h);
    const mat = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.potVal)),
      transparent: true, opacity: 0.8
    });
    const bar = new THREE.Mesh(geo, mat);
    bar.position.set(x, y, h/2);
    container.add(bar);
    objects.push(bar);
  });

  // recenter container around origin
  const cols = wrap,
        rows = Math.ceil(formattedData.length / wrap),
        cx   = (cols-1)*spacing/2,
        cy   = (rows-1)*spacing/2;

  container.position.set(-cx, -cy, 0);

  // update camera once
  updateCamera();
}


// ─── 4. Camera update (orbit about origin) ──────────────────────────────────
function updateCamera() {
  // convert spherical coords
  const phi   = THREE.MathUtils.degToRad(90 - tiltX);   // polar angle
  const theta = THREE.MathUtils.degToRad(tiltY);        // azimuth

  // new camera position on sphere
  camera.position.x = initialR * Math.sin(phi) * Math.cos(theta);
  camera.position.y = initialR * Math.sin(phi) * Math.sin(theta);
  camera.position.z = initialR * Math.cos(phi);

  // apply roll around view axis by rotating camera.up
  const rz = THREE.MathUtils.degToRad(rollZ);
  camera.up.set(Math.cos(rz), Math.sin(rz), 0);

  camera.lookAt(0,0,0);
}


// ─── 5. UI Hooks ────────────────────────────────────────────────────────────
document.getElementById('parseBtn').onclick = () => {
  const txt = document.getElementById('rawData').value.trim();
  const d   = parseMyLines(txt);
  if (d.length) render(d);
  else alert('No valid records found.');
};

document.getElementById('tiltX').addEventListener('input', e => {
  tiltX = +e.target.value;
  updateCamera();
});
document.getElementById('tiltY').addEventListener('input', e => {
  tiltY = +e.target.value;
  updateCamera();
});
document.getElementById('rotateZ').addEventListener('input', e => {
  rollZ = +e.target.value;
  updateCamera();
});
document.getElementById('zoom').addEventListener('input', e => {
  camera.zoom = +e.target.value / 50;
  camera.updateProjectionMatrix();
});


// ─── 6. Animate & Resize ───────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  aspect = innerWidth / innerHeight;
  camera.left   = -frustumSize * aspect / 2;
  camera.right  =  frustumSize * aspect / 2;
  camera.top    =  frustumSize / 2;
  camera.bottom = -frustumSize / 2;
  camera.updateProjectionMatrix();

  renderer.setSize(innerWidth, innerHeight);
});

