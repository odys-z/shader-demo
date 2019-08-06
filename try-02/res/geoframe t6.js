
var fragmentShader = `
	uniform float iTime;
	varying vec3 P;
	varying vec2 vUv;

	void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
		fragColor = vec4(sin(P.xyz) + 0.5, smoothstep(0.3, 1.0, cos(P.xyz * .5)));
		fragColor = mix(fragColor, vec4(length(vUv) + 0.4), sin(iTime) * .2 + .4);
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

Object.assign(opts.uniforms,
	{	camPos:  { value: new THREE.Vector3(0, 0, 140) },
		iTime: { value: 0 },
		iChannel0: { value: sinText(64, 64) },
		texize: { value: new THREE.Vector4(64, 64, 4, 4) },
		iResolution:  { value: new THREE.Vector3() },
		iMouse: {value: new THREE.Vector2()},
	}
);

// gpu picker
Object.assign(opts,
	{	picker: {
			pickingTexture: new THREE.WebGLRenderTarget(1, 1),
			pixelBuffer: new Uint8Array(4),
			pickedObject: null,
			// pickedObjectSavedColor: 0,
		}
	}
);

idToObject = [];
idToObject.push({}); // id = 0 is the background color - bug of the example?
/** data box meshes, when one picked, use this to change it's color, see pick()
 * The first one, ix = 0, is reserved for background
 */
var dataMeshes = new Array(1);

function loadMesh(file, optns) {
	Object.assign(opts.uniforms, optns.uniforms);

	opts.picking = {x: 0, y: 0};

	$.getJSON(file, function(json) {
		console.log("geojson", json);

		geoMeshes = [];

		json.features.forEach((f, x) => {
			geoMeshes.push(geoMesh( f.geometry.coordinates[0] ));
		} );

		if (optns !== undefined && typeof optns.datafrag === 'string') {
			if (optns.boxes) {
				optns.boxes.forEach((box, ix) => {
					var boxMesh = initBox(ix + 1, // picking id, 0 is background
						Object.assign(
							{	uniforms: opts.uniforms,
								frag: optns.datafrag,
								vert: vertexShader
							}, box));
					dataMeshes.push(boxMesh[0]);

					idToObject.push(boxMesh[1]);
				});
			}
		}

		dataMeshes.forEach((m, ix) => {
			if (ix > 0) {
				geoMeshes.push(m);
			}
		});

		// <script src='lib/three meshes.js'></script>
		container = init('container', {
			mesh: geoMeshes,
			pickingMeshes: idToObject,
		});

		document.onmousemove = function(e){
			opts.uniforms.iMouse.value.x = e.clientX / container.clientWidth - 0.5;
			opts.uniforms.iMouse.value.y = e.clientY / container.clientHeight - 0.5;

			opts.uniforms.iResolution.value.x = e.clientX / container.clientWidth - 0.5;
			opts.uniforms.iResolution.value.y = e.clientY / container.clientHeight - 0.5;

			opts.picking.x = e.clientX;
			opts.picking.y = e.clientY;
		}

		animate();
	});
}

const longLatScale = 1000;
const centre = [104.063, 30.666];
/**Change longitude and latitude to world position xy.<br>
 * @param {array} longlat [long, lat]
 * @return [x, y] in world */
function worldxy(longlat) {
	// TODO GIS Projection ...
	return [(longlat[0] - centre[0]) * longLatScale,
			(longlat[1] - centre[1]) * longLatScale];
}

function geoMesh(jsonMesh, wireframe) {
	// https://threejs.org/docs/#api/en/extras/core/Shape
	var shape = new THREE.Shape();

	jsonMesh[0].forEach(function(p, ix) {
		xy = worldxy(p);
		if (ix === 0) {
			shape.moveTo( xy[0], xy[1] );
		}
		else {
			shape.lineTo( xy[0], xy[1] );
		}
	});

	var extrudeSettings = { depth: .1, curveSegments: 1, bevelEnabled: false };
	var geop = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	geop.translate(0, 0, 15.);
	extrudeSettings = { depth: 15, curveSegments: 1, bevelEnabled: false };
	var geom = new THREE.ExtrudeGeometry( shape, extrudeSettings );

	geom.computeBoundingSphere();

	var mesh;

	var geo = new THREE.EdgesGeometry( geop ); // or WireframeGeometry
	var mat = new THREE.LineBasicMaterial( { color: 0x003f00, linewidth: 1 } );

	if (wireframe) {
		var wire = new THREE.Mesh( geom,
			new THREE.MeshBasicMaterial( {
				color: 0x222080,
				wireframe: true,
				opacity: 0.2 } ));

		var vertexNormalsHelper = new THREE.VertexNormalsHelper( wire, 1 );
		wire.add( vertexNormalsHelper );

		mesh = wire;
	}
	else {
		var material = new THREE.ShaderMaterial( {
			fragmentShader,
			vertexShader,
			uniforms: opts.uniforms,
			opacity: 0.7 } );
		material.transparent = true;

		var m = new THREE.Mesh( geom, material );
		mesh = m;
	}

	mesh.add( new THREE.LineSegments( geo, mat ));

	return mesh;
}

/**Create a box mesh.
 * @param {string} id
 * @param {object} opts
 * opts.uniforms:
 * opts.frag: fragment shader,
 * opts.vert: vertex shader,
 * opts.box [{center: [x, y], size[x, y, z]}]
 * return {THREE.Mesh} box mesh of box
 */
function initBox(id, opts) {
	var box;

	var transxy = worldxy(opts.center);

	if (Array.isArray(opts.size)) {
		box = new THREE.BoxBufferGeometry(
			opts.size[0], opts.size[1], opts.size[2], 2, 2, 2 );
		// box.translate(0, 0, 20 + opts.boxSize[2] / 2);
		box.translate(transxy[0], transxy[1], 20 + opts.size[2] / 2);
	}
	else {
		box = new THREE.BoxBufferGeometry( 40, 40, 200, 2, 2, 2 );
		box.translate(transxy[0], transxy[1], 120);
	}

	var material = new THREE.ShaderMaterial( {
			fragmentShader: opts.frag,
			vertexShader: opts.vert,
			uniforms: opts.uniforms,
			opacity: 0.8 } );
	material.transparent = true;

	var boxMesh = new THREE.Mesh( box, material );

	// const loader = new THREE.TextureLoader();
	// const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/frame.png');

	// picking cube
	const pickingMaterial = new THREE.MeshPhongMaterial({
		emissive: new THREE.Color(id),
		color: new THREE.Color(0, 0, 0),
		specular: new THREE.Color(0, 0, 0),
		// map: texture,
		transparent: true,
		side: THREE.DoubleSide,
		alphaTest: 0.5,
		blending: THREE.NoBlending,
	});

    const pickingCube = new THREE.Mesh(box, pickingMaterial);
    // pickingCube.position.copy(boxMesh.position);
    // pickingCube.rotation.copy(boxMesh.rotation);
    // pickingCube.scale.copy(boxMesh.scale);

	return [boxMesh, pickingCube];
}

// material for geo mesh
var pickedMaterial = new THREE.ShaderMaterial( {
		fragmentShader: fragmentShader,
		vertexShader: vertexShader,
		uniforms: opts.uniforms,
		opacity: 0.8 } );
pickedMaterial.transparent = true;

/** Saving picked mesh's original material */
var savedMaterial;

function pick(cssPosition, scene, camera, time) {
	// const {pickingTexture, pixelBuffer} = opts.picker;
	const p = opts.picker;

	// restore the color if there is a picked object
	// if (p.pickedObject) {
	// 	// p.pickedObject.material.emissive.setHex(this.pickedObjectSavedColor);
	// 	p.pickedObject = undefined;
	// }

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
	renderer.setRenderTarget(p.pickingTexture);
	renderer.render(pickingScene, camera);
	renderer.setRenderTarget(null);
	// clear the view offset so rendering returns to normal
	camera.clearViewOffset();
	//read the pixel
	renderer.readRenderTargetPixels(
		p.pickingTexture,
		0, 0, 1, 1,   // x y width height
		p.pixelBuffer);

	const id = (p.pixelBuffer[0] << 16) |
			   (p.pixelBuffer[1] <<  8) |
			   (p.pixelBuffer[2]      );

	if (id > 0) {
		select(id);
	}
	else {
		deselect();
	}
}

/**Select a data box<br>
 * @param {string} id
 */
function select(id) {
	const intersectedObject = idToObject[id];

	if (intersectedObject != opts.picker.pickedObject) {
		deselect();

		savedMaterial = dataMeshes[id].material;
		dataMeshes[id].material = pickedMaterial;
		opts.picker.pickedObject = dataMeshes[id];

		// // save its color
		// p.pickedObjectSavedColor = this.pickedObject.material.emissive.getHex();
		// // set its emissive color to flashing red/yellow
		// p.pickedObject.material.emissive.setHex((time * 8) % 2 > 1 ? 0xFFFF00 : 0xFF0000);
	}
}

function deselect() {
	if (opts.picker.pickedObject) {
		opts.picker.pickedObject.material = savedMaterial;
		opts.picker.pickedObject = undefined;
	}
}
