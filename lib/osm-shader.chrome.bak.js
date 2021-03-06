/** Earth Radius hold by OSM,
 * see https://wiki.openstreetmap.org/wiki/Zoom_levels */
const R = 6372.7982;

/** a of Mercator Projection
 * see https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections
const a = 500;
 * */

/**Api to manage tiles and 3d geojson objects.
 * @param {canvas} canvas dom element created by THREE.WebGLRenderer()
 * @param {object} options<br>
 * options.lookat {lon, lat, h},
 * options.campos {lon, lat, h}
 * @class O3
 */
class O3 {
	// var pointMaterial;
	// osmgroup, castscreen, rays; // rays in world for findout osm tiles
	// camera, scene, renderer, controls;

	/**Api to manage tiles and 3d geojson objects.
	 * @param {object} options (optional)<br>
	 * options.lookat {lon, lat, h},
	 * options.campos {lon, lat, h}
	 */
	constructor(options) {
		// osmgroup, castscreen, rays; // rays in world for findout osm tiles
		// camera, scene, renderer, controls;
		this.verbose = 5;
		this.opts = {
			divId: 'map',
			control: undefined, //new THREE.MapControls(),
			// position: {long: 104.09856, lat: 30.6765, h: 20},
			// position: Object.assign({lon: 104.09856, lat: 30.6765, h: 20}, options.campos),
			// lookAt: Object.assign({lon: 104.09856, lat: 30.6865, h: 0}, options.position),
			camera: {fov: 50, near: 0.1, far: 50000},
			uniforms: {
				iTime: { value: 0 },
				iResolution:  { value: new THREE.Vector3() },
				iMouse: {value: new THREE.Vector2()},
			},
			pointMaterial: new THREE.PointsMaterial( { color: 0xffffff, size: 10 } )
		};
		var p = Object.assign({lon: 104.09856, lat: 30.6765, h: 20}, options.campos);
		this.opts.position = osmUtils.rad2cart(p.lon, p.lat, p.h + R);
		p = Object.assign({lon: 104.09856, lat: 30.6865, h: 0}, options.position);
		var lookAt = osmUtils.rad2cart(p.lon, p.lat, R);
		this.opts.lookAt = new THREE.Vector3(lookAt[0], lookAt[1], lookAt[1]);

		// this.osm = {
		// 	group: undefined,
		// 	castscreen: undefined,
		// 	rays: undefined
		// }

		if (options) {
			Object.assign(this.opts.uniforms, options.uniforms);
			// Object.assign(this.opts, options);
		}

		var campos = this.opts.position;
		this.s3 = {campos};

		// var container = document.querySelector( '#' + contid );
		var scene = new THREE.Scene();
		scene.background = new THREE.Color( 0x000104 );
		var camera = new THREE.PerspectiveCamera( this.opts.camera.fov,
							window.innerWidth / window.innerHeight,
							this.opts.camera.near, this.opts.camera.far );
		// camera.position.set( this.opts.position.x, this.opts.position.y, this.opts.position.z );
		camera.position.set( campos.x, campos.y, campos.z );
		camera.lookAt( this.opts.lookAt );

		var renderer = new THREE.WebGLRenderer( { antialias: true } );
		var container = renderer.domElement;
		this.s3.container = container;
		document.body.appendChild( container );
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight );

		var controls = new THREE.MapControls( camera, renderer.domElement );
		// call this only in static scenes (i.e., if there is no animation loop)
		//controls.addEventListener( 'change', render );
		controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
		controls.dampingFactor = 0.05;
		controls.screenSpacePanning = false;
		controls.minDistance = 100;
		controls.maxDistance = 500;
		controls.maxPolarAngle = Math.PI / 2;

		this.s3.scene = scene;
		this.s3.camera = camera;
		this.s3.renderer = renderer;
		this.s3.controls = controls;
		// container.appendChild( renderer.domElement );

		// var globe = pointsBuff(6, a);
		// scene.add(globe);

