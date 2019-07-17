
function main(id, fragmentShader, uniforms) {
  // TODO compile the jclient/common as a lib
  const canvas = document.querySelector('#' + id);
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.autoClearColor = false;

  const camera = new THREE.OrthographicCamera(
    -1, // left
     1, // right
     1, // top
    -1, // bottom
    -1, // near,
     1, // far
  );
  const scene = new THREE.Scene();
  const plane = new THREE.PlaneBufferGeometry(2, 2);

  const material = new THREE.ShaderMaterial({
    fragmentShader,
    uniforms,
  });

  scene.add(new THREE.Mesh(plane, material));

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time) {
    time *= 0.001;  // convert to seconds

    resizeRendererToDisplaySize(renderer);

    const canvas = renderer.domElement;
    uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    uniforms.iTime.value = time;

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}


// function main() {
/** see <a href='https://threejsfundamentals.org/threejs/threejs-background-cubemap.html'>demo</a>
 * see <a href='https://threejsfundamentals.org/threejs/lessons/threejs-backgrounds.html'>tutrial: section cubemap</a>
 */
function skybox(id) {
  const canvas = document.querySelector('#' + id);
  const renderer = new THREE.WebGLRenderer({canvas});
  renderer.autoClearColor = false;

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 100;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 3;

  const controls = new THREE.OrbitControls(camera, canvas);
  controls.target.set(0, 0, 0);
  controls.update();

  const scene = new THREE.Scene();

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    scene.add(light);
  }

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function makeInstance(geometry, color, x) {
    const material = new THREE.MeshPhongMaterial({color});

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  const cubes = [
    makeInstance(geometry, 0x44aa88,  0),
    makeInstance(geometry, 0x8844aa, -2),
    makeInstance(geometry, 0xaa8844,  2),
  ];

  {
    const loader = new THREE.CubeTextureLoader();
    loader.setCrossOrigin('anonymous');
    const texture = loader.load([
    /*Not work from file system, see
    https://discourse.threejs.org/t/solved-texture-not-loading/2661/4
    and
    https://threejs.org/docs/#manual/en/introduction/How-to-run-things-locally
      './three.js/cube/pos-x.jpg',
      './three.js/cube/neg-x.jpg',
      './three.js/cube/pos-y.jpg',
      './three.js/cube/neg-y.jpg',
      './three.js/cube/pos-z.jpg',
      './three.js/cube/neg-z.jpg',
     */
      'https://threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/pos-x.jpg',
      'https://threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/neg-x.jpg',
      'https://threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/pos-y.jpg',
      'https://threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/neg-y.jpg',
      'https://threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/pos-z.jpg',
      'https://threejsfundamentals.org/threejs/resources/images/cubemaps/computer-history-museum/neg-z.jpg',
      /*
      */
    ]);
    scene.background = texture;
  }

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time) {
    time *= 0.001;

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, ndx) => {
      const speed = 1 + ndx * .1;
      const rot = time * speed;
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}

const skyboxOps = {};
function shaderSkybox(id, fragShader, opts) {
  var canvas = document.querySelector('#' + id);
  skyboxOps.renderer = new THREE.WebGLRenderer({canvas});
  skyboxOps.renderer.autoClearColor = false;

  skyboxOps.camera = new THREE.OrthographicCamera(
    -1, 1, // left  right
     1, 1, // top bottom
    -1, 1, // near far
  );

  skyboxOps.scene = new THREE.Scene();
  var plane = new THREE.PlaneBufferGeometry(2, 2);

  skyboxOps.uniforms = {
    iTime: { value: opts.time },
    iResolution:  { value: new THREE.Vector3() },
    iMouse: { value: new THREE.Vector2()}
  };

  if (opts.texture) {
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const texture = loader.load(opts.texture);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // uniforms.iChannel0 = { value: texture};
    skyboxOps.uniforms.iChannel0 = { value: texture};
  }

  skyboxOps.material = new THREE.ShaderMaterial({
    fragmentShader: fragShader,
    uniforms: skyboxOps.uniforms,
  });

  skyboxOps.scene.add(new THREE.Mesh(plane, skyboxOps.material));

  function resizeRendererToDisplaySize(renderer) {
    var canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time) {
    time *= 0.001;  // convert to seconds

    resizeRendererToDisplaySize(skyboxOps.renderer);

    var canvas = skyboxOps.renderer.domElement;
    skyboxOps.uniforms.iResolution.value.set(canvas.width, canvas.height, 1);
    skyboxOps.uniforms.iTime.value = time;

    skyboxOps.renderer.render(skyboxOps.scene, skyboxOps.camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
