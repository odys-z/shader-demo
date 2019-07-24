# File List

- landscape.zip

The source code of [tom@subblue.com, Tracing a Terrain](http://2008.sub.blue/blog/2009/3/7/tracing_a_terrain.html),
an algorithm for find terrian ray intersect.

- Landscape.pbk

The source code extracted from landscape.zip.

Everyone knows similar triangles' property:

    float id = (prev_alt - prev_ray.y)/(ray.y -  prev_ray.y - surface.s + prev_alt);
    ray_distance = mix(t, (t-dt), id);
