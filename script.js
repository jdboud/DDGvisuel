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
camera.position.set(1, 1, 15);
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

// …then the rest of your script is identical…