		// controls = new THREE.OrbitControls( camera, renderer.domElement );
		window.addEventListener( 'resize', this.onResize, false );
	}

	/**Convert geojson path to world mesh.
	 * @param {array} jsonMesh mesh (path?) from geojson, in lon-lat tuple.
	 * @param {boolean} wireframe using wireframe material?
	 * @return {THREE.Mesh} segment mash or wireframe mesh
	 */
	geoMesh (jsonMesh, wireframe) {
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

	/**@deprecated */
	updateFrustum (scene, tileId) {
		// if (frustum === undefined) {
		if (this.osmgroup === undefined) {
			const f = 100;
			var geometry = new THREE.ConeGeometry( 50, f, 4, 1, false, Math.PI / 4);
			var material = new THREE.MeshBasicMaterial( {
									color: 0x0077ff,
									wireframe: true,
									opacity: 0.5 } );
			this.castscreen = new THREE.Mesh( new THREE.PlaneBufferGeometry (80, 80, 2, 2),
									material );
			// see https://threejs.org/docs/#manual/en/introduction/Matrix-transformations
			// castscreen.matrixAutoUpdate = false;
			this.castscreen.translateOnAxis( new THREE.Vector3(0, 0, 1), 100 );

			this.osmgroup = new THREE.Group();
			this.osmgroup.matrixAutoUpdate = false;
			this.osmgroup.add(this.castscreen);
			scene.add(this.osmgroup);
		}

		var m = this.getUserMatrix(a);
		console.log('user matrix: ', JSON.stringify(m));

		// osmgroup's auto-update-matrix = false
		this.osmgroup.matrix = m.clone();

		var c0 = new THREE.Vector3();
		var p = getUserPos(a);
		c0.set(p.x, p.y, p.z);
		console.log('c0: ', JSON.stringify(c0));

		// add rays
		if (this.rays !== undefined) {
			// can we just move the position?
			scene.remove(scene.getObjectByName('rays'));
		}
		this.castscreen.updateMatrix();
		// console.log('calling getTargets(), m, group.matrix, screen.matrix',
		// 		JSON.stringify(m),
		// 		JSON.stringify(this.osmgroup.matrix),
		// 		JSON.stringify(this.castscreen.matrix)
		// 	);
		m.multiply(this.castscreen.matrix);
		var raytarges = getTargets(this.castscreen.geometry.attributes.position.clone(), m);

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
		if (this.verbose >= 5) console.log(osmTiles);

		this.rays = new THREE.LineSegments(geometry,
					new THREE.LineBasicMaterial({ color: 0x7777ff }));
		this.rays.name = 'rays';
		scene.add(this.rays);
	}

	/**Create a position buffer represting the segments vertices.
	 * @param {THREE.Matrix4} matWorld world matrix
	 * @param {object} sects {w, h, sx, sy} section definition,
	 * width, height, width segment, height segment
	 * @return {Float32Array} the sections' verices buffer, in world
	 */
	getRayTargets (matWorld, sects) {
		var castsGeom = new THREE.PlaneBufferGeometry (sects.w, sects.h, sects.sx || 2, sects.sy || 2);
		var poses = castsGeom.attributes.position;

		for ( var ix = 0; ix < poses.count; ix++ ) {
			var v = new THREE.Vector3(poses.getX(ix),
						poses.getY(ix), poses.getZ(ix));
			v.applyMatrix4(matWorld);
			poses.setXYZ(ix, v.x, v.y, v.z);
		};
		return poses;
	}

	onResize () {
		var container = document.querySelector( '#' + opts.divId );
		var w = container.clientWidth;
		var h = container.clientHeight;

		camera.aspect = w / h;
		camera.updateProjectionMatrix();
		// camera.lookAt( scene.position );
		renderer.setSize( w, h );
	}

	render (time) {
	    time *= 0.001;  // convert to seconds
		opts.uniforms.iTime.value = time;

		renderer.render( scene, camera );

	 	requestAnimationFrame( this.render );
	}
}

/**Helper for axis convertion or OSM tiles calculation.
 * @class OsmUtils
 */
class OsmUtils {
	constructor(verbos) {
		this.verbose = verbos ? verbos : 5;
	}

	/**Convert long-lat to world position in Cartesian.
	 * @param {number} long longitude in radians ( degree *= pi / 180)
	 * @param {number} lat latitude in radians ( degree *= pi / 180)
	 * @param {number} a a of Mercator Projection, see
	 * <a href=https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections'>Mercator Projection</a>
	 * @return {object} x, y, z in world
	 */
	rad2cart(long, lat, a) {
		var r = a * Math.cos(lat);
		var x = r * Math.cos(long);
		var y = a * Math.sin(lat);
		var z = -r * Math.sin(long);
		return {x : x, y: y, z: z};
	}

	/**See https://keisan.casio.com/exec/system/1359533867
	 * and https://en.wikipedia.org/wiki/Spherical_coordinate_system
	 * @param {object} p position {x, y, z}
	 * @param {object} c0 center (x, y, z)
	 * @return {object} {long, lat, r}
	 */
	cart2rad (p, c0) {
		if (c0 === undefined)
			c0 = {x: 0, y: 0, z: 0};
		var x = p.x - c0.x;
		var y = p.y - c0.y;
		var z = p.z - c0.z;

		var r = Math.sqrt(x * x + y * y + z * z);

		// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/atan2
		// The Math.atan2() function returns the angle in the plane (in radians)
		// between the positive x-axis and the ray from (0,0) to the point (x,y),
		// for Math.atan2(y,x)
		var phi = Math.atan2(-z, x); // x = 0, z = a, phi = 0, it's -90;

		if (x > r) x = r;
		if (x < -r) x = -r;
		// ∀x∊[-1;1],
		// Math.acos(x) = arccos(x) = the unique y∊[0;π] such that cos(y) = x
		var theta = Math.PI / 2 - Math.acos( y / r);

		// with prime meridian at z = 0, x = R, y = 0, to north, negative z to the east hemishphere.
		return {long: phi, lat: theta, r};
	}

