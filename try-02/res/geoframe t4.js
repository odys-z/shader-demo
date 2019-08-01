
var fragmentShader = `
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

var vertexShader = `
  uniform vec3 camPos;

  varying vec2 vUv;
  varying vec3 I;
  varying vec3 P;
  varying vec4 cent;

  void main() {
    vUv = uv;

    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    P = worldPosition.xyz;
    I = normalize(camPos - worldPosition.xyz);

    cent = modelMatrix * vec4(0., 0., 0., 1.);

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

Object.assign(opts.uniforms, {
	camPos:  { value: new THREE.Vector3(0, 0, 140) },
	iTime: { value: 0 },
	iChannel0: { value: sinText(64, 64) },
	texize: { value: new THREE.Vector4(64, 64, 4, 4) },
	iResolution:  { value: new THREE.Vector3() },
	iMouse: {value: new THREE.Vector2()},
});

document.onmousemove = function(e){
	opts.uniforms.iMouse.value.x = e.clientX / window.innerWidth - 0.5;
	opts.uniforms.iMouse.value.y = e.clientY / window.innerHeight - 0.5;
}

function loadMesh(file, optns) {
	// $.getJSON("res/Jinjiang geom.json?jsoncallback=geojson", function(json) {
	$.getJSON(file, function(json) {
		console.log(json);
		// all meshes
		// var meshes = geoMesh(json);
		meshes = [];
		json.features.forEach((f, x) => {
			meshes.push(geoMesh( f.geometry.coordinates[0] ));
		} );

		if (optns !== undefined && typeof optns.datafrag === 'string') {
			meshes.push(initBoxes({
				uniforms: opts.uniforms,
				boxSize: optns.boxSize,
				frag: optns.datafrag,
				vert: vertexShader}));
		}

		// <script src='lib/three meshes.js'></script>
		init('container', {
			mesh: meshes,
		});
		animate();
	});
}

const longLatScale = 1000;
const centre = [104.063, 30.666];

function geoMesh(jsonMesh, wireframe) {
	// https://threejs.org/docs/#api/en/extras/core/Shape
	var shape = new THREE.Shape();

	jsonMesh[0].forEach(function(p, ix) {
		// TODO GIS Projection ...
		if (ix === 0) {
			shape.moveTo( (p[0] - centre[0]) * longLatScale,
						(p[1] - centre[1]) * longLatScale );
		}
		else {
			shape.lineTo( (p[0] - centre[0]) * longLatScale,
						(p[1] - centre[1]) * longLatScale );
		}
	});

	var extrudeSettings = { depth: 15, curveSegments: 1, bevelEnabled: false };
	var geom = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	// var geom = new THREE.ShapeGeometry( shape );

	// var mesh = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial() );
	// geom = new THREE.BoxBufferGeometry( 20, 20, 10, 2, 2, 2 );

	// scale geometry to a uniform size
	geom.computeBoundingSphere();
	/* Don't scale, it scaled from long-lat, that's not on a plane!
	 * var scaleFactor = 240 / geom.boundingSphere.radius;
	 * geom.scale( scaleFactor, scaleFactor, scaleFactor );
	 */

	var mesh;

	var geo = new THREE.EdgesGeometry( geom ); // or WireframeGeometry
	var mat = new THREE.LineBasicMaterial( { color: 0x003f00, linewidth: 1 } );
	mesh = new THREE.LineSegments( geo, mat );

	if (wireframe) {
		var wire = new THREE.Mesh( geom,
			new THREE.MeshBasicMaterial( {
				color: 0x222080,
				wireframe: true,
				opacity: 0.2 } ));

		var vertexNormalsHelper = new THREE.VertexNormalsHelper( wire, 1 );
		wire.add( vertexNormalsHelper );

		mesh.add(wire);
	}
	else {
		var material = new THREE.ShaderMaterial( {
			fragmentShader,
			vertexShader,
			uniforms: opts.uniforms,
			opacity: 0.7 } );
		material.transparent = true;

		var m = new THREE.Mesh( geom, material );
		// var vertexNormalsHelper = new THREE.VertexNormalsHelper( m, 1 );
		// m.add( vertexNormalsHelper );

		mesh.add( m );
	}
	return mesh;
}

function initBoxes(opts) {
	var box;
	if (Array.isArray(opts.boxSize)) {
		box = new THREE.BoxBufferGeometry(
			opts.boxSize[0], opts.boxSize[1], opts.boxSize[2], 2, 2, 2 );
		box.translate(0, 0, 20 + opts.boxSize[2] / 2);
	}
	else {
		box = new THREE.BoxBufferGeometry( 40, 40, 40, 2, 2, 2 );
		box.translate(0, 0, 60);
	}

	var material = new THREE.ShaderMaterial( {
			fragmentShader: opts.frag,
			vertexShader: opts.vert,
			uniforms: opts.uniforms,
			opacity: 0.8 } );
		material.transparent = true;

		var m = new THREE.Mesh( box, material );
		// var vertexNormalsHelper = new THREE.VertexNormalsHelper( m, 1 );
		// m.add( vertexNormalsHelper );
		return m;
}
