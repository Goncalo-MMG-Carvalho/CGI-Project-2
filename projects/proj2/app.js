import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, rotate, rotateX, rotateZ, mult } from "../../libs/MV.js";
import { modelView, loadMatrix, multRotationY, multRotationX, multScale, pushMatrix, popMatrix, multTranslation, multRotationZ } from "../../libs/stack.js";


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

let activeView = VIEWS["original"];

// Colors
const COLOR_BEAM = [255, 255, 0, 1.0];



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
    //mode = gl.TRIANGLES;

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

    function uploadModelView(color) {
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mModelView"), false, flatten(modelView()));

        // Send color to fragment shader
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), color);
    }

    

    /**
     * Makes the cilinder that couples the top bar to the crane
     */
    function rotator() {
        CYLINDER.draw(gl, program, mode);
    }


    /**
     * This is the top bar of the crane in the cross axis
     * -> This part is static
     */
    function top_bar() {
        top_bar_forward();
        top_bar_backward();
    }

    /**
     * Draws the section of the top bar that goes forward
     */
    function top_bar_forward() {
        pushMatrix();  
            for (let i = 0; i < 3; i++) { //TODO change value in loop condition to T3
                prismBase();
                sidesOfPrism();
                multTranslation([0,0,1]);
            }
            prismBase();
        popMatrix();
    }

    /**
     * Draws the section of the top bar that goes backwards
     */
    function top_bar_backward() {
        pushMatrix();  
            for (let i = 0; i < 3; i++) { //TODO change value in loop condition to T4
                multTranslation([0,0,-1]);
                sidesOfPrism();
                prismBase(); 
            }
        popMatrix();
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
    function floor() {  //TODO finish this function
        pushMatrix();
            multScale([CITY_SIZE, 1, CITY_SIZE]);
            
        popMatrix();
    }

    /**
     * Draws the beam from witch the prism are made of
     */
    function PrismBeam() // Beam
    {
        multScale([1/L1, 1, 1/L1]); //Same as [1,5,1] but smaller
        multTranslation([1/(L1*2), 0.5, 1/(L1*2)]);

        uploadModelView(COLOR_BEAM);
        CUBE.draw(gl, program, mode);
    }

    /**
     * Draws the Base of the prism
     */
    function prismBase() // Base of the prism
    {
        
        pushMatrix();
            PrismBeam();
        popMatrix();
        pushMatrix();
            multRotationZ(60);
            PrismBeam();
        popMatrix();
        pushMatrix();
            multTranslation([0,1,0]);
            multRotationZ(120);
            PrismBeam();
        popMatrix();
    }

    /**
     * Draws the side Beams of the prism
     */
    function sidesOfPrism() {
        pushMatrix();
            multRotationX(90);
            PrismBeam();
        popMatrix();
        pushMatrix();
            multTranslation([0,1,0]);
            multRotationX(90);
            PrismBeam();
        popMatrix();
        pushMatrix();
            multRotationX(90);
            // sqrt(3)/2 = sin(60) , 1/2 = cos(60), Because the angle of an equilateral triangle is 60º
            multTranslation([-Math.sqrt(3)/2, 0, -1/2]);
            PrismBeam();
        popMatrix();
    }


    function render() {
        if (animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        loadMatrix(activeView); // Load corresponding perspective matrix

        top_bar_forward();
        top_bar_backward();
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
