import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, rotate, rotateX, rotateZ, mult } from "../../libs/MV.js";
import { modelView, loadMatrix, multRotationY, multRotationX, multScale, pushMatrix, popMatrix, multTranslation, multRotationZ } from "../../libs/stack.js";


//import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';

/** @type WebGLRenderingContext */
let gl;

const VP_DISTANCE = 20; // TODO por o vp_distance a 10

let time = 0;           // Global simulation time in days
let speed = 1 / 60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

let THETA = 1;
let GAMMA = 1;

const VIEWS = {
    "1": lookAt([0, VP_DISTANCE * 0.9, VP_DISTANCE / 4], [0, VP_DISTANCE * 0.9, 0], [0, 1, 0]), //Front view
    "2": lookAt([0, VP_DISTANCE / 4, 0], [0, 0, 0], [0, 0, -1]), //From Above
    "3": lookAt([-VP_DISTANCE / 4, 0, 0], [0, 0, 0], [0, 1, 0]), //From left
    "4": lookAt([VP_DISTANCE * GAMMA / 4, VP_DISTANCE * THETA / 3, VP_DISTANCE], [0, 0, 0], [0, 1, 0]), //View proposed by the teacher, axiometric view
}



let activeView = VIEWS["4"];

// Colors
const COLOR_BEAM = [1, 1, 0, 1.0]; // yellow
const COLOR_FLOOR_1 = [1, 1, 1, 1.0]; // White
const COLOR_FLOOR_2 = [0.3, 0.3, 0.3, 1]; // Grey
const COLOR_ROTATOR = [1, 0, 0, 1]; // Dark Grey


// Crane Parameters

let T1 = 10; // Number of cubes in the first section of the tower
let T2 = T1 + 5; // Number of cubes in the second section of the tower

let T3 = T1; // Number of prisms in the biggest section of the top bar
let T4 = T3 / 3; // Number of prisms in the smallest section of the top bar

let E1 = 0.1; // Thickness of the edges of the tower
let E2 = E1; // Thickness of the edges of the second section of the tower
let E3 = E2; // Thickness of the edges of the top bar

let L1 = 10 * E1;  // Length of the beam of the first section of the tower
let L2 = L1 - 2 * E1; // Length of the beam of the second section of the tower
let L3 = L2; // Length of the beam of the top bar

// Floor
const FLOOR_BLOCK_SIZE = 2 * L1; // Length of the floor
const FLOOR_SIZE = FLOOR_BLOCK_SIZE * 10 + 1; // Size of the floor, +1 to be impar

// Crane Dimensions
const LOWER_SECTION_HEIGHT = L1 * T1; // Height of the lower section of the crane

const MAX_SECOND_SECTION_HEIGHT = L2 * T2; // Height of the second section of the crane
const MIN_SECOND_SECTION_HEIGHT = 0; // Minimum height of the second section of the crane

let CURRENT_SECOND_SECTION_HEIGHT = MAX_SECOND_SECTION_HEIGHT / 2; // Current height of the second section of the crane
let CRANE_ROTATION_ANGLE = 0; // Current rotation angle of the crane

const ROTATOR_HEIGHT = L2 / 2; // Height of the cylinder that couples the top bar to the crane
const ROTATOR_RADIUS = FLOOR_BLOCK_SIZE / 2;

const CRANE_HEIGHT = CURRENT_SECOND_SECTION_HEIGHT + ROTATOR_HEIGHT; // Height of the crane


