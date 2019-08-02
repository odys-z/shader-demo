// const pi = 3.14159265359;
const defaultFrag = `
	uniform float iTime;
	varying vec3 P;
	varying vec2 vUv;

	void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
		fragColor = vec4(normalize(P.xyz), abs(cos(iTime) * .5 + .5));
		fragColor = mix(fragColor, vec4(length(vUv)), sin(iTime) * .5 + .5);
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
	renderer.render( scene, camera );
}

// Commons
/**Get texture with step function noise.
 * @param {int} width
 * @param {int} height
 * @return THREE.DataTexture */
function sinText(width, height) {
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
