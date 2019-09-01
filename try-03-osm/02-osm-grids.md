# Key points (memo)

1. The gl_Position range is [vec3(-1), vec3(1)]

This is the clip space

see

2. For "02-osm-grids.temp.htm", all "gl_Position = 0.5" won't makes fragment working

in GPUComputationRenderer:

    function getPassThroughVertexShader() {
        gl_Position = vec4( 0.5 );
        // This is working:
        // gl_Position = vec4( normalize(position) - 0.5, 1.0 );
    }

Output are all 0.

3. THREE.Camera must call updateProjectionMatrix()

4.