function setup(shaders) {
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    const incIndex = 1;
    let mProjection = ortho(
        -VP_DISTANCE * aspect * incIndex,
        VP_DISTANCE * aspect * incIndex,
        -VP_DISTANCE * incIndex,
        VP_DISTANCE * incIndex,
        -3 * VP_DISTANCE * incIndex,
        3 * VP_DISTANCE * incIndex
    );

    mode = gl.LINES; // TODO change to gl.TRIANGLES when delivering project

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function (event) {
        console.log(event.key)
        switch (event.key) {
            case '0': // Toggle wireframe / solid mode
                if (mode == gl.LINES)
                    mode = gl.TRIANGLES;
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

            case 'w': // Rise UP
                break;

            case 's': // Lower Tip
                break;

            case 'i': // Expand Base
                if (CURRENT_SECOND_SECTION_HEIGHT < MAX_SECOND_SECTION_HEIGHT * 0.8)
                    CURRENT_SECOND_SECTION_HEIGHT += 0.1;
                break;

            case 'k': // Contract Base
                if (CURRENT_SECOND_SECTION_HEIGHT > MIN_SECOND_SECTION_HEIGHT + MAX_SECOND_SECTION_HEIGHT * 0.05 )
                    CURRENT_SECOND_SECTION_HEIGHT -= 0.1;
                break;

            case 'j': // Rotate CCW
                CRANE_ROTATION_ANGLE -= 1;
                break;

            case 'l': // Rotate CW
                CRANE_ROTATION_ANGLE += 1;
                break;

            case 'a': // Slider outwards
                break;

            case 'd': // Slider inwards
                break;

            case 'ArrowLeft': // Increase THETA
                THETA += 1;
                break;

            case 'ArrowRight': // Decrease THETA
                THETA -= 1;
                break;

            case 'ArrowUp': // Increase GAMMA
                GAMMA += 1;
                break;

            case 'ArrowDown': // Decrease GAMMA
                GAMMA -= 1;
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
        gl.uniform4fv(gl.getUniformLocation(program, "uColor"), color); // Upload color
    }


    /**
     * Makes the cilinder that couples the top bar to the crane
     */
    function rotator() {
        multScale([FLOOR_BLOCK_SIZE, L2 / 2, FLOOR_BLOCK_SIZE]);
        uploadModelView(COLOR_ROTATOR);
        CYLINDER.draw(gl, program, mode);
    }


    /**
     * This is the top bar of the crane in the cross axis
     * -> This part is static
     */
    function top_bar() {
        multRotationY(90);
        multRotationZ(30);
        multTranslation([0, E3, 0]);
        multTranslation([0, 0, -L3/2]);
        pushMatrix();
            top_bar_forward();
        popMatrix();

        top_bar_backward();
    }

    /**
     * Draws the section of the top bar that goes forward
     */
    function top_bar_forward() {
        for (let i = 0; i < T3+1; i++) { //TODO change value in loop condition to T3
            prismBase();
            sidesOfPrism();
            multTranslation([0, 0, L3]);
        }
        prismBase();
    }

    /**
     * Draws the section of the top bar that goes backwards
     */
    function top_bar_backward() {
        for (let i = 0; i < T4-1; i++) { //TODO change value in loop condition to T4
            multTranslation([0, 0, -L3]);
            sidesOfPrism();
            prismBase();
        }
    }

    /**
     * This is the base of the crane
     * -> This part is static
     */
    function first_section() {
        for (let i = 0; i < T1; i++) { // Create each block of the first section
            pushMatrix();
            cubeBase(true);
            popMatrix();
            pushMatrix();
            sidesOfCube(true);
            popMatrix();
            multTranslation([0, L1, 0]);
        }
        cubeBase(true);
    }

    /**
     * The second section of the crane
     * -> This is the part of the crane that goes up and down
     */
    function second_section() {

        for (let i = 0; i < T2; i++) { // Create each block of the second section
            pushMatrix();
            cubeBase(false);
            popMatrix();
            pushMatrix();
            sidesOfCube(false);
            popMatrix();
            multTranslation([0, L2, 0]);
        }
        cubeBase(false);
    }

    /**
     * Draws the tower of the crane
     */
    function tower() {
        pushMatrix();
        /**/first_section();
        popMatrix();
        pushMatrix();
        /**/multTranslation([-E1, CURRENT_SECOND_SECTION_HEIGHT, -E1]); //TODO change the translation to support movement
        /**/second_section();
        popMatrix();
    }

    /**
     * Create the floor with 2 tones, grey and white
     */
    function floor() {  //TODO I dont know why but the floor looks completly white on my screen, might be a screen problem
        multScale([FLOOR_BLOCK_SIZE, -FLOOR_BLOCK_SIZE / 100, FLOOR_BLOCK_SIZE]); // Scale of the blocks that make the floor

        // so the floor is centered on the middle of the screen
        multTranslation([-FLOOR_SIZE / 2, 0, -FLOOR_SIZE / 2]);


        for (let i = 0; i < FLOOR_SIZE; i++) { // Create each block of the floor
            pushMatrix();
            for (let j = 0; j < FLOOR_SIZE; j++) {
                let color = ((i + j) % 2) == 0 ? COLOR_FLOOR_1 : COLOR_FLOOR_2;
                uploadModelView(color);
                CUBE.draw(gl, program, mode);
                multTranslation([1, 0, 0]);
            }
            popMatrix();
            multTranslation([0, 0, 1]);
        }
    }

    /**
     * Draws the beam from witch the prisms are made of
     */
    function prismBeam() {
        multTranslation([0/*E3/2*/, L3 / 2, 0/*E3/2*/]); // To centre the axis xyz
        multScale([E3, L3, E3]);
        uploadModelView(COLOR_BEAM);
        CUBE.draw(gl, program, mode);
    }

    /**
     * Draws the Base of the prism
     */
    function prismBase() {

        pushMatrix();
        prismBeam();
        popMatrix();
        pushMatrix();
        multRotationZ(60);
        prismBeam();
        popMatrix();
        pushMatrix();
        multTranslation([0, L3, 0]);
        multRotationZ(120);
        prismBeam();
        popMatrix();
    }

    /**
     * Draws the side Beams of the prism
     */
    function sidesOfPrism() {
        pushMatrix();
        multRotationX(90);
        prismBeam();
        popMatrix();
        pushMatrix();
        multTranslation([0, L3, 0]);
        multRotationX(90);
        prismBeam();
        popMatrix();
        pushMatrix();
        multRotationZ(60);
        multTranslation([0, L3, 0]);
        multRotationX(90);
        multRotationY(30);
        prismBeam();
        popMatrix();
    }

    function cubeBeam(isFirstSection) {
        let l = 0;
        let e = 0;
        if (isFirstSection) { l = L1; e = E1; }
        else { l = L2; e = E2; }

        multTranslation([e / 2, l / 2, e / 2]); // To centre the axis xyz
        multScale([e, l, e]);
        uploadModelView(COLOR_BEAM);
        CUBE.draw(gl, program, mode);
    }

    /**
     * Desenha as arestas horizontais do cubo
     */
    function cubeBase(isFirstSection) {
        let l = 0;
        let e = 0;
        if (isFirstSection) { l = L1; e = E1; }
        else { l = L2; e = E2; }

        multRotationX(-90);
        pushMatrix();
        cubeBeam(isFirstSection);
        popMatrix();
        pushMatrix();
        multRotationZ(90);
        cubeBeam(isFirstSection);
        popMatrix();
        pushMatrix();
        multTranslation([e, l, 0]);
        multRotationZ(90);
        cubeBeam(isFirstSection);
        popMatrix();
        pushMatrix();
        multTranslation([-l, e, 0]);
        cubeBeam(isFirstSection);
        popMatrix();
    }

    /**
     * Desanha as arestas verticais do cubo
     */
    function sidesOfCube(isFirstSection) {
        let l = 0;
        let e = 0;
        if (isFirstSection) { l = L1; e = E1; }
        else { l = L2; e = E2; }

        multTranslation([0, e, -e]);
        pushMatrix();
        cubeBeam(isFirstSection);
        popMatrix();
        pushMatrix();
        multTranslation([-l, 0, 0]);
        cubeBeam(isFirstSection);
        popMatrix();
        pushMatrix();
        multTranslation([0, 0, -l]);
        cubeBeam(isFirstSection);
        popMatrix();
        multTranslation([-l, 0, -l]);
        cubeBeam(isFirstSection);
    }


    function render() {
        if (animation) time += speed;
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(program);

        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection));

        loadMatrix(activeView); // Load corresponding perspective matrix


        multTranslation([L1, 0, L1]); // Recentar o desenho todo no centro do ecrã
        pushMatrix();
        /**/floor();
        popMatrix();
        
        pushMatrix();
        /**/multTranslation([-(L1 + E1) / 2, 0, -(L1 - E1) / 2]);
        /**/tower();
        popMatrix();
        pushMatrix();  
        /**/multTranslation([0, LOWER_SECTION_HEIGHT + CURRENT_SECOND_SECTION_HEIGHT + ROTATOR_HEIGHT, 0]);
        /**/multTranslation([-FLOOR_BLOCK_SIZE/2, 0, -FLOOR_BLOCK_SIZE/2]);
        /**/multRotationY(CRANE_ROTATION_ANGLE);
        /**/rotator();
        /**/multTranslation([0, ROTATOR_HEIGHT, -(L3+E3)/2]);  
        /**/top_bar();
            
        popMatrix();


        //second_section();

    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
