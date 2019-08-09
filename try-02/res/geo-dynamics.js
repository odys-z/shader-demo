
var fragmentShader = `
	uniform float iTime;
	varying vec3 P;
	varying vec2 vUv;

	void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
		fragColor = vec4(sin(P.xyz) + 0.5, smoothstep( 0.0, 0.8, cos(P.x * P.z * sin(vUv * 2.5) * .1) - .2 ));
		fragColor.y = pow(abs(fragColor.y * iTime), 1.2) * 0.5;
		fragColor = mix(fragColor, vec4(length(vUv) + 0.4), sin(iTime) * .2 + .4);
		fragColor.r = 0.;
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
		iChannel0: { value: sinTex(64, 64) },
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

var font;

function loadMesh(file, optns) {
	Object.assign(opts.uniforms, optns.uniforms);

	opts.picking = {x: 0, y: 0};

	// var gisctr = worldxy(centre);
	// opts.uniforms.giscentr = {value: THREE.Vector2(
	// 		// centre[0] * longLatScale,
	// 		// centre[1] * longLatScale )};
	// 		gisctr[0],
	// 		gisctr[1] )};

	$.getJSON(file, function(json) {
		console.log("geojson", json);

		geoMeshes = [];

		json.features.forEach((f, x) => {
			geoMeshes.push(geoMesh( f.geometry.coordinates[0], {
				wireframe: optns.wireframe,
				gishader: optns.gishader
			} ));
		} );
		if (optns.uniforms) ;
		else optns.uniforms = {};
		opts.uniforms.gistart = {value: new THREE.Vector4(bound[0].x, bound[0].y)};
		opts.uniforms.gisbound = {value: new THREE.Vector4(bound[1].x - bound[0].x, bound[1].y - bound[0].y)};

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

		geoMeshes.push.apply(geoMeshes, dataMeshes);

		// <script src='lib/three meshes.js'></script>
		container = init('container', {
			mesh: geoMeshes,
			pickingMeshes: idToObject,
		});

		document.onmousemove = function(e){
			// opts.uniforms.iMouse.value.x = e.clientX / container.clientWidth - 0.5;
			// opts.uniforms.iMouse.value.y = e.clientY / container.clientHeight - 0.5;
			// opts.uniforms.iResolution.value.x = e.clientX / container.clientWidth - 0.5;
			// opts.uniforms.iResolution.value.y = e.clientY / container.clientHeight - 0.5;
			opts.uniforms.iMouse.value.x = e.clientX;
			opts.uniforms.iMouse.value.y = e.clientY;
			opts.uniforms.iResolution.value.x = container.clientWidth;
			opts.uniforms.iResolution.value.y = container.clientHeight;

			opts.picking.x = e.clientX;
			opts.picking.y = e.clientY;
		}

		initDynamics(scene, optns);

		animate();
	});
}

const longLatScale = 1000;
const centre = [104.063, 30.666];
const bound = [];
	// obviously not correct from view point of gis
	bound.push({x: 180 * longLatScale, y: 180 * longLatScale});
	bound.push({x: -180 * longLatScale, y: -180 * longLatScale});

/**Change longitude and latitude to world position xy.<br>
 * @param {array} longlat [long, lat]
 * @return [x, y] in world */
function worldxy(longlat) {
	// TODO GIS Projection ...
	return [(longlat[0] - centre[0]) * longLatScale,
			(longlat[1] - centre[1]) * longLatScale];
}

/**
 * optn.wireframe using wireframe
 */
function geoMesh(jsonMesh, optn) {
	// https://threejs.org/docs/#api/en/extras/core/Shape
	var shape = new THREE.Shape();

	jsonMesh[0].forEach(function(p, ix) {
		xy = worldxy(p);

		// GIS AABB
		if (xy[0] < bound[0].x) { bound[0].x = xy[0]; }
		if (xy[0] > bound[1].x) { bound[1].x = xy[0]; }
		if (xy[1] < bound[0].y) { bound[0].y = xy[1]; }
		if (xy[1] > bound[1].y) { bound[1].y = xy[1]; }

		if (ix === 0) {
			shape.moveTo( xy[0], xy[1] );
		}
		else {
			shape.lineTo( xy[0], xy[1] );
		}
	});

	// border
	var extrudeSettings = { depth: .01, curveSegments: 1, bevelEnabled: false };
	var geop = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	geop.translate(0, 0, 15.);

	// map
	extrudeSettings = { depth: 15, curveSegments: 1, bevelEnabled: false };
	var geom = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	geom.computeBoundingSphere();

	var mesh;

	var geo = new THREE.EdgesGeometry( geop ); // or WireframeGeometry
	var mat = new THREE.LineBasicMaterial( { color: 0x003f00, linewidth: 1 } );

	if (optn.wireframe) {
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
			fragmentShader: optn.gishader && optn.gishader.frag ? optn.gishader.frag : fragmentShader,
			vertexShader: optn.gishader && optn.gishader.vert ? optn.gishader.vert : vertexShader,
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

///////////////////////     dynamic model points      //////////////////////////
var clock = new THREE.Clock();
/**Postprocessing composer
 * @type {THREE.EffectComposer} */
var composer;

const dynameshes = [];
const clonemeshes = [];

function initDynamics(scene, optns) {
	// '../3rd-lib/three.js/models/male02.obj'
	// '../3rd-lib/three.js/models/female02.obj'
	optns.dynaObjs.forEach((f, i) => {
		var loader = new THREE.OBJLoader2();
		loader.setLogging(false, false); // material is missing, but not needed
		loader.load( f, function ( object ) {
			var positions = combineBuffer( object, 'position' );
			// pushed into dynameshes
			createMesh( positions, scene, .405, - 60 + i * 30, - 35, 0, 0xff7744 );
			createMesh( positions, scene, .405, - 20 + i * 30, - 15, 0, 0xff5522 );
			createMesh( positions, scene, .405,   20 + i * 30, - 35, 0, 0xff9922 );
			createMesh( positions, scene, .405,   60 + i * 30, - 15, 0, 0xff99ff );
		}, null, null, function(e) { /* console.log(e); */ } );
	});

	// postprocessing
	var renderModel = new THREE.RenderPass( scene, camera );
	var effectBloom = new THREE.BloomPass( 0.15 );
	var effectFilm = new THREE.FilmPass( 0.5, 0.5, 1448, false );

	effectFocus = new THREE.ShaderPass( THREE.FocusShader );
	effectFocus.uniforms[ "screenWidth" ].value = window.innerWidth * window.devicePixelRatio;
	effectFocus.uniforms[ "screenHeight" ].value = window.innerHeight * window.devicePixelRatio;

	composer = new THREE.EffectComposer( renderer );
	composer.addPass( renderModel );
	// why not working?
	// composer.addPass( effectBloom );
	// composer.addPass( effectFilm );
	composer.addPass( effectFocus );
}

/**Extract geometry attributes, named <i>attr</i>
 * @param {event} OBJLoader2.load() callback event.
 * @param {string} name of attribute
 * @return {Float32Array} the combined attributes.
 */
function combineBuffer( event, attr ) {
	let count = 0;
	var model = event.detail.loaderRootNode;
	model.traverse( function ( child ) {
		if ( child.isMesh ) {
			var buffer = child.geometry.attributes[ attr ];
			count += buffer.array.length;
		}
	} );

	var combined = new Float32Array( count );
	let offset = 0;

	model.traverse( function ( child ) {
		if ( child.isMesh ) {
			var buffer = child.geometry.attributes[ attr ];
			combined.set( buffer.array, offset );
			offset += buffer.array.length;
		}
	} );

	return new THREE.BufferAttribute( combined, 3 );
}

/**1. Create a mesh, with <i>position</i> and <i>initialPosition</i>;<br>
 * 2. Clone each instance<br>
 * 3. Setup verices up/down information for animation.<br>
 * 4. Add these meshes to parent
 * @param {Array} position
 * @param {THREE.Scene} scene
 * @param {number} scale
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} color
 */
function createMesh( positions, scene, scale, x, y, z, color ) {
	var geometry = new THREE.BufferGeometry();
	geometry.addAttribute( 'position', positions.clone() );
	geometry.addAttribute( 'initialPosition', positions.clone() );
	geometry.attributes.position.setDynamic( true );

	var clones = [  [ 600, - 400, 20 ],
					[ 500, 0, 20 ],
					[ 100, 500, 20 ],
					[ 100, - 500, 20 ],
					[ 400, 200, 20 ],
					[ - 400, 100, 20 ],
					[ - 500, - 500, 20 ],
					[ 0, 0, 20 ] ];

	for ( var i = 0; i < clones.length; i ++ ) {
		var c = ( i < clones.length - 1 ) ? 0x052515 : color;

		mesh = new THREE.Points( geometry, new THREE.PointsMaterial( { size: 1, color: c } ) );
		mesh.scale.x = mesh.scale.y = mesh.scale.z = scale;

		mesh.position.x = x + clones[ i ][ 0 ];
		mesh.position.y = y + clones[ i ][ 1 ];
		mesh.position.z = z + clones[ i ][ 2 ];
		mesh.rotateX(Math.PI / 2);

		// clonemeshes.push( { mesh: mesh, speed: 0.5 + Math.random() } );
		scene.add( mesh );
	}

	dynameshes.push( {  mesh: mesh,
					verticesDown: 0, verticesUp: 0, direction: 0, speed: 15,
					delay: Math.floor( 200 + 200 * Math.random() ),
					start: Math.floor( 100 + 200 * Math.random() ), } );
}

function onDyanRender() {
	var delta = 10 * clock.getDelta();
	delta = delta < 2 ? delta : 2;
	// parent.rotation.y += - 0.02 * delta;

	for ( var j = 0; j < clonemeshes.length; j ++ ) {
		var cm = clonemeshes[ j ];
		cm.mesh.rotation.y += - 0.1 * delta * cm.speed;
	}

	for ( var j = 0; j < dynameshes.length; j ++ ) {
		var data = dynameshes[ j ];
		var positions = data.mesh.geometry.attributes.position;
		var initialPositions = data.mesh.geometry.attributes.initialPosition;
		var count = positions.count;

		if ( data.start > 0 ) {
			data.start -= 1;
		} else {
			if ( data.direction === 0 ) {
				data.direction = - 1;
			}
		}

		for ( var i = 0; i < count; i ++ ) {
			var px = positions.getX( i );
			var py = positions.getY( i );
			var pz = positions.getZ( i );

			// falling down
			if ( data.direction < 0 ) {
				if ( py > 0 ) {
					positions.setXYZ( i,
						px + 1.5 * ( 0.50 - Math.random() ) * data.speed * delta,
						py + 3.0 * ( 0.25 - Math.random() ) * data.speed * delta,
						pz + 1.5 * ( 0.50 - Math.random() ) * data.speed * delta
					);
				} else {
					data.verticesDown += 1;
				}
			}

			// rising up
			if ( data.direction > 0 ) {
				var ix = initialPositions.getX( i );
				var iy = initialPositions.getY( i );
				var iz = initialPositions.getZ( i );

				var dx = Math.abs( px - ix );
				var dy = Math.abs( py - iy );
				var dz = Math.abs( pz - iz );

				var d = dx + dy + dx;

				if ( d > 1 ) {
					positions.setXYZ(
						i,
						px - ( px - ix ) / dx * data.speed * delta * ( 0.85 - Math.random() ),
						py - ( py - iy ) / dy * data.speed * delta * ( 1 + Math.random() ),
						pz - ( pz - iz ) / dz * data.speed * delta * ( 0.85 - Math.random() )
					);
				} else {
					data.verticesUp += 1;
				}
			}
		}

		// all vertices down
		if ( data.verticesDown >= count ) {
			if ( data.delay <= 0 ) {
				data.direction = 1;
				data.speed = 5;
				data.verticesDown = 0;
				data.delay = 320;
			} else {
				data.delay -= 1;
			}
		}

		// all vertices up
		if ( data.verticesUp >= count ) {
			if ( data.delay <= 0 ) {
				data.direction = - 1;
				data.speed = 15;
				data.verticesUp = 0;
				data.delay = 120;
			} else {
				data.delay -= 1;
			}
		}
		positions.needsUpdate = true;
	}
	composer.render( 0.01 );
}

function onWinDynaResize(composer, effectFocus, size) {
	composer.setSize( size.w, size.h );

	effectFocus.uniforms[ "screenWidth" ].value = size.w * window.devicePixelRatio;
	effectFocus.uniforms[ "screenHeight" ].value = size.h * window.devicePixelRatio;
}
