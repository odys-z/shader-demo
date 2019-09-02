
// function toxy() {
//     var zoom = document.forms.Form1.zoom.value;
//     var vlong = document.forms.Form1.long.value;
//     var vlat  = document.forms.Form1.lat.value;
//     // document.forms.Form1.xlong.value = long2tile(vlong,zoom);
//     // document.forms.Form1.ylat.value = lat2tile(vlat,zoom);
//     var x = long2tile(vlong, zoom);
//     var y = lat2tile(vlat, zoom);
//     document.forms.Form1.xlong.value = x;
//     document.forms.Form1.ylat.value = y;
//
//     // ody
//     loadTile('tile', x, y, zoom);
// }

// function tolonlat(vzoom) {
//     vzoom = document.forms.Form1.zoom.value;
//     var xlong = 3.12;
//     xlong = document.forms.Form1.xlong.value;
//     var ylat  = document.forms.Form1.ylat.value;
//     document.forms.Form1.long.value=xlong = tile2long(xlong,vzoom);
//     document.forms.Form1.lat.value=ylat = tile2lat(ylat,vzoom);
// }

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
  * @param {vec3} l direction norm
  * @param {float} r sphere radius
  * @param {vec3} cent shpere center position in world
  * @return intersect position
 */
function castPosition (eye, dir, r, cent) {
	if (cent === undefined) {
		cent = [0, 0, 0];
	}

	var d = distSphere(eye, dir, r, cent);
	if (d < 0)
		return
	else {
		var p = [d * dir[0], d * dir[1], d * dir[2]];
		return [p[0] + eye[0], p[1] + eye[1], p[2] + eye[2]];
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
	 var e = eye - cent;
	 // delta = (l . (o - c))^2 + r^2 - |(o - c)|^2
	 var delta = Math.pow( dot( l, e ), 2. ) + Math.pow( r, 2. ) - Math.dot(e, e);
	 if (delta < 0.) return delta;
	 // d = - u.e +/- delta^0.5
	 delta = Math.pow( delta, 0.5 );
	 return Maht.min( - Math.dot( l, e ) + delta, - Math.dot( l, e ) - delta );
 }



// function findTiles(z, id) {
//     // X goes from 0 (left edge is 180 °W) to 2zoom − 1 (right edge is 180 °E)<br>
//     // Y goes from 0 (top edge is 85.0511 °N) to 2zoom − 1 (bottom edge is 85.0511 °S) in a Mercator projection
//     var max = Math.exp(2, z) - 1;
//     var grids = [];
//     for (var x = 0; x < max; x++) {
//         lats = [];
//         for (var y = 0; y < max; y++) {
//             lats.push([tile2long(x, z), tile2lat(y, z)]);
//         }
//         grids.push(lats);
//     }
//
//     document.querySelector(`#${id}`).value = grids.toString();
//     console.log(grids);
//     return grids;
// }

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
