
/**Slightly modified from https://threejs.org/examples/jsm/misc/GPUComputationRenderer.js,
 * by <a href='https://github.com/yomboprime'>yomboprime</a>:<br>
 * 1. used for plain old js style - include three.min.js;<br>
 * 2. user can provide a vertex shader;<br>
 * 3. rendering target(s) are PlaneGeometry, with vertex segments are also the vertices counts
 * - each vertex is rendered as gl.POINTS, served as raycasting directions.
 * Those points rendering results are collected in the target texture(s);<br>
 *
 * @author odys-z https://odys-z.github.io
 * @see <a href='https://threejs.org/examples/?q=birds#webgl_gpgpu_birds'>three.js example</a>
 *
 * GPUComputationRenderer, based on SimulationRenderer by zz85
 *
 * The GPUComputationRenderer uses the concept of variables. These variables are RGBA float textures that hold 4 floats
 * for each compute element (texel)
 *
 * Each variable has a fragment shader that defines the computation made to obtain the variable in question.
 * You can use as many variables you need, and make dependencies so you can use textures of other variables in the shader
 * (the sampler uniforms are added automatically) Most of the variables will need themselves as dependency.
 *
 * The renderer has actually two render targets per variable, to make ping-pong. Textures from the current frame are used
 * as inputs to render the textures of the next frame.
 *
 * The render targets of the variables can be used as input textures for your visualization shaders.
 *
 * Variable names should be valid identifiers and should not collide with THREE GLSL used identifiers.
 * a common approach could be to use 'texture' prefixing the variable name; i.e texturePosition, textureVelocity...
 *
 * The size of the computation (sizeX * sizeY) is defined as 'resolution' automatically in the shader. For example:
 * #DEFINE resolution vec2( 1024.0, 1024.0 )
 *
 * -------------
  */

