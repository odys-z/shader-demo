/**Convert long-lat to world position in Cartesian.
 * @param {number} long longitude in radians ( degree *= pi / 180)
 * @param {number} lat latitude in radians ( degree *= pi / 180)
 * @param {number} a a of Mercator Projection, see
 * <a href=https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections'>Mercator Projection</a>
 * @return {object} x, y, z in world
 */
function rad2cart(long, lat, a) {
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
function cart2rad(p, c0) {
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

function long2tile(lon, zoom1) {
    tt = Number(lon);
    return (Math.floor((tt + 180) / 360 * Math.pow(2, zoom1)));
}

function lat2tile(lat, zoom2)  {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180)
        + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom2)));
}

function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
 }

function tile2lat(y, z) {
    var n=Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan( 0.5 *( Math.exp(n) - Math.exp(-n))));
}

/**Get tile url of OSM X/Y/Z.
 * url = 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
 * @param {number} x
 * @param {number} y
 * @param {number} z
 */
function urlTile(x, y, z) {
    return `https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`;
}

/**If xyz is not in tiles, add new xyz to tiles.
 * @param {object} tiles {z: {x0: {y00: world00, ...}, {x1: {y10: world10, ...}, ...}}}
 * @param {vec3} dir [x, y, z] dir
 * @param {vec3} c0 [x, y, z] center / eye
 * @return {object} tiles {z: {x: {y: {lon, lat}}}}
 */
function castOsmTiles(tiles, dir, c0, a) {
	dir = normalize(dir, [c0.x, c0.y, c0.z]);
	var p = castPosition ([c0.x, c0.y, c0.z], dir, a);
	if (p) {
		var longlat = cart2rad(p);
		longlat.long *= 180 / Math.PI;
		longlat.lat *= 180 / Math.PI;
		osmz = stepz(p.w, a);
		var xyz = {
			x: long2tile(longlat.long, osmz),
			y: lat2tile(longlat.lat, osmz),
			z: osmz };

		console.log('dir, p, long-lat, xyz', dir, p, longlat, xyz);
		if (tiles === undefined)
			tiles = {};

		if (tiles[xyz.z] === undefined) {
			tiles[xyz.z] = {};
		}
		if (tiles[xyz.z][xyz.x] === undefined) {
			tiles[xyz.z][xyz.x] = {};
		}
		if (tiles[xyz.z][xyz.x][xyz.y] === undefined) {
			tiles[xyz.z][xyz.x][xyz.y] = {};
		}
		tiles[xyz.z][xyz.x][xyz.y] = {
			lon: longlat.long,
			lat: longlat.lat
		}
	}
	return tiles;
}

/**Set img (#id)'s src as tile of OSM X/Y/Z.
 * src = 'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png'
 * @param {string} id img id
 * @param {object} xyz {x, y, z}
 */
function loadImgTile(id, xyz) {
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
function castPosition (eye, dir, r, c0) {
	if (c0 === undefined) {
		c0 = [0, 0, 0];
	}

	var d = distSphere(eye, dir, r, c0);
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
function distSphere( eye, l, r, cent ) {
	 // e = o - c, where o = eye, c = cent
	 var e = [eye[0] - cent[0], eye[1] - cent[1], eye[2] - cent[2]];
	 // delta = (l . (o - c))^2 + r^2 - |(o - c)|^2
	 var delta = Math.pow( dot( l, e ), 2. ) + Math.pow( r, 2. ) - dot(e, e);
	 if (delta < 0.) return delta;
	 // d = - u.e +/- delta^0.5
	 delta = Math.pow( delta, 0.5 );
	 return Math.min( - dot( l, e ) + delta, - dot( l, e ) - delta );
 }

/**Find OMS zoom level according to distance.
 * @param {number} d distance
 * @param {number} a
 * @return {int} z */
function stepz(d, a) {
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
/**Normalize vector
 * @param {vec3} v
 * @param {vec3} v0
 * @return {vec3} norm [x, y, z]
 */
function normalize( v, v0 ) {
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

function dot( v, u ) {
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

function toVec3(obj) {
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
function osmGlobeTiles (zoom, a) {
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
	console.log(`osm tiles (z = ${zoom})`, grids);
	return grids;
}

/**Build points buffer, convert all tile grid into world position.
 * @param {number} z zoom level of OSM XYZ
 * @param {number} a a of Mercator Projection, see
 * <a href=https://en.wikipedia.org/wiki/Mercator_projection#Cylindrical_projections'>Mercator Projection</a>
 * @return {THREE.Points} points
 */
function pointsBuff(z, a) {
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

const fragFindTile = `
	varying vec3 P;
	uniform sampler2D tex0;
	uniform sampler2D tex1;

	void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
		// fragColor = vec4(normalize(P.xyz), abs(cos(iTime) * .2 + .8));
	}

	void main() {
		mainImage(gl_FragColor, gl_FragCoord.xy);
	}
`;

const vertFindTile = `
	uniform vec3 camPos;

	varying vec3 I;
	varying vec3 P;
	varying vec3 n;
	varying vec4 cent;

	void main() {
		n = normal;

		// gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
		vec4 worldPosition = modelMatrix * vec4(position, 1.0);

		P = worldPosition.xyz;
		I = normalize(camPos - worldPosition.xyz);

		cent = modelMatrix * vec4(0., 0., 0., 1.);

		gl_Position = projectionMatrix * viewMatrix * worldPosition;
	}
`;
