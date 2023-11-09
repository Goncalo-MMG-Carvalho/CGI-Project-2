import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, rotate, rotateX, rotateZ, mult } from "../../libs/MV.js";
import { modelView, loadMatrix, multRotationY, multScale, pushMatrix, popMatrix, multTranslation, multRotationZ } from "../../libs/stack.js";

//import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';

/** @type WebGLRenderingContext */
let gl;

const VP_DISTANCE = 2; // TODO por o vp a 10

let time = 0;           // Global simulation time in days
let speed = 1 / 60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

const VIEWS = {
    "1": lookAt([VP_DISTANCE / 4, 0, 0], [0, 0, 0], [0, 1, 0]),
    "2": lookAt([VP_DISTANCE / 4, VP_DISTANCE / 4, 0], [0, 0, 0], [0, 1, 0]),
    "3": lookAt([0, VP_DISTANCE / 4, 0], [0, 0, 0], [0, 0, -1]),
    "4": null,
    "original": lookAt([VP_DISTANCE / 4, VP_DISTANCE / 3, VP_DISTANCE], [0, 0, 0], [0, 1, 0]),
}

let activeView = VIEWS["1"];

// Crane Controls


// Crane Parameters

let T1 = 20; // Number of cubes in the first section of the tower
let T2 = 25; // Number of cubes in the second section of the tower

let T3 = 30; // Number of prisms in the biggest section of the top bar
let T4 = T3 / 3; // Number of prisms in the smallest section of the top bar

let E1 = 0.5; // Thickness of the edges of the tower
let E2 = E1; // Thickness of the edges of the second section of the tower
let E3 = E2; // Thickness of the edges of the top bar

let L1 = 5;  // Length of the beam of the first section of the tower
let L2 = L1 - 2 * E1; // Length of the beam of the second section of the tower
let L3 = L2; // Length of the beam of the top bar

function setup(shaders) {
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);

    let mProjection = ortho(-VP_DISTANCE * aspect, VP_DISTANCE * aspect, -VP_DISTANCE, VP_DISTANCE, -3 * VP_DISTANCE, 3 * VP_DISTANCE);

    mode = gl.LINES;

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function (event) {
        switch (event.key) {
            case '0': // Toggle wireframe / solid mode
                if (mode == gl.LINES) mode = gl.TRIANGLES;
                else mode = gl.LINES;
                break;
            case '1': // Toggle front view
                activeView = VIEWS["1"];
                break;
            case '2': // Toggle top view
                activeView = VIEWS["2"];
                break;
            case '3': // Toggle left view
                activeView = VIEWS["3"];
                break;
            case '4': // Toggle axonometric view
                activeView = VIEWS["4"];
                break;
            case '5':
                activeView = VIEWS["original"];
                break;
            case 'w': // Rise UP
                break;
            case 's': // Lower Tip
                break;
            case 'i': // Expand Base
                break;
            case 'k': // Contract Base
                break;
            case 'j': // Rotate CCW
                break;
            case 'l': // Rotate CW
                break;
            case 'a': // Slider outwards
                break;
            case 'd': // Slider inwards
                break;
            case 'ArrowLeft': // Increase THETA
                break;
            case 'ArrowRight': // Decrease THETA
                break;
            case 'ArrowUp': // Increase GAMMA
                break;
            case 'ArrowDown': // Decrease GAMMA
                break;
        }
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    CUBE.init(gl);
    CYLINDER.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    window.requestAnimationFrame(render);


    function resize_canvas(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
        mProjection = ortho(-VP_DISTANCE * aspect, VP_DISTANCE * aspect, -VP_DISTANCE, VP_DISTANCE, -3 * VP_DISTANCE, 3 * VP_DISTANCE);
    }

    function uploadModelView() {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));
    }

    // function beam() { // Beam

    //     multScale([1 / L1, 1, 1 / L1]); //Same as [1,5,1] but smaller
    //     multTranslation([1 / (L1 * 2), 0.5, 1 / (L1 * 2)]);
    //     uploadModelView();

    //     CUBE.draw(gl, program, mode);
    // }

    /**
     * Makes the base of the crane
     */
    function block() { // Base block
        multScale([1 / L1, 1 / L1, 1 / L1]);
        multTranslation([1 / (L1 * 2), 0.5, 1 / (L1 * 2)]);
        uploadModelView();

        CUBE.draw(gl, program, mode);
    }

    /**
     * Makes the cilinder that couples the top bar to the crane
     */
    function rotator() {
        CYLINDER.draw(gl, program, mode);
    }

    /**
     * Makes the cross axis top bar
     */
    function prism() { // Base triangular prism

    }

    /**
     * This is the top bar of the crane in the cross axis
     * -> This part is static
     */
    function top_bar() {

    }

    /**
     * 
     */
    function top_bar_forward() {

    }

    /**
     * 
     */
    function top_bar_backward() {

    }

    /**
     * This is the base of the crane
     * -> This part is static
     */
    function first_section() {
        for (let i = 0; i < T1; i++) { // Create each block of the first section

        }
    }

    /**
     * The second section of the crane
     * -> This is the part of the crane that goes up and down
     */
    function second_section() {
        for (let i = 0; i < T2; i++) { // Create each block of the second section

        }
    }

    /**
     * Create the floor with 2 tones of gray
     */
    function floor() {

    }

    function base() { // Base
        pushMatrix();
        block();
        popMatrix();

        pushMatrix();
        multTranslation([0, 1 / 5, 0]);
        block();
        popMatrix();

        pushMatrix();
        multTranslation([0, 1 / 5, 0]);
        multTranslation([-1 / 5, 0, 0]);
        block();
        popMatrix();
    }

    function render() {
        if (animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        // loadMatrix(lookAt([VP_DISTANCE / 4, VP_DISTANCE / 3, VP_DISTANCE], [0, 0, 0], [0, 1, 0]));
        loadMatrix(activeView); // Load corresponding perspective matrix
        /*
        pushMatrix();
            beam();
        popMatrix();
        */
        base();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
