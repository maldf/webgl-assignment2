"use strict";

var canvas;
var gl;

var mouse_btn = 0;
var vBuffer;
var index = 0;
function Point(x, y) {
    this.x = x;
    this.y = y;
}
var prevpos = new Point(0, 0);
var lineColor = vec4(0, 0, 1, 1);
var lineWidth = 1;

// store metadata about each line 
function Poly(start, end, width) {
    this.start = start;     // start index
    this.end = end;         // end index
    this.width = width;
    // color is send down with each vertex
}
var lines = [];

const NUMPOINTS = 1000000;

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
    gl.clearColor(0.8, 0.8, 0.8, 1.0);

    //  Load shaders and initialize attribute buffers

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // Load the data into the GPU
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 24 * NUMPOINTS, gl.STATIC_DRAW);

    // Associate shader variables with our data buffer
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 6 * 4, 0);
    gl.enableVertexAttribArray(vPosition);
    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 6 * 4, 2 * 4);
    gl.enableVertexAttribArray(vColor);

    // handle events on interactive elements
    document.getElementById("color-picker").value = "#0000ff";
    document.getElementById("color-picker").oninput = function() {
        // value should be if format "#rrggbb"
        // TODO: error checking
        var val = parseInt(this.value.slice(1), 16);
        lineColor = vec4(((val >> 16) & 0xff) / 255, ((val >> 8) & 0xff) / 255, (val & 0xff) / 255, 1);
    }
    
    window.addEventListener("mousemove", mouse_move);
    window.addEventListener("mouseup",   mouse_up);
    window.addEventListener("mousedown", mouse_down);

    render();
}

function mouse_to_canvas_coords(ev)
{
    var rect = canvas.getBoundingClientRect();
    // -1 for border size and padding set in stylesheet
    var mx = ev.clientX - rect.left - 1;
    var my = ev.clientY - rect.top - 1;

    document.getElementById("mx").innerHTML = mx;
    document.getElementById("my").innerHTML = my;
    document.getElementById("mb").innerHTML = index;
    
    var p = new Point(2 * mx / canvas.width - 1, 1 - 2 * my / canvas.height);
    return p;
}

function mouse_move(ev)
{
    var pos = mouse_to_canvas_coords(ev);
    if (mouse_btn) {
        var p = vec2(prevpos.x, prevpos.y).concat(lineColor).concat(vec2(pos.x, pos.y)).concat(lineColor);
        gl.bufferSubData(gl.ARRAY_BUFFER, 24 * index, flatten(p));
        index += 2;
        lines[lines.length - 1].end = index - 1;
        render();
        prevpos = pos;
    }
}

function mouse_up(ev)
{
    // include endpoint in line
    mouse_move(ev);
    mouse_btn = 0;
}

function mouse_down(ev)
{
    lines.push(new Poly(index, -1, lineWidth));
    mouse_btn = 1;
}

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (var i = 0; i < (lines.length) && (lines[i].end != -1); ++i) {
        gl.lineWidth(lines.width);
        gl.drawArrays(gl.LINES, lines.start, lines.end);
    }
}
