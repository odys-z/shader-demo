const pi = 3.14159265359;
/**Volumetric Rendering
 * TODO Redefine as a public lib API.
 * @param {object} opts<br>
 * opts.geometryType e.g. new THREE.BoxGeometry(0.7, 0.7, 0.7);
 * opts.geometryCnt e.g. box count
 */
function vmatch(tag, vertexShader, fragmentShader, uniforms, opts) {
  const canvas = document.querySelector('#' + tag);
  const renderer = new THREE.WebGLRenderer({canvas});

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 50;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

  // why not work:
  // camera.position = uniforms.camPos.value;
  if (uniforms.camPos) {
    camera.position.x = uniforms.camPos.value.x;
    camera.position.y = uniforms.camPos.value.y;
    camera.position.z = uniforms.camPos.value.z;
  }
  else {
    camera.position.z = 3;
  }

  const scene = new THREE.Scene();
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;

  // const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const geometry = opts.geometryType;

  uniforms.iResolution.value.x = canvas.width;
  uniforms.iResolution.value.y = canvas.height;

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  function makeInstance(geometry, x) {
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  // const cubes = [
  //   makeInstance(geometry, -2),
  //   makeInstance(geometry,  0),
  //   makeInstance(geometry,  2),
  // ];
  const geomes = [];
  for (var cnt = 0; cnt < opts.geometryCnt; cnt++) {
    geomes.push(makeInstance(opts.geometryType, -2 + cnt * 2 ));
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
    time *= 0.001;  // convert to seconds

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    geomes.forEach((geom, ndx) => {
      // exchange x, y because user don't feel that rotating is following mouse
      if (uniforms.iMouse) {
        const rotx = uniforms.iMouse.value.y * (ndx - 1.) * pi * 1.25;
        const roty = uniforms.iMouse.value.x * pi * .667;
        // console.log(ndx, uniforms.iMouse.value.y, rotx);
        geom.rotation.x = rotx;
        geom.rotation.y = roty;
      }
      else {
        const speed = 1 + ndx * .1;
        const rot = time * speed;
        geom.rotation.x = rot;
        geom.rotation.y = rot;
      }
    });

    uniforms.iTime.value = time;

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  document.onmousemove = function(e){
    if (uniforms.iMouse) {
      uniforms.iMouse.value.x = e.clientX / window.innerWidth - 0.5;
      uniforms.iMouse.value.y = e.clientY / window.innerHeight - 0.5;
    }
  }

  requestAnimationFrame(render);
}
