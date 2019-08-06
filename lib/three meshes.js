// const pi = 3.14159265359;
const defaultFrag = `
	uniform float iTime;
	varying vec3 P;
	varying vec2 vUv;

	void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
		fragColor = vec4(normalize(P.xyz), abs(cos(iTime) * .2 + .8));
		fragColor = mix(fragColor, vec4(length(vUv)), sin(iTime) * .2 + .8);
	}

	void main() {
		mainImage(gl_FragColor, gl_FragCoord.xy);
	}
`;

const defaultVert = `
  uniform vec3 camPos;

  varying vec2 vUv;
  varying vec3 I;
  varying vec3 P;
  varying vec4 cent;

  void main() {
    vUv = uv;

    // gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    P = worldPosition.xyz;
    I = normalize(camPos - worldPosition.xyz);

    cent = modelMatrix * vec4(0., 0., 0., 1.);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const opts = {
	geometry: new THREE.BoxBufferGeometry( 200, 200, 200, 2, 2, 2 ),
	uniforms: {
		iTime: { value: 0 },
		texize: { value: new THREE.Vector4(64, 64, 4, 4) },
		iResolution:  { value: new THREE.Vector3() },
		// camPos: { value: campos },
		// iChannel0: { value: texture },
		iMouse: {value: new THREE.Vector2()},
	},
};

const matWireframe = new THREE.MeshBasicMaterial( {
						color: 0x332588,
						wireframe: true,
						opacity: 0.5 } );

var container; //, stats, gui;
var camera, scene, renderer;

function addMesh() {
	var geometry = opts.geometry;

	// scale geometry to a uniform size
	geometry.computeBoundingSphere();
	var scaleFactor = 160 / geometry.boundingSphere.radius;
	geometry.scale( scaleFactor, scaleFactor, scaleFactor );
	var mesh = new THREE.Mesh( geometry, opts.material );
	scene.add( mesh );

	// var vertexNormalsHelper = new THREE.VertexNormalsHelper( mesh, 10 );
	// mesh.add( vertexNormalsHelper );

	var geo = new THREE.EdgesGeometry( geometry ); // or WireframeGeometry
	var mat = new THREE.LineBasicMaterial( { color: 0x7fffff, linewidth: 2 } );
	var wireframe = new THREE.LineSegments( geo, mat );
	mesh.add( wireframe );
}

function setMesh(m) {
	if (Array.isArray(m)) {
		m.forEach((e, ix) => {
			scene.add(e);
		});
	}
	else {
		scene.add(m);
	}
}

function init(tag, options) {
	Object.assign(opts, options);

	if (options.showMesh) {
	 	opts.material = new THREE.MeshBasicMaterial( {
			color: 0x332588,
			wireframe: true,
			opacity: 0.5 } );
	}
	else {
		var fragmentShader = opts.frag ? opts.frag : defaultFrag;
		var vertexShader = opts.vert ? opts.vert : defaultVert;

		opts.material = new THREE.ShaderMaterial( {
			fragmentShader,
			vertexShader,
			uniforms: opts.uniforms,
			opacity: 0.5 } );
	}
	opts.material.transparent = true;

	container = document.getElementById( tag );
	camera = new THREE.PerspectiveCamera( 70, container.clientWidth / container.clientHeight, 1, 5000 );
	camera.position.z = 500;
	scene = new THREE.Scene();

	if (opts.mesh) {
		setMesh(opts.mesh);
	}
	else {
		addMesh();
	}
	if (container.getContext) {
		var gl2 = container.getContext( 'webgl2' );
		renderer = new THREE.WebGLRenderer( { antialias: true, context: gl2 } );
	}
	else {
		renderer = new THREE.WebGLRenderer( { antialias: true } );
	}
	renderer.setPixelRatio( window.devicePixelRatio );
	// renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setSize( container.clientWidth, container.clientHeight );
	container.appendChild( renderer.domElement );

	if (opts.pickingMeshes) {
		opts.pickingMeshes.forEach((m, ix) => {
			scene.add(m);
		});
	}

	var controls = new THREE.OrbitControls( camera, renderer.domElement );

	window.addEventListener( 'resize', onWindowResize, false );

	return container;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	// renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.setSize( container.clientWidth, container.clientHeight );
}

function animate(time) {
	requestAnimationFrame( animate );
	render(time);
}

function render(time) {
    time *= 0.001;  // convert to seconds
	opts.uniforms.iTime.value = time;

	if (opts.picker){
    	// pick(pickPosition, scene, camera, time);
    	pick(opts.picking, scene, camera, time);
	}
	renderer.render( scene, camera );
}

////////////////////////////////////////////////////////////////////////////////
// Commons - GPU Picking Try
/**<p>Init a scene wtih GPU Picker.</p>
 * See https://threejsfundamentals.org/threejs/lessons/threejs-picking.html
 * @param {string} tag tag id
 * @param {object} opts optons<br>
 * opts.fov
 * opts.far
 */
function initPicker(tag, opts) {
  const canvas = document.querySelector('#' + tag);
  const renderer = new THREE.WebGLRenderer({canvas});

  const fov = opts.fov ? opts.fov : 60;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = opts.far ? opts.far : 200;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 30;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('white');
  const pickingScene = new THREE.Scene();
  pickingScene.background = new THREE.Color(0);

  // put the camera on a pole (parent it to an object)
  // so we can spin the pole to move the camera around the scene
  const cameraPole = new THREE.Object3D();
  scene.add(cameraPole);
  cameraPole.add(camera);

  {
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 4);
    camera.add(light);
  }

  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);

  function rand(min, max) {
    if (max === undefined) {
      max = min;
      min = 0;
    }
    return min + (max - min) * Math.random();
  }

  function randomColor() {
    return `hsl(${rand(360) | 0}, ${rand(50, 100) | 0}%, 50%)`;
  }

  const loader = new THREE.TextureLoader();
  const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/frame.png');

  const idToObject = {};
  const numObjects = 100;
  for (let i = 0; i < numObjects; ++i) {
    const id = i + 1;
    const material = new THREE.MeshPhongMaterial({
      color: randomColor(),
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
    });

    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    idToObject[id] = cube;

    cube.position.set(rand(-20, 20), rand(-20, 20), rand(-20, 20));
    cube.rotation.set(rand(Math.PI), rand(Math.PI), 0);
    cube.scale.set(rand(3, 6), rand(3, 6), rand(3, 6));

    const pickingMaterial = new THREE.MeshPhongMaterial({
      emissive: new THREE.Color(id),
      color: new THREE.Color(0, 0, 0),
      specular: new THREE.Color(0, 0, 0),
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.5,
      blending: THREE.NoBlending,
    });
    const pickingCube = new THREE.Mesh(geometry, pickingMaterial);
    pickingScene.add(pickingCube);
    pickingCube.position.copy(cube.position);
    pickingCube.rotation.copy(cube.rotation);
    pickingCube.scale.copy(cube.scale);
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

  class GPUPickHelper {
    constructor() {
      // create a 1x1 pixel render target
      this.pickingTexture = new THREE.WebGLRenderTarget(1, 1);
      this.pixelBuffer = new Uint8Array(4);
      this.pickedObject = null;
      this.pickedObjectSavedColor = 0;
    }
    pick(cssPosition, scene, camera, time) {
      const {pickingTexture, pixelBuffer} = this;

      // restore the color if there is a picked object
      if (this.pickedObject) {
        this.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
        this.pickedObject = undefined;
      }

      // set the view offset to represent just a single pixel under the mouse
      const pixelRatio = renderer.getPixelRatio();
      camera.setViewOffset(
          renderer.context.drawingBufferWidth,   // full width
          renderer.context.drawingBufferHeight,  // full top
          cssPosition.x * pixelRatio | 0,        // rect x
          cssPosition.y * pixelRatio | 0,        // rect y
          1,                                     // rect width
          1,                                     // rect height
      );
      // render the scene
      renderer.setRenderTarget(pickingTexture);
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      // clear the view offset so rendering returns to normal
      camera.clearViewOffset();
      //read the pixel
      renderer.readRenderTargetPixels(
          pickingTexture,
          0, 0, 1, 1,   // x y width height
          pixelBuffer);

      const id = (pixelBuffer[0] << 16) |
				 (pixelBuffer[1] <<  8) |
				 (pixelBuffer[2]      );

      const intersectedObject = idToObject[id];
      if (intersectedObject) {
        // pick the first object. It's the closest one
        this.pickedObject = intersectedObject;
        // save its color
        this.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
        // set its emissive color to flashing red/yellow
        this.pickedObject.material.emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
      }
    }
  }

  const pickPosition = {x: 0, y: 0};
  const pickHelper = new GPUPickHelper();
  clearPickPosition();

  function render(time) {
    time *= 0.001;  // convert to seconds;

    if (resizeRendererToDisplaySize(renderer)) {
		const canvas = renderer.domElement;
		camera.aspect = canvas.clientWidth / canvas.clientHeight;
		camera.updateProjectionMatrix();
    }

    cameraPole.rotation.y = time * .1;

    pickHelper.pick(pickPosition, pickingScene, camera, time);

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);

  function setPickPosition(event) {
	pickPosition.x = event.clientX;
	pickPosition.y = event.clientY;
  }

  function clearPickPosition() {
    // unlike the mouse which always has a position
    // if the user stops touching the screen we want
    // to stop picking. For now we just pick a value
    // unlikely to pick something
    pickPosition.x = -100000;
    pickPosition.y = -100000;
  }

  window.addEventListener('mousemove', setPickPosition);
  window.addEventListener('mouseout', clearPickPosition);
  window.addEventListener('mouseleave', clearPickPosition);

  window.addEventListener('touchstart', (event) => {
    // prevent the window from scrolling
    event.preventDefault();
    setPickPosition(event.touches[0]);
  }, {passive: false});

  window.addEventListener('touchmove', (event) => {
    setPickPosition(event.touches[0]);
  });

  window.addEventListener('touchend', clearPickPosition);
}

// main();

////////////////////////////////////////////////////////////////////////////////
// Commons - Textures
/**Get texture with step function noise.
 * @param {int} width
 * @param {int} height
 * @return THREE.DataTexture */
function sinTex(width, height) {
	var size = width * height;
	var data = new Uint8Array( 3 * size );

	for ( var i = 0; i < size; i ++ ) {
		var stride = i * 3;
		data[ stride ] = Math.sin(i % width) / (i % width) * 255 % 255;
		// data[ stride + 1 ] = i < width * height * 0.55 ? Math.sin(i * 0.2) * 255 : Math.cos(i * 0.1) * 127;
		data[ stride + 1 ] = Math.sin(i * 0.2) * 255 % 255;
		// data[ stride + 2 ] = Math.sin(i) / (i) * 255;
		data[ stride + 2 ] = Math.sin(i) / (i * 0.1) * 255 % 255;
	}

	// used the buffer to create a DataTexture
	var texture = new THREE.DataTexture( data, width, height, THREE.RGBFormat );
	texture.needsUpdate = true;
	return texture;
}
