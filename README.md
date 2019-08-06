# About

Shader-demo is a Glsl shader testing and visual effects lib.

This is a temp repo for now. The js lib distribution will using Webpack in the future. For now, there is a helping tool, cp-res, in shader-demo/lib directory for copying necessary files. Users need modify the "src" array to indicate their git location, then copy files to their application/oz dir.

The bash script is only can be used in linux.

The [shadertoy](https://en.wikipedia.org/wiki/Shadertoy) and raymatching is some how different from the well known style of 3d rendering, see [2].

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

- data texture

![data texture generated by Math.sin()](https://github.com/odys-z/odys-z.github.io/blob/master/notes/opnGL/raymatching/screenshots/007%20data%20texture%20sphere%20dist.png)

![picking by gpu](https://github.com/odys-z/odys-z.github.io/blob/master/notes/opnGL/raymatching/screenshots/02%20t6%20geo%20data.png?raw=true) { width: 200px; }

# Quick Start

    git clone https://github.com/odys-z/shader-demo.git

Then open index.html with browser. Edge is recommended because you can load local files,
the others like Firefox or Chrome will report CROS error.

# Troubleshootings:

## Chrome CORS Blocked

If Chrome is reporting CORS error, that's because you opened the html file from file system
and it's trying to load a local file. Chrome doesn't allow this access by default. So in Ubuntu:

    google-chrome --allow-file-access-from-files

Windows has the similar shooting.

see [Stackovrflow: Problems with jQuery getJSON using local files in Chrome](https://stackoverflow.com/questions/2541949/problems-with-jquery-getjson-using-local-files-in-chrome);

# References

- 1. [Shadertoy](www.shadertoy.com)
Shadertoy Home Page

- 2. [Shadertoy to Three.js How to](https://threejsfundamentals.org/threejs/lessons/threejs-shadertoy.html "")
A general way adapting shadertoy's shader to three.js.

- 3. [Three.js Backgrounds and Skyboxes](https://threejsfundamentals.org/threejs/lessons/threejs-backgrounds.html "Three.js Backgrounds and Skyboxes")

- 4. [Raymarching distance functions](http://iquilezles.org/www/articles/distfunctions/distfunctions.htm)
and [** primatives **](https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm)

And also example: [sdf examples](https://www.shadertoy.com/view/Xds3zN "sdf examples"), with [sdf example tutorial](https://www.alanzucconi.com/2016/07/01/signed-distance-functions/ "tutorial")

- 5. [inigo quilez home page](http://www.iquilezles.org/www/articles/raymarchingdf/raymarchingdf.htm "inigo quilez, raymarching distance fields")
inigo quilez home page

- 6. [raymatching tutorial](http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/)
A Tutorial by Jamie Wang

- 7. [Volumetric Rendering](https://www.alanzucconi.com/2016/07/01/volumetric-rendering/)
with [example](try-01/06 plasma globe.html)

- 8. [tom@subblue.com, Tracing a Terrain](http://2008.sub.blue/blog/2009/3/7/tracing_a_terrain.html),
Find distance to terrian quickly.

This source is copied in ./refrences

- x. [Inigo Quilez's website](http://www.iquilezles.org/www/index.htm "inigo quilez website")

- x. [An advanced rendering tech survey](http://advances.realtimerendering.com/s2015/index.html "Advanced Tech Survey")
# Resources

- 1. [graphtoy](http://www.iquilezles.org/apps/graphtoy)

- 2. [GLSL Js Translator / Debugger](http://brrian.org/glsl-simulator/),
