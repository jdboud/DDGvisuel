// ─── 0. Top constants ────────────────────────────────────────────────────────
const XY_FACTOR      = 0.15;   // tweak until your X/Y spread feels right
const Z_SCALE_FACTOR = 10;   // tweak to flatten or exaggerate Z

// ─── 1. Bar graph ────────────────────────────────────────────────────────────
function createBarGraph(){
  formattedData.forEach(d=>{
    const geom = new THREE.BoxGeometry(1, 1, d.Z / Z_SCALE_FACTOR);
    const mat  = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const bar = new THREE.Mesh(geom, mat);

    // **raw X/Y offset** multiplied by your factor
    bar.position.set(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      d.Z / (2 * Z_SCALE_FACTOR)
    );

    scene.add(bar);
    objects.push(bar);
  });
}

// ─── 2. Scatter plot ─────────────────────────────────────────────────────────
function createScatterPlot(){
  formattedData.forEach(d=>{
    const geom = new THREE.SphereGeometry(d.Z / Z_SCALE_FACTOR / 2, 16, 16);
    const mat  = new THREE.MeshPhongMaterial({
      color:       new THREE.Color(colorScale(d.Density)),
      transparent: true,
      opacity:     +document.getElementById('opacity').value
    });
    const pt = new THREE.Mesh(geom, mat);

    pt.position.set(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      d.Z / Z_SCALE_FACTOR
    );

    scene.add(pt);
    objects.push(pt);
  });
}

// ─── 3. Heatmap ──────────────────────────────────────────────────────────────
function createHeatmap(){
  formattedData.forEach(d=>{
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

// ─── 4. Line graph ───────────────────────────────────────────────────────────
function createLineGraph(){
  const geom  = new THREE.BufferGeometry();
  const verts = [], cols = [];

  formattedData.forEach(d=>{
    verts.push(
      (d.X - xCenter) * XY_FACTOR,
      (d.Y - yCenter) * XY_FACTOR,
      d.Z / Z_SCALE_FACTOR
    );
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
    .addEventListener('change', () => renderVisualization(formattedData));

  // camera controls & animate
  camera.position.set(50, 50, 50);
  camera.lookAt(scene.position);

  function animate(){
    requestAnimationFrame(animate);
    camera.zoom = +document.getElementById('zoom').value / 50;
    camera.updateProjectionMatrix();
    camera.rotation.z = +document.getElementById('rotation').value * Math.PI/180;
    renderer.render(scene, camera);
  }
  animate();

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