	long2tile (lon, zoom1) {
	    var tt = Number(lon);
	    return (Math.floor((tt + 180) / 360 * Math.pow(2, zoom1)));
	}

	lat2tile (lat, zoom2) {
	    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180)
	        + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom2)));
	}

	tile2long (x, z) {
	    return (x / Math.pow(2, z) * 360 - 180);
	 }

	tile2lat (y, z) {
	    var n=Math.PI - 2 * Math.PI * y / Math.pow(2, z);
	    return (180 / Math.PI * Math.atan( 0.5 *( Math.exp(n) - Math.exp(-n))));
	}

	/**Get tile url of OSM X/Y/Z.
	 * url = 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 */
	urlTile (x, y, z) {
	    return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
	}

	/**If xyz is not in tiles, add new xyz to tiles.
	 * @param {tilesKeeper} tkeeper {z: {x0: {y00: world00, ...}, {x1: {y10: world10, ...}, ...}}}
	 * @param {vec3} dir [x, y, z] dir
	 * @param {vec3} c0 [x, y, z] center / eye
	 * @param {float} a radius
	 * @return {object} tiles
	 */
	collectOsmTiles (tkeeper, dir, c0, a) {
		dir = this.normalize(dir, [c0.x, c0.y, c0.z]);
		var p = this.castPosition ([c0.x, c0.y, c0.z], dir, a);
		if (p) {
			var longlat = this.cart2rad(p);
			longlat.long *= 180 / Math.PI;
			longlat.lat *= 180 / Math.PI;
			var osmz = this.stepz(p.w, a);
			var xyz = {
				x: this.long2tile(longlat.long, osmz),
				y: this.lat2tile(longlat.lat, osmz),
				z: osmz };

			if (this.verbose >= 5) {
				console.log('dir, p, long-lat, xyz', dir, p, longlat, xyz);
			}

			tkeeper.setile(xyz, {
					lon: longlat.long, lat: longlat.lat,
					geom: (worldCenter) => {
						if (worldCenter === undefined)
							worldCenter = [0, 0, 0];
						// FIXME What's w & h?
						var g = new THREE.PlaneBufferGeometry( 500, 500 );
						g.rotateX(-Math.PI * 0.5);
						g.rotateY(Math.PI * 0.5);
						g.applyMatrix( new THREE.Matrix4()
							.makeTranslation(worldCenter[0], worldCenter[1], worldCenter[2]) );
						return g;
					} });
		}
		return tkeeper;
	}

	/**Set img (#id)'s src as tile of OSM X/Y/Z.
	 * src = 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
	 * @param {string} id img id
	 * @param {object} xyz {x, y, z}
	 */
	loadImgTile(id, xyz) {
		// map.addMapTiles('https://a.tile.openstreetmap.org/{z}/{x}/{y}.png');
	    // var url = `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
	    var url = urlTile(xyz.x, xyz.y, xyz.z);
	    document.querySelector(`#${id}`).src = url;
	}

	/**Find out sphere intersect point with ray.
	  * @param {vec3} eye camera position in world
	  * @param {vec3} dir direction norm
	  * @param {float} r sphere radius
	  * @param {vec3} c0 shpere center position in world
	  * @return {object} (x, y, z, w): intersect position in world, w = distance from eye
	 */
	castPosition(eye, dir, r, c0) {
		if (c0 === undefined) {
			c0 = [0, 0, 0];
		}

		var d = this.distSphere(eye, dir, r, c0);
		if (d < 0)
			return
		else {
			var p = [d * dir[0], d * dir[1], d * dir[2]];
			// return [p[0] + eye[0], p[1] + eye[1], p[2] + eye[2]];
			return {x: p[0] + eye[0], y: p[1] + eye[1], z: p[2] + eye[2], w: d};
		}
	}

	 /**Vector distance  to orignal point.
	  * See https://en.wikipedia.org/wiki/Line%E2%80%93sphere_intersection
	  * @param {vec3} eye camera position in world
	  * @param {vec3} l direction norm
	  * @param {float} r sphere radius
	  * @param {vec3} cent shpere center position in world
	  * @return distance
	  */
	distSphere( eye, l, r, cent ) {
		 // e = o - c, where o = eye, c = cent
		 var e = [eye[0] - cent[0], eye[1] - cent[1], eye[2] - cent[2]];
		 // delta = (l . (o - c))^2 + r^2 - |(o - c)|^2
		 var delta = Math.pow( this.dot( l, e ), 2. ) + Math.pow( r, 2. ) - this.dot( e, e );
		 if (delta < 0.) return delta;
		 // d = - u.e +/- delta^0.5
		 delta = Math.pow( delta, 0.5 );
		 return Math.min( - this.dot( l, e ) + delta, - this.dot( l, e ) - delta );
	 }

	/**Find OMS zoom level according to distance.
	 * @param {number} d distance
	 * @param {number} a
	 * @return {int} z */
	stepz(d, a) {
		// z ∊ [0, 19), see https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames#Zoom_levels
		// d = 2a, z = 0
		// d = a,  z = 1
		// d = a / 2, z = 2
		// ...
		// d = 0,  z = 19
		if (d <= 1.0e-15) { return 19; }
		else {
			var z = Math.floor(Math.log2(a * 2 / d));
			console.log ('d, a, z', d, a, z);
			return z;
		}
	}

	/**Normalize vector v - v0
	 * @param {vec3} v
	 * @param {vec3} v0
	 * @return {vec3} norm [x, y, z]
	 */
	normalize( v, v0 ) {
		if ( v0 === undefined )
			v0 = [0, 0, 0];

		v = [v[0] - v0[0], v[1] - v0[1], v[2] - v0[2]];
		var mag = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
		if (mag - 0. < 0.0000000001) {
			console.warn('magnitude is too small to find norm: ', v, v0);
			return [0, 0, 1];
		}
		else {
			return [v[0] / mag, v[1] / mag, v[2] / mag];
		}
	}

	dot( v, u ) {
		if (!Array.isArray(v))
			v = toVec3(v);
		if (!Array.isArray(u))
			u = toVec3(u);

		var s = 0;
		for (var ix = 0; ix < v.length; ix ++) {
			s += v[ix] * u[ix];
		}
		return s;
	}

	toVec3(obj) {
		var a = [obj.x, obj.y];
		if (obj.z)
			a.push(obj.z);
		if (obj.w)
			a.push(obj.w);
		return a;
	}

	/**Step through all tile girds, then change longitude / latitude to Cartesian,
	 * with prime meridian at z = 0, x = R, y = 0, to north, negative z to the east hemishphere.
	 * @param {number} OSM Z level
	 * @param {number} a model's radius
	 * see https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections
	 * @return {Float32Array} the verices buffer
	 * For z = 6, the closest points include:<pre>
	 	left
		2973: -48.77, 48.93, 495.20
		2976: -49.01, 0, 497.59
		2979: -48.77, -48.93, 495.20

		center
		3168: 3.0e-14, 0, 500

		right
		3549: 97.08, 48.93, 488.04
		3552: 97.55, 0, 490.39
		3555: 97.08, -48.93, 488.04</pre>
	 */
	osmGlobeTiles (zoom, a) {
		// X goes from 0 (left edge is 180 °W) to 2zoom − 1 (right edge is 180 °E)<br>
		// Y goes from 0 (top edge is 85.0511 °N) to 2zoom − 1 (bottom edge is 85.0511 °S) in a Mercator projection
		zoom = Math.min(zoom, 8);
		var max = Math.pow(2, zoom);
		var grids = new Float32Array( max * max * 3 );
		for (var ix = 0; ix < max; ix++) {
			var long = tile2long(ix, zoom);
			long *= Math.PI / 180;
			for (var iy = 0; iy < max; iy++) {
				var lat = tile2lat(iy, zoom);
				lat *= Math.PI / 180;
				// var r = a * Math.cos(lat);
				// var x = r * Math.cos(long);
				// var y = a * Math.sin(lat);
				// var z = -r * Math.sin(long);
				var wld = rad2cart(long, lat, a);
				var idx = (ix * max + iy) * 3;
				grids[idx] = wld.x;
				grids[idx + 1] = wld.y;
				grids[idx + 2] = wld.z;
		    }
		}
		if (debug) console.log(`osm tiles (z = ${zoom})`, grids);
		return grids;
	}

	/**Build points buffer, convert all tile grid into world position.
	 * @param {number} z zoom level of OSM XYZ
	 * @param {number} a a of Mercator Projection, see
	 * <a href=https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections'>Mercator Projection</a>
	 * @return {THREE.Points} points
	 */
	pointsBuff (z, a) {
		if (a === undefined)
			a = 500;
		var step = 10;

		var points = osmGlobeTiles(z, a); // a = 500
		var geometry = new THREE.BufferGeometry();
		geometry.addAttribute( 'position', new THREE.BufferAttribute( points, 3 ) );

		var grid = new THREE.Points(geometry,
				new THREE.PointsMaterial( { color: 0xffffff, size: 3 } ) );
		return grid;
	}
}
const osmUtils = new OsmUtils(5); // verbose = 5
