# About

This is a temp repo for testing. No plan to support in the future.

The shadertoy and raymatching is some how different from the well known style of 3d rendering, see [2].

This repository is a testing project using three.js for running shaders from shadertoy
in a html file, independent to shadertoy.

Here are some of the results:

- basic raymatching shape

![basic raymatching](https://github.com/odys-z/odys-z.github.io/blob/master/notes/opnGL/raymatching/screenshots/000%20basix.png "basic raymatching screenshot")

Try the different algorithms in [3].

- platonic solids

![platonic solids](https://github.com/odys-z/odys-z.github.io/blob/master/notes/opnGL/raymatching/screenshots/004%20Platonic%20solid.png "platonic solid screenshot")

Shapes melding, because of power of "mix()".

- volumetric rendering example

![modified plasma globe](https://github.com/odys-z/odys-z.github.io/blob/master/notes/opnGL/raymatching/screenshots/006%20plasma%20globe.png)

# Quick Start

    git clone https://github.com/odys-z/shader-demo.git

Then open index.html with browser. Edge is recommended because you can load local file.

# References

- 1. [Shadertoy](www.shadertoy.com)
Shadertoy Home Page

- 2. [Shadertoy to Three.js How to](https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html "")
A general way adapting shadertoy's shader to three.js.

- 3. [Three.js Backgrounds and Skyboxes](https://threejsfundamentals.org/threejs/lessons/threejs-backgrounds.html "Three.js Backgrounds and Skyboxes")

- 4. [distance functions](http://iquilezles.org/www/articles/distfunctions/distfunctions.htm)
Raymarching Distance Functions

And also example: [sdf examples](https://www.shadertoy.com/view/Xds3zN "sdf examples"), with [sdf example tutorial](https://www.alanzucconi.com/2016/07/01/signed-distance-functions/ "tutorial")

- 5. [inigo quilez home page](http://www.iquilezles.org/www/articles/raymarchingdf/raymarchingdf.htm "inigo quilez, raymarching distance fields")
inigo quilez home page

- 6. [raymatching tutorial](http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/)
A Tutorial by Jamie Wang

- 7. [Volumetric Rendering](https://www.alanzucconi.com/2016/07/01/volumetric-rendering/)
with [example](try-01/06 plasma globe.html)

- x. [Inigo Quilez's website](http://www.iquilezles.org/www/index.htm "inigo quilez website")
- x. [An advanced rendering tech survey](http://advances.realtimerendering.com/s2015/index.html "Advanced Tech Survey")
