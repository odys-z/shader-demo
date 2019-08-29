
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
     */
    this.texsize = {x: 2, y: 2};
    var texsize = this.texsize;
	this.variables = [];
	this.currentTextureIndex = 0;

    // created by init()
	var scene = new THREE.Scene();
    var camera = {}, mesh = {};
	// var camera = new THREE.Camera();
	// camera.position.z = 1;
	// var mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2 ), passThruMat );
	// scene.add( mesh );

	var passThruUniforms = {
		inputex: { value: null }
	};

    var shfrag = getPassThroughFragmentShader();
	var passThruMat = createShaderMaterial( {frag: shfrag}, passThruUniforms );

    /**Add a variable needing GPU computation
     * @param {string} variableName
     * @param {object} shaders {vert, frag}
     * @param {THREE.DataTexture} initialValueTexture, usally created by GPUComputationRenderer.createTexture()
     * @return {object} variable
     */
	this.addVariable = function ( variableName, shaders, initialValueTexture ) {
		var material = this.createShaderMaterial( shaders );

		var variable = {
			name: variableName,
			initialValueTexture: initialValueTexture,
			material: material,
			dependencies: null,
			renderTargets: [],
			wrapS: null,
			wrapT: null,
			minFilter: THREE.NearestFilter,
			magFilter: THREE.NearestFilter
		};

		this.variables.push( variable );
		return variable;
	};

	this.setVariableDependencies = function ( variable, dependencies ) {
		variable.dependencies = dependencies;
	};

    /**initialize the GPU computation
     * @param {object} casto {w, h, x, y} the casting plane geometry's wh size and x, y segements
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

        this.texsize.x = casto.x;
        this.texsize.y = casto.y;
        texsize = this.texsize;

        // TODO add some schema for error debugging
        // target culled out resulting no shader executed.
        if (cam === undefined) {
            camera = new THREE.Camera();
            camera.position.z = casto.h;
        }
        else {
            camera = cam;
        }
        // camera = new THREE.Camera();
        // camera.position.z = 1;

    	mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( texsize.x, texsize.y ), passThruMat );
    	// mesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( casto.w, casto.h, casto.x, casto.y ), passThruMat );
    	// var geometry = new THREE.PlaneBufferGeometry( casto.w, casto.h, casto.x, casto.y );
		// mesh = new THREE.Points(geometry,
		// 			new THREE.PointsMaterial( { color: 0xffffff, size: 3 } ) );
    	scene.add( mesh );

		for ( var i = 0; i < this.variables.length; i ++ ) {
			var arg = this.variables[ i ];

			// Creates rendertargets and initialize them with input texture
			arg.renderTargets[ 0 ] = this.createRenderTarget( this.texsize.x, this.texsize.y,
                arg.wrapS, arg.wrapT, arg.minFilter, arg.magFilter );
			arg.renderTargets[ 1 ] = this.createRenderTarget( this.texsize.x, this.texsize.y,
                arg.wrapS, arg.wrapT, arg.minFilter, arg.magFilter );
			this.renderTexture( arg.initialValueTexture, arg.renderTargets[ 0 ] );
			this.renderTexture( arg.initialValueTexture, arg.renderTargets[ 1 ] );

			// Adds dependencies uniforms to the ShaderMaterial
			var material = arg.material;
			var uniforms = material.uniforms;
			if ( arg.dependencies !== null ) {
				for ( var d = 0; d < arg.dependencies.length; d ++ ) {
					var depVar = arg.dependencies[ d ];
					if ( depVar.name !== arg.name ) {
						// Checks if variable exists
						var found = false;
						for ( var j = 0; j < this.variables.length; j ++ ) {
							if ( depVar.name === this.variables[ j ].name ) {
								found = true;
								break;
							}
						}

						if ( ! found ) {
							return "Variable dependency not found. Variable=" + arg.name + ", dependency=" + depVar.name;
						}
					}

					uniforms[ depVar.name ] = { value: null };
					material.fragmentShader = "\nuniform sampler2D " + depVar.name + ";\n" + material.fragmentShader;
				}
			}
		}
		this.currentTextureIndex = 0;
		return null;
	};

	this.compute = function () {
		var currentTextureIndex = this.currentTextureIndex;
		var nextTextureIndex = this.currentTextureIndex === 0 ? 1 : 0;

		for ( var i = 0, il = this.variables.length; i < il; i ++ ) {
			var arg = this.variables[ i ];
			// Sets texture dependencies uniforms
			if ( arg.dependencies !== null ) {
				var uniforms = arg.material.uniforms;
				for ( var d = 0, dl = arg.dependencies.length; d < dl; d ++ ) {
					var depVar = arg.dependencies[ d ];
					uniforms[ depVar.name ].value = depVar.renderTargets[ currentTextureIndex ].texture;
				}
			}
			// Performs the computation for this arg
			this.doRenderTarget( arg.material, arg.renderTargets[ nextTextureIndex ] );
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

	function addResolutionDefine( materialShader ) {
        console.log('resolution', texsize);
		materialShader.defines.resolution
            = 'vec2( ' + texsize.x.toFixed( 1 ) + ', ' + texsize.y.toFixed( 1 ) + " )";
	}
	this.addResolutionDefine = addResolutionDefine;

	// The following functions can be used to compute things manually
	function createShaderMaterial( shaders, uniforms ) {
		uniforms = uniforms || {};
		var material = new THREE.ShaderMaterial( {
			uniforms: uniforms,
			vertexShader: typeof shaders.vert === 'string' ? shaders.vert : getPassThroughVertexShader(),
			fragmentShader: shaders.frag
			// vertexShader: getPassThroughVertexShader(),
			// fragmentShader: getPassThroughFragmentShader()
		} );
		addResolutionDefine( material );
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
	 * @param {THREE.Texuture} input Texture
	 * @param {THREE.Texuture} output RenderTarget
     */
	this.renderTexture = function ( input, output ) {
		passThruUniforms.inputex.value = input;
		this.doRenderTarget( passThruMat, output );
		passThruUniforms.inputex.value = null;
	};

	this.doRenderTarget = function ( material, output ) {
		var currentRenderTarget = renderer.getRenderTarget();

		mesh.material = material;
		renderer.setRenderTarget( output );
		renderer.render( scene, camera );
		mesh.material = passThruMat;

		renderer.setRenderTarget( currentRenderTarget );
	};

    this.castarget = function () {
        return mesh;
    }

	// Shaders
	function getPassThroughVertexShader() {
		return	`
        void main()	{
			gl_Position = vec4( position, 1.0 );
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
