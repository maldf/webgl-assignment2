"use strict";

var canvas;
var gl;
var vBuffer;

var mouse_btn = false;      // state of mouse button
var index = 0;              // index into ARRAY_BUFFER on GPU

function Point(x, y) {
    this.x = x;
    this.y = y;
}
var lineColor = vec4(0, 0, 1, 1);
var lineWidth = 1;

// store metadata about each line 
function Poly(start, end, width) {
    this.start = start;     // start index in ARRAY_BUFFER
    this.end = end;         // end index in ARRAY_BUFFER
    this.width = width;     // line width
    // color is send down with each vertex
}
var lines = [];

const NUMPOINTS = 200000;

// sizeof(point(vec2) +  color(vec4)) = 24 bytes of data
const POINT_DATA_SIZE = 24;


//-------------------------------------------------------------------------------------------------
window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { 
        alert("WebGL isn't available"); 
    }

    //  Configure WebGL
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.9, 0.9, 0.9, 1.0);

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    // allocate buffer for lines
    // TODO: dynamically manage buffer size
    gl.bufferData(gl.ARRAY_BUFFER, POINT_DATA_SIZE * NUMPOINTS, gl.STATIC_DRAW);

    // Associate shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 6 * 4, 0);
    gl.enableVertexAttribArray(vPosition);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 6 * 4, 2 * 4);
    gl.enableVertexAttribArray(vColor);

    // handle color picket
    document.getElementById("color-picker").value = "#2050ff";      // default
    lineColor = convert_string_to_rgb(document.getElementById("color-picker").value);
    document.getElementById("color-picker").oninput = function() {
        lineColor = convert_string_to_rgb(this.value);
    }
   
    // catch mouse down in canvas, catch other mouse events in whole window
    window.addEventListener("mousemove", mouse_move);
    window.addEventListener("mouseup",   mouse_up);
    canvas.addEventListener("mousedown", mouse_down);
  
    // handle line width selector
    document.getElementById("sel-linewidth").value = 1;
    document.getElementById("sel-linewidth").oninput = function() {
        lineWidth = this.value;
        document.getElementById("disp-linewidth").innerHTML = lineWidth;
    };

    // handle undo
    document.getElementById("btn-undo").onclick = function() {
        if (lines.length) {
            var line = lines.pop();
            index = line.start;
        }
        render();
    }
    
    // handle clear
    document.getElementById("btn-clear").onclick = function() {
        lines = [];
        index = 0;
        render();
    }
    
    render();
}

//-------------------------------------------------------------------------------------------------
// convert string "#rrggbb" to vec4() with rgb color
function convert_string_to_rgb(str) {
    var color = undefined;
    // value should be in format "#rrggbb"
    // TODO: better error checking
    if (str) {
        var val = parseInt(str.slice(1), 16);
        color = vec4(((val >> 16) & 0xff) / 255, 
                     ((val >>  8) & 0xff) / 255, 
                      (val & 0xff) / 255, 1);
    }
    return color;
}


//-------------------------------------------------------------------------------------------------
// get mouse position and convert to clip coordinates
function mouse_to_canvas_coords(ev)
{
    var rect = canvas.getBoundingClientRect();
    // subtract 1 for border size and padding as set in stylesheet
    var mx = ev.clientX - rect.left - 1;
    var my = ev.clientY - rect.top - 1;

    var p = new Point(2 * mx / canvas.width - 1, 1 - 2 * my / canvas.height);
    return p;
}

//-------------------------------------------------------------------------------------------------
function mouse_move(ev)
{
    if (mouse_btn) {
        // send next point and its color to GPU 
        var pos = mouse_to_canvas_coords(ev);
        var p = vec2(pos.x, pos.y).concat(lineColor);
        gl.bufferSubData(gl.ARRAY_BUFFER, POINT_DATA_SIZE * index, flatten(p));
        lines[lines.length - 1].end = index;
        index++;
        render();
    }
}

//-------------------------------------------------------------------------------------------------
function mouse_up(ev)
{
    // include endpoint in line
    mouse_move(ev);
    mouse_btn = false;
}

//-------------------------------------------------------------------------------------------------
function mouse_down(ev)
{
    // start new line segment,
    // send 1st point and its color to GPU
    var pos = mouse_to_canvas_coords(ev);
    var p = vec2(pos.x, pos.y).concat(lineColor);
    gl.bufferSubData(gl.ARRAY_BUFFER, POINT_DATA_SIZE * index, flatten(p));
    lines.push(new Poly(index, -1, lineWidth));
    index++;
    mouse_btn = true;
}

//-------------------------------------------------------------------------------------------------
function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
    // draw all lines stored in the "lines" array
    for (var i = 0; i < (lines.length) && (lines[i].end != -1); ++i) {
        gl.lineWidth(lines[i].width);
        gl.drawArrays(gl.LINE_STRIP, lines[i].start, lines[i].end - lines[i].start);
    }
}
