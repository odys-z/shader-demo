
function vmatch(tag) {
  const canvas = document.querySelector('#' + tag);
  const renderer = new THREE.WebGLRenderer({canvas});

  const fov = 75;
  const aspect = 2;  // the canvas default
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  const scene = new THREE.Scene();
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const fragmentShader_ = `
  #include <common>

  uniform vec3 iResolution;
  uniform vec2 iMouse;
  uniform float iTime;
  uniform sampler2D iChannel0;

  // By Daedelus: https://www.shadertoy.com/user/Daedelus
  // license: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
  #define TIMESCALE 0.25
  #define TILES 8
  #define COLOR 0.7, 1.6, 2.8

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
    vec2 uv = fragCoord.xy / iResolution.xy;
    uv.x *= iResolution.x / iResolution.y;

    vec4 noise = texture2D(iChannel0, floor(uv * float(TILES)) / float(TILES));
    float p = 1.0 - mod(noise.r + noise.g + noise.b + iTime * float(TIMESCALE), 1.0);
    p = min(max(p * 3.0 - 1.8, 0.1), 2.0);

    vec2 r = mod(uv * float(TILES), 1.0);
    r = vec2(pow(r.x - 0.5, 2.0), pow(r.y - 0.5, 2.0));
    p *= 1.0 - pow(min(1.0, 12.0 * dot(r, r)), 2.0);

    fragColor = vec4(COLOR, 1.0) * p;
  }

  varying vec2 vUv;

  void main() {
    mainImage(gl_FragColor, vUv * iResolution.xy);
  }
  `;

  const fragmentShader = `
  uniform vec3 iResolution;
  uniform float iTime;
  uniform vec2 iMouse;
  uniform sampler2D iChannel0;

  uniform	vec3 light_pos1;
  uniform vec3 light_color1;

  const int max_iterations = 512;
  const float stop_threshold = 0.001;
  const float grad_step = 0.02;
  const float clip_far = 10000.0;

  // math
  const float PI = 3.14159265359;
  const float DEG_TO_RAD = PI / 180.0;

  float sdSphere( vec3 pos, float r ) {
  	return length( pos ) - r;
  }

  // get distance in the world
  float dist_field( vec3 p ) {
      float d1 = sdSphere( p, 0.86 );
      return d1;
  }

  // get gradient in the world
  vec3 gradient( vec3 pos ) {
  	const vec3 dx = vec3( grad_step, 0.0, 0.0 );
  	const vec3 dy = vec3( 0.0, grad_step, 0.0 );
  	const vec3 dz = vec3( 0.0, 0.0, grad_step );
  	return normalize (
  		vec3(
  			dist_field( pos + dx ) - dist_field( pos - dx ),
  			dist_field( pos + dy ) - dist_field( pos - dy ),
  			dist_field( pos + dz ) - dist_field( pos - dz )
  		)
  	);
  }

  // camera rotation : pitch, yaw
  mat3 rotationXY( vec2 angle ) {
  	vec2 c = cos( angle );
  	vec2 s = sin( angle );

  	return mat3(
  		c.y      ,  0.0, -s.y,
  		s.y * s.x,  c.x,  c.y * s.x,
  		s.y * c.x, -s.x,  c.y * c.x
  	);
  }

  // get ray direction
  vec3 ray_dir( float fov, vec2 size, vec2 pos ) {
  	vec2 xy = pos - size * 0.5;

  	float cot_half_fov = tan( ( 90.0 - fov * 0.5 ) * DEG_TO_RAD );
  	float z = size.y * 0.5 * cot_half_fov;

  	return normalize( vec3( xy, -z ) );
  }

  // ray marching
  bool ray_marching( vec3 o, vec3 dir, inout float depth, inout vec3 n ) {
  	  float t = 0.0;
      float d = 10000.0;
      float dt = 0.0;
      for ( int i = 0; i < 128; i++ ) {
          vec3 v = o + dir * t;
          d = dist_field( v );
          if ( d < 0.001 ) {
              break;
          }
          dt = min( abs(d), 0.1 );
          t += dt;
          if ( t > depth ) {
              break;
          }
      }

      if ( d >= 0.001 ) {
          return false;
      }

      t -= dt;
      for ( int i = 0; i < 4; i++ ) {
          dt *= 0.5;

          vec3 v = o + dir * ( t + dt );
          if ( dist_field( v ) >= 0.001 ) {
              t += dt;
          }
      }

      depth = t;
      n = normalize( gradient( o + dir * t ) );

      return true;
  }

  //returns both collision dists of unit sphere
  vec2 iSphere2(in vec3 ro, in vec3 rd)
  {
      vec3 oc = ro;
      float b = dot(oc, rd);
      float c = dot(oc, oc) - 1.;
      float h = b * b - c;
      if(h < 0.0) return vec2(-1.);
      else return vec2((-b - sqrt(h)), (-b + sqrt(h)));
  }

  vec3 fresnel( vec3 F0, vec3 h, vec3 l ) {
  	return F0 + ( 1.0 - F0 ) * pow( clamp( 1.0 - dot( h, l ), 0.0, 1.0 ), 5.0 );
  }

  vec3 shading( vec3 v, vec3 n, vec3 dir, vec3 eye ) {

  	float shininess = 16.0;

  	vec3 final = vec3( 0.0 );

      // dir reflection
  	vec3 ref = reflect( dir, n );

    vec3 Ks = vec3( 0.5, 0.75, 0.9 );
    vec3 Kd = vec3( .5 );

  	// light 0
  	{
  		// vec3 light_pos1 = vec3( 20.0, 20.0, 20.0 );
  		// vec3 light_color1 = vec3( .9, 0.7, 0.7 );

      // from color's postion to light position
  		vec3 vl = normalize( light_pos1 - v );

      // 1/2 |cos(light distance, norm)|
  		vec3 diffuse  = Kd * vec3( max( 0.0, dot( vl, n ) ) );

  		// |cos(light distance, reflect)|
  		vec3 specular = vec3( max( 0.0, dot( vl, ref ) ) );

      vec3 F = fresnel( Ks, normalize( vl - dir ), vl );
  		specular = pow( specular, vec3( shininess ) );

  		final += light_color1 * mix( diffuse, specular, F );

      return vec3(0.5);
  	}

    // final += texture2D( iChannel0, ref.xy ).rgb * fresnel( Ks, n, -dir );

  	return final;
  }

  void mainImage( out vec4 fragColor, in vec2 fragCoord )
  {
  	// default ray dir
  	vec3 dir = ray_dir( 45.0, iResolution.xy, fragCoord.xy );

  	// default ray origin
  	vec3 eye = vec3( 0.0, 0.0, 3.5 );

  	// rotate camera
  	mat3 rot = rotationXY( ( iMouse.xy - iResolution.xy * 0.5 ).yx * vec2( 0.01, -0.01 ) );
  	dir = rot * dir;
  	eye = rot * eye;

  	// ray marching
    float depth = clip_far;
    vec3 n = vec3( 0.0 );
  	if ( !ray_marching( eye, dir, depth, n ) ) {
  		// fragColor = texture2D( iChannel0, dir.xy );

  	  // fragColor = vec4( dir.x, dir.y, dir.z, dir.z + 0.5 );

  	  // vec3 pos = eye + dir * depth;
      // vec3 color = shading( pos, n, dir, eye );
  	  // fragColor = vec4( pow( color, vec3( 1.0 / 1.2 )), 1.0 );

      return;
  	}

  	// shading
  	vec3 pos = eye + dir * depth;

    vec3 color = shading( pos, n, dir, eye );
  	fragColor = vec4( pow( color, vec3( 1.0 / 1.2 )), 1.0 );
  }

  void main() {
    mainImage(gl_FragColor, gl_FragCoord.xy);
  }

  `;

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
  `;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const texture = loader.load('three.js/bayer.png');
  texture.minFilter = THREE.NearestFilter;
  texture.magFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;

  const uniforms = {
    iTime: { value: 0 },
    iResolution:  { value: new THREE.Vector3(1, 1, 1) },
    iChannel0: { value: texture },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
  });

  function makeInstance(geometry, x) {
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    cube.position.x = x;

    return cube;
  }

  const cubes = [
    makeInstance(geometry,  0),
    makeInstance(geometry, -2),
    makeInstance(geometry,  2),
  ];

  function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
      renderer.setSize(width, height, false);
    }
    return needResize;
  }

  function render(time) {
    time *= 0.001;  // convert to seconds

    if (resizeRendererToDisplaySize(renderer)) {
      const canvas = renderer.domElement;
      camera.aspect = canvas.clientWidth / canvas.clientHeight;
      camera.updateProjectionMatrix();
    }

    cubes.forEach((cube, ndx) => {
      const speed = 1 + ndx * .1;
      const rot = time * speed;
      cube.rotation.x = rot;
      cube.rotation.y = rot;
    });

    uniforms.iTime.value = time;

    renderer.render(scene, camera);

    requestAnimationFrame(render);
  }

  requestAnimationFrame(render);
}
