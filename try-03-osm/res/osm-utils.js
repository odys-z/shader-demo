
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
