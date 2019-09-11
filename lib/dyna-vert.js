/** @deprecated */

/** */
const rad_degree = pi / 180;

/** Create a circle mesh according to geo json data (gson).
 * <p> see
 * <a href='https://threejs.org/docs/#api/en/extras/core/Shape'>Three.js ref</a>
 * </p>
 * @param {object} opts geo json
 * opts.cnt path count;<br>
 * opts.materail e.g. THREE.ShaderMaterial<br>
 * @return plane mesh
 * */
function circle(opts) {
	float w, h; // width, height in world
	var cnt = opts !== undefined && opts.cnt > 0 ? opts.cnt : 12;
	var verts = [];
	for (var ix = 0; ix < cnt; ix++) {
		verts.push( new THREE.Vector2(Math.sin( ix * rad_degree ), Math.cos( ix * rad_degree )));
	}

	var shape =  new THREE.shape(verts);
	var geometry = new THREE.ExtrudeGeometry( shape, extrudeSettings );
	var mesh = new THREE.Mesh( geometry, opts !== undefined && opts.material != undefined ?
		opts.material : new THREE.MeshPhongMaterial() );
	return mesh;
}