var GPUComputationRenderer = function ( renderer ) {
    /**Texture size
     * var sizeX, sizeY;
    this.texsize = {x: 2, y: 2};
    var texsize = this.texsize;
     */
	this.variables = [];
	this.currentTextureIndex = 0;

    // created by init()
	var scene = new THREE.Scene();
    var camera; //, mesh;

	var passThruUniforms = {
		inputex: { value: null }
	};

    var shfrag = getPassThroughFragmentShader();
	var passThruMat = createShaderMaterial( {x: 8, y: 8}, {frag: shfrag}, passThruUniforms );

    /**Add a variable needing GPU computation
     * @param {string} variableName
     * @param {object} shaders v-f shader {vert, frag}
     * @param {object} texsize texutre size, {x, y}
     * @param {THREE.DataTexture} initValuTex, usally created by GPUComputationRenderer.createTexture()
     * If undefined, will be created (TODO: not neccessary)
     * @return {object} variable
     */
	this.addVariable = function ( variableName, shaders, texsize, initValuTex ) {
        if (initValuTex === undefined)
		    initValuTex = this.createTexture(texsize);
		var material = this.createShaderMaterial(texsize, shaders );

		var variable = {
			name: variableName,
			initialValueTexture: initValuTex,
			material: material,
			renderTargets: [],
			wrapS: null,
			wrapT: null,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter,
            texsize: texsize    // output texture size
		};

		this.variables.push( variable );
		return variable;
	};

    /**initialize the GPU computation
     * @param {object} casto {w, h, f} the casting plane geometry's wh size and x, y segements same as textsize.
     * f is the camera focus.
     * @param {THREE.Camera} cam camera, optinal
     */
	this.init = function (casto, cam) {
		if ( ! renderer.extensions.get( "OES_texture_float" ) &&
			 ! renderer.capabilities.isWebGL2 ) {
			return "No OES_texture_float support for float textures.";
		}

		if ( renderer.capabilities.maxVertexTextures === 0 ) {
			return "No support for vertex shader textures.";
		}

        // TODO add some schema for error debugging
        // target culled out resulting no shader executed.
        if (cam === undefined) {
            camera = new THREE.Camera();
        }
        else {
            camera = cam;
			console.log('camera', camera.matrixWorld, camera.matrix);
        }

		for ( var i = 0; i < this.variables.length; i ++ ) {
			var arg = this.variables[ i ];
            var x = arg.texsize.x;
            var y = arg.texsize.y;

        	// arg.mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( casto.w, casto.h, x, y ), arg.material );
            arg.mesh = this.castingPointsBuff('to', 'from', 'up', arg.material);
            var dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            arg.mesh.translateOnAxis(dir, casto.f);
            // camera.attach(arg.mesh);
        	scene.add( arg.mesh );

			// Creates rendertargets and initialize them with input texture
			arg.renderTargets[ 0 ] = this.createRenderTarget( x, y,
                arg.wrapS, arg.wrapT, arg.minFilter, arg.magFilter );
			arg.renderTargets[ 1 ] = this.createRenderTarget( x, y,
                arg.wrapS, arg.wrapT, arg.minFilter, arg.magFilter );
			this.renderTexture(arg.mesh, arg.initialValueTexture, arg.renderTargets[ 0 ] );
			this.renderTexture(arg.mesh, arg.initialValueTexture, arg.renderTargets[ 1 ] );

			// Adds dependencies uniforms to the ShaderMaterial
			var material = arg.material;
			var uniforms = material.uniforms;
		}
		this.currentTextureIndex = 0;
		return null;
	};

	this.compute = function () {
		var currentTextureIndex = this.currentTextureIndex;
		var nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;

		for ( var i = 0, il = this.variables.length; i < il; i ++ ) {
			// Performs the computation for this arg
			var arg = this.variables[ i ];
			this.doRenderTarget(arg.mesh, arg.material, arg.renderTargets[ nextTextureIndex ] );
		}
		this.currentTextureIndex = nextTextureIndex;
	};

	this.getCurrentRenderTarget = function ( cmptVar ) {
        console.log('currentTextureIndex', cmptVar.name, this.currentTextureIndex);
		return cmptVar.renderTargets[ this.currentTextureIndex ];
	};

	this.getAlternateRenderTarget = function ( cmpVar ) {
		return cmpVar.renderTargets[ this.currentTextureIndex === 0 ? 1 : 0 ];
	};

	function addResolutionDefine(texsize, materialShader ) {
        console.log('resolution', texsize);
		materialShader.defines.resolution
            = 'vec2( ' + texsize.x.toFixed( 1 ) + ', ' + texsize.y.toFixed( 1 ) + " )";
		console.log(materialShader.defines.resolution);
	}
	this.addResolutionDefine = addResolutionDefine;

	// The following functions can be used to compute things manually
	function createShaderMaterial(texsize, shaders, uniforms ) {
		uniforms = uniforms || {};
		var material = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: typeof shaders.vert === 'string' ? shaders.vert : getPassThroughVertexShader(),
			fragmentShader: typeof shaders.frag === 'string' ? shaders.frag : getPassThroughFragmentShader()
		} );
		addResolutionDefine(texsize, material );
		return material;
	}

	this.createShaderMaterial = createShaderMaterial;

	this.createRenderTarget = function ( sizeXTexture, sizeYTexture, wrapS, wrapT, minFilter, magFilter ) {
		sizeXTexture = sizeXTexture || sizeX;
		sizeYTexture = sizeYTexture || sizeY;

		wrapS = wrapS || ClampToEdgeWrapping;
		wrapT = wrapT || ClampToEdgeWrapping;

		minFilter = minFilter || NearestFilter;
		magFilter = magFilter || NearestFilter;

		var renderTarget = new THREE.WebGLRenderTarget( sizeXTexture, sizeYTexture, {
			wrapS: wrapS,
			wrapT: wrapT,
			minFilter: minFilter,
			magFilter: magFilter,
			format: THREE.RGBAFormat,
			type: ( /(iPad|iPhone|iPod)/g.test( navigator.userAgent ) ) ? THREE.HalfFloatType : THREE.FloatType,
			stencilBuffer: false,
			depthBuffer: false
		} );

		return renderTarget;
	};

	this.createTexture = function (texsize) {
		var a = new Float32Array( texsize.x * texsize.y * 4 );
		var texture = new THREE.DataTexture( a, texsize.x, texsize.y, THREE.RGBAFormat, THREE.FloatType );
		texture.needsUpdate = true;
		return texture;
	};

	/** Takes a texture, and render out in rendertarget
     * @param {THREE.Mesh} mesh mesh to be casted to
	 * @param {THREE.Texuture} input Texture
	 * @param {THREE.Texuture} output RenderTarget
     */
	this.renderTexture = function (mesh, input, output ) {
		passThruUniforms.inputex.value = input;
		this.doRenderTarget( mesh, passThruMat, output );
		passThruUniforms.inputex.value = null;
	};

	this.doRenderTarget = function ( mesh, material, output ) {
		var currentRenderTarget = renderer.getRenderTarget();

		mesh.material = material;
		renderer.setRenderTarget( output );
		renderer.render( scene, camera );
		mesh.material = passThruMat;

		renderer.setRenderTarget( currentRenderTarget );
	};

    /**Get casted target by name
     * @param {string}  varname
     * @return {THREE.Mesh | THREE.Points}
     */
    this.castarget = function (varname) {
        if (typeof varname === 'string') {
            for (var x = 0; x < this.variables.length; x++) {
                if (this.variables[x].name === varname)
                    return this.variables[x].mesh;
            }
        }
        else if (typeof varname === 'number') {
            return this.variables[varname].mesh;
        }
        else if (this.variables.length > 0) {
            return this.variables[0].mesh;
        }
    }

    this.texsize = function (varname) {
        if (typeof varname === 'string') {
            for (var x = 0; x < this.variables.length; x++) {
                if (this.variables[x].name === varname)
                    return this.variables[x].texsize;
            }
        }
        else if (typeof varname === 'number') {
            return this.variables[varname].texsize;
        }
        else if (this.variables.length > 0) {
            return this.variables[0].texsize;
        }
    };

	/**
	 * @param {THREE.Vector3} to to target, position in world ,
	 * @param {THREE.Vector3} from from eye, position in world
	 * @param {THREE.Vector3} up
	 * @param {THREE.Materail} material
	 */
	this.castingPointsBuff = function ( to, from, up, materail ) {
		var w = 4;
		var h = 4;
		var a = 500;
		var size = {x: 7, y: 7};

		// var grids = new Float32Array( w * h * 3 );
		// for (var iw = 0; iw < w; iw++) {
		// 	var px = (iw - w / 2 ) * (size.x / w);
		// 	for (var ih = 0; ih < h; ih++) {
		// 		var py = (ih - h / 2 ) * (size.y / h);
		// 		var idx = (iw * w + ih) * 3;
		// 		grids[idx] = px;
		// 		grids[idx + 1] = py;
		// 		grids[idx + 2] = 400;
		// 	}
		// }
		//
		// var geometry = new THREE.BufferGeometry();
		// geometry.addAttribute( 'position', new THREE.BufferAttribute( grids, 3 ) );
        // console.log('casting points: ', geometry);
		// return new THREE.Mesh( geometry, materail );
		var m = new THREE.Mesh( new THREE.PlaneBufferGeometry( w, h, size.x, size.y ), materail );
        console.log('casting points: ', m.geometry);
		return m;
	};

	// Shaders
	function getPassThroughVertexShader() {
		return	`
        void main()	{
			gl_Position = vec4( position, 1.0 );
			// gl_Position = vec4( normalize(position) + 0.5, 1.0 );
		}`;
	}

	function getPassThroughFragmentShader() {
		return `
        // uniform sampler2D inputex;
		void main() {
			vec2 uv = gl_FragCoord.xy / resolution.xy;
			// gl_FragColor = texture2D( inputex, uv );
            gl_FragColor = vec4(0.2);
		}`;
	}
};

// export { GPUComputationRenderer };
