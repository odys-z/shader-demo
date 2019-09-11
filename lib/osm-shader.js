/** Earth Radius hold by OSM,
 * see https://wiki.openstreetmap.org/wiki/Zoom_levels */
const R = 6372.7982;

/** a of Mercator Projection
 * see https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections
 * */
const a = 500;

function O3 {
	var osmgroup, castscreen, rays; // rays in world for findout osm tiles
	var camera, scene, renderer, controls;

	const opts = {
		divId: 'map',
		position: {long: 104.09856, lat: 30.6765, h: 20},
		lookAt: {long: 104.09856, lat: 30.6865, h: 0},
		camera: {fov: 50, near: 0.1, far: 50000},
		uniforms: {
			iTime: { value: 0 },
			iResolution:  { value: new THREE.Vector3() },
			iMouse: {value: new THREE.Vector2()},
		},
	};

	/**
	 * @param {String} divId cotainer div id
	 * @param {Object} options
	 * options.lookat {long, lat, h},
	 * options.campos {long, lat, h}
	 */
	constructor(divId, options) {
		if (divId != undefined)
			this.opts.divId = divId;

		scene = this.init(divId);
	}

	/**Initialize.
	 * @param {string} contid dom id for rendering.
	 * @return {THREE.Scene} scene
	 */
	this.init = function(contid) {
		var container = document.querySelector( '#' + contid );
		var scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x000104 );
		camera = new THREE.PerspectiveCamera( opts.camera.fov,
							container.clientWidth / container.clientHeight,
							opts.camera.near, opts.camera.far );
		camera.position.set( 0, 0, 1200 );
		camera.lookAt( scene.position );

		renderer = new THREE.WebGLRenderer( { antialias: true } );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( container.clientWidth, container.clientHeight );
		container.appendChild( renderer.domElement );

		// var globe = pointsBuff(6, a);
		// scene.add(globe);

		// controls = new THREE.OrbitControls( camera, renderer.domElement );
		window.addEventListener( 'resize', onResize, false );
		return scene;
	}

	this.getUserMatrix = function(a) {
		var obj = new THREE.Object3D();

		var p = getUserPos(a);
		obj.position.set(p.x, p.y, p.z);

		var lx = document.querySelector('#lx').value;
		var ly = document.querySelector('#ly').value;
		var lz = document.querySelector('#lz').value;
		var look = rad2cart(lx * Math.PI / 180, ly * Math.PI / 180, a + lz * 1.);
		obj.lookAt(look.x, look.y, look.z);

		var rx = document.querySelector('#ux').value;
		var ry = document.querySelector('#uy').value;
		var rz = document.querySelector('#uz').value;
		obj.rotateX(rx * Math.PI / 180);
		obj.rotateY(ry * Math.PI / 180);
		obj.rotateZ(rz * Math.PI / 180);

		obj.updateMatrix();
		obj.updateMatrixWorld();
		console.log(`matrix: (${obj.matrix}), world-matrix: (${obj.matrixWorld})`);
		return obj.matrixWorld;
	}

	this.updateFrustum = function(scene, hotId, tileId) {
		// if (frustum === undefined) {
		if (osmgroup === undefined) {
			const f = 100;
			var geometry = new THREE.ConeGeometry( 50, f, 4, 1, false, Math.PI / 4);
			var material = new THREE.MeshBasicMaterial( {
									color: 0x0077ff,
									wireframe: true,
									opacity: 0.5 } );
			castscreen = new THREE.Mesh( new THREE.PlaneBufferGeometry (80, 80, 2, 2),
									material );
			// see https://threejs.org/docs/#manual/en/introduction/Matrix-transformations
			// castscreen.matrixAutoUpdate = false;
			castscreen.translateOnAxis( new THREE.Vector3(0, 0, 1), 100 );

			osmgroup = new THREE.Group();
			osmgroup.matrixAutoUpdate = false;
			osmgroup.add(castscreen);
			scene.add(osmgroup);
			console.log('screen created with matrices (screen-matrix, screen-matrixWorld)',
				JSON.stringify(castscreen.matrix),
				JSON.stringify(castscreen.matrixWorld)
			);
		}

		var m = getUserMatrix(a);
		console.log('user matrix: ', JSON.stringify(m));

		// osmgroup's auto-update-matrix = false
		osmgroup.matrix = m.clone();

		var c0 = new THREE.Vector3();
		var p = getUserPos(a);
		c0.set(p.x, p.y, p.z);
		console.log('c0: ', JSON.stringify(c0));

		// add rays
		if (rays !== undefined) {
			// can we just move the position?
			scene.remove(scene.getObjectByName('rays'));
		}
		castscreen.updateMatrix();
		console.log('calling getTargets(), m, group.matrix, screen.matrix',
				JSON.stringify(m),
				JSON.stringify(osmgroup.matrix),
				JSON.stringify(castscreen.matrix)
			);
		m.multiply(castscreen.matrix);
		var raytarges = getTargets(castscreen.geometry.attributes.position.clone(), m);

		var geometry = new THREE.Geometry();
		osmTiles = {};
		for ( var ix = 0; ix < raytarges.count; ix++ ) {
			var x = raytarges.getX(ix);
			var y = raytarges.getY(ix);
			var z = raytarges.getZ(ix);
			geometry.vertices.push(new THREE.Vector3( x, y, z ));
			geometry.vertices.push(c0);

			collectOsmTiles(osmTiles, [x, y, z], c0, a);
		}
		console.log(osmTiles);
		loadHot(osmTiles, hotId, tileId);

		rays = new THREE.LineSegments(geometry,
					new THREE.LineBasicMaterial({ color: 0x7777ff }));
		rays.name = 'rays';
		scene.add(rays);
	}

	/**Apply matWorld to poses position.
	 * If poses is cast screen's points, and mat is user's settings,
	 * this function will return it's positions in world.
	 * @param {Float32Array} poses the verices buffer
	 * @param {THREE.Matrix4} matWorld world matrix
	 * @param {THREE.Matrix4} matLocal model matrix
	 * @return {Float32Array} the verices buffer
	 */
	this.getTargets = function(poses, matWorld) {
		console.log('in getTargets() matWorld', JSON.parse(JSON.stringify(matWorld)));

		var mat = matWorld.clone();
		console.log('in getTargets() mat', JSON.parse(JSON.stringify(mat)));

		for ( var ix = 0; ix < poses.count; ix++ ) {
			var v = new THREE.Vector3(poses.getX(ix),
						poses.getY(ix), poses.getZ(ix));
			v.applyMatrix4(mat);
			poses.setXYZ(ix, v.x, v.y, v.z);
		};
		return poses;
	}

	this.onResize = function() {
		var container = document.querySelector( '#' + opts.divId );
		var w = container.clientWidth;
		var h = container.clientHeight;

		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		// camera.lookAt( scene.position );
		renderer.setSize( w, h );
	}

	this.render = function(time) {
	    time *= 0.001;  // convert to seconds
		opts.uniforms.iTime.value = time;

		renderer.render( scene, camera );

	 	requestAnimationFrame( this.render );
	}
}
