import { buildProgramFromSources, loadShadersFromURLS, setupWebGL } from "../../libs/utils.js";
import { ortho, lookAt, flatten, rotate, rotateX, rotateZ, mult, rotateY, translate } from "../../libs/MV.js";
import { modelView, loadMatrix, multRotationY, multRotationX, multScale, pushMatrix, popMatrix, multTranslation, multRotationZ } from "../../libs/stack.js";


//import * as SPHERE from '../../libs/objects/sphere.js';
import * as CUBE from '../../libs/objects/cube.js';
import * as CYLINDER from '../../libs/objects/cylinder.js';
import * as BUNNY from '../../libs/objects/bunny.js';

/** @type WebGLRenderingContext */
let gl;

/**
 * Can not be  <= 0
 */
const DEFAULT_VP_DISTANCE = 3.5;
let VP_DISTANCE = DEFAULT_VP_DISTANCE;

let time = 0;           // Global simulation time in days
let speed = 1 / 60.0;     // Speed (how many days added to time on each render pass
let mode;               // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true;   // Animation is running

let THETA = 0;
let GAMMA = 0;


// Colors
const COLOR_BEAM = [1, 1, 0, 1.0]; // yellow
const COLOR_BEAM_2 = [220/255, 220/255, 0, 1.0]; // Slightly darker yellow, to facilitate the visualization
const COLOR_FLOOR_1 = [1, 1, 1, 1.0]; // White
const COLOR_FLOOR_2 = [0.7, 0.7, 0.7, 1]; // light Grey
const COLOR_ROTATOR = [0, 1, 0, 1]; // Green
const COLOR_CART = [1, 0, 0, 1] // Red
const COLOR_ROPE = [1, 1, 1, 1] //WHITE
const COLOR_COUNTER_WEIGHT = [0, 0, 1, 1] //BLUE
const COLOR_BUNNY = [0.5, 1, 1, 1] //Weird blue

// Crane Parameters
const T1 = 11;                          // Number of cubes in the first section of the tower
const T2 = T1 + 5;                      // Number of cubes in the second section of the tower

const T3 = T1;                          // Number of prisms in the biggest section of the top bar
const T4 = T3 / 3;                      // Number of prisms in the smallest section of the top bar

const E1 = DEFAULT_VP_DISTANCE / 35;    // Thickness of the edges of the tower
const E2 = E1;                          // Thickness of the edges of the second section of the tower
const E3 = E2;                          // Thickness of the edges of the top bar

const L1 = 10 * E1;                     // Length of the beam of the first section of the tower
const L2 = L1 - 2 * E1;                 // Length of the beam of the second section of the tower
const L3 = L2;                          // Length of the beam of the top bar

// Floor
const FLOOR_BLOCK_SIZE = 2 * L1;                // Length of the floor
const FLOOR_SIZE = FLOOR_BLOCK_SIZE * 10 + 1;   // Size of the floor, +1 to be impar

// Crane Dimensions
const LOWER_SECTION_HEIGHT = L1 * T1;                               // Height of the lower section of the crane

const MAX_SECOND_SECTION_HEIGHT = LOWER_SECTION_HEIGHT * 0.9;       // Height of the base of second section of the crane to the floor
const MIN_SECOND_SECTION_HEIGHT = MAX_SECOND_SECTION_HEIGHT * 0.05; // Minimum height of the base second section of the crane

let CURRENT_SECOND_SECTION_HEIGHT = MAX_SECOND_SECTION_HEIGHT / 2;  // Current height of the second section of the crane to the floor
let CRANE_ROTATION_ANGLE = 180;                                     // Current rotation angle of the crane

const ROTATOR_HEIGHT = L2 / 2;                                      // Height of the cylinder that couples the top bar to the crane
const ROTATOR_RADIUS = FLOOR_BLOCK_SIZE / 2;

let topOfTowerHeight = CURRENT_SECOND_SECTION_HEIGHT + L2 * T2 + E2;                        // Height of the top of the tower
const MAX_TOP_OF_TOWER_HEIGHT = MAX_SECOND_SECTION_HEIGHT + L2 * T2 + E2;                   // Max Height of the top of the tower
const MAX_CRANE_HEIGHT = MAX_TOP_OF_TOWER_HEIGHT + ROTATOR_HEIGHT + Math.sqrt(3) * L3 / 2;  // Max Height of the top of the crane

let MAX_ROPE_SIZE = topOfTowerHeight + ROTATOR_HEIGHT - 1.25*E3;    // Maximum size of the rope that goes up and down from the cart
const MIN_ROPE_SIZE = E3 * 2;                                       // Minimum size of the rope that goes up and down from the cart

const MAX_CART_POSITION = (T3 + 0.5) * L3 - E3;  // Furthest position of the cart along the top bar 
const MIN_CART_POSITION = FLOOR_BLOCK_SIZE; //  Closest position of the cart along the top bar

let ropeSize = L3;                      // Current size of the rope that goes up and down from the cart
let cartPosition = MAX_CART_POSITION;   // Current position of the cart along the top bar



let VIEWS = () => ({
    "1": lookAt([0, MAX_CRANE_HEIGHT/2, VP_DISTANCE / 4], [0, MAX_CRANE_HEIGHT/2, 0], [0, 1, 0]), //Front view

    "2": lookAt([0, MAX_CRANE_HEIGHT/2 + VP_DISTANCE / 4, 0], [0, 0, 0], [0, 0, -1]), //From Above

    "3": lookAt([-VP_DISTANCE / 4, MAX_CRANE_HEIGHT/2, 0], [0, MAX_CRANE_HEIGHT/2, 0], [0, 1, 0]), //From left

    "4": lookAt([VP_DISTANCE/4 , VP_DISTANCE / 3 + GAMMA + MAX_CRANE_HEIGHT/2 , VP_DISTANCE], [0, MAX_CRANE_HEIGHT/2, 0], [0, 1, 0]), //Axonometric
});

let selectedView = "4";
let activeView;



function setup(shaders) {
    let canvas = document.getElementById("gl-canvas");
    let aspect = canvas.width / canvas.height;

    gl = setupWebGL(canvas);

    let program = buildProgramFromSources(gl, shaders["shader.vert"], shaders["shader.frag"]);
    const incIndex = 5;

    let mProjection = () => ortho(
        -VP_DISTANCE * aspect * incIndex,
        VP_DISTANCE * aspect * incIndex,
        -VP_DISTANCE * incIndex,
        VP_DISTANCE * incIndex,
        -3 * VP_DISTANCE * incIndex,
        3 * VP_DISTANCE * incIndex
    );

    mode = gl.TRIANGLES;

    resize_canvas();
    window.addEventListener("resize", resize_canvas);

    document.onkeydown = function (event) {
        switch (event.key) {
            case '0': // Toggle wireframe / solid mode
                if (mode == gl.LINES)
                    mode = gl.TRIANGLES;
                else 
                    mode = gl.LINES;
                break;

            case '1': // Toggle front view
                selectedView = "1";
                VP_DISTANCE = DEFAULT_VP_DISTANCE * 0.8;
                break;

            case '2': // Toggle top view
                selectedView = "2";
                VP_DISTANCE = DEFAULT_VP_DISTANCE * 0.4;
                break;

            case '3': // Toggle left view
                selectedView = "3";
                VP_DISTANCE = DEFAULT_VP_DISTANCE * 0.8;
                break;

            case '4': // Toggle axonometric view
                selectedView = "4"
                break;

            case 'r': // Reset
                VP_DISTANCE = DEFAULT_VP_DISTANCE;
                THETA = 0;
                GAMMA = 0;
                break;

            case 'w': // Rise UP
                if (ropeSize > MIN_ROPE_SIZE) // Not so precise as max because the min size is > 0
                    ropeSize = ropeSize - L3 * 0.1;
                break;

            case 's': // Lower Tip
                let preCalcRope = ropeSize + L3 * 0.1;

                if (preCalcRope < MAX_ROPE_SIZE) // E3 aqui é o Cart Height
                    ropeSize = preCalcRope;
                else 
                    ropeSize = MAX_ROPE_SIZE;

                break;

            case 'i': // Expand Base
                if (CURRENT_SECOND_SECTION_HEIGHT < MAX_SECOND_SECTION_HEIGHT) {
                    CURRENT_SECOND_SECTION_HEIGHT += 0.01 * MAX_SECOND_SECTION_HEIGHT;
                    topOfTowerHeight = CURRENT_SECOND_SECTION_HEIGHT + L2 * T2 + E2;
                    MAX_ROPE_SIZE = topOfTowerHeight + ROTATOR_HEIGHT - 1.25*E3;
                }
                break;

            case 'k': // Contract Base
                if (CURRENT_SECOND_SECTION_HEIGHT > MIN_SECOND_SECTION_HEIGHT){
                    CURRENT_SECOND_SECTION_HEIGHT -= 0.01 * MAX_SECOND_SECTION_HEIGHT;
                    topOfTowerHeight = CURRENT_SECOND_SECTION_HEIGHT + L2 * T2 + E2;
                    
                    MAX_ROPE_SIZE = topOfTowerHeight + ROTATOR_HEIGHT - 1.25*E3;
                    if (ropeSize > MAX_ROPE_SIZE){
                        ropeSize = MAX_ROPE_SIZE
                    }
                }
                
                break;

            case 'j': // Rotate CCW
                CRANE_ROTATION_ANGLE -= 1;
                break;

            case 'l': // Rotate CW
                CRANE_ROTATION_ANGLE += 1;
                break;

            case 'a': // Slider outwards
                const preCalcA = cartPosition + E3
                if (preCalcA <= MAX_CART_POSITION) {
                    cartPosition = preCalcA;
                }

                break;

            case 'd': // Slider inwards
                const preCalcD = cartPosition - E3;
                if (preCalcD > MIN_CART_POSITION) {
                    cartPosition = preCalcD;
                }
                break;

            case 'ArrowLeft': // Increase THETA
                THETA += 1;
                break;

            case 'ArrowRight': // Decrease THETA
                THETA -= 1;
                break;

            case 'ArrowUp': // Increase GAMMA
                if (GAMMA < 1.5) {
                    GAMMA += 0.1;
                }
                break;

            case 'ArrowDown': // Decrease GAMMA
                if (VP_DISTANCE / 3 + MAX_CRANE_HEIGHT/2 + GAMMA > MAX_CRANE_HEIGHT/2 + 0.1 ) {
                    GAMMA -= 0.1;
                }
                break;
        }
    }

    window.addEventListener("wheel", (evt) => {
        if (evt.deltaY > 0) {
            VP_DISTANCE += DEFAULT_VP_DISTANCE * 0.1;
        }    
        else {
            let preCalcZoom = VP_DISTANCE - DEFAULT_VP_DISTANCE * 0.1;
            if(preCalcZoom > DEFAULT_VP_DISTANCE * 0.1)
                VP_DISTANCE = preCalcZoom;
        }
    })

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    CUBE.init(gl);
    CYLINDER.init(gl);
    BUNNY.init(gl);
    gl.enable(gl.DEPTH_TEST);   // Enables Z-buffer depth test

    window.requestAnimationFrame(render);

    function resize_canvas(event) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        aspect = canvas.width / canvas.height;

        gl.viewport(0, 0, canvas.width, canvas.height);
        mProjection = () => ortho(-VP_DISTANCE * aspect * incIndex, VP_DISTANCE * aspect * incIndex, -VP_DISTANCE * incIndex, VP_DISTANCE * incIndex, -3 * VP_DISTANCE * incIndex, 3 * VP_DISTANCE * incIndex);
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
     * This is the cart that moves along the top bar
     */
    function cart() {
        multScale([L3 + E3, E3, L3 + E3])
        uploadModelView(COLOR_CART)
        CUBE.draw(gl, program, mode)
    }

    /**
     * This is the rope that goes up and down from the cart
     */
    function rope(rope_size) {
        multTranslation([0, -rope_size / 2, 0]); //ropeSize 
        multScale([E3, rope_size, E3]); // ropeSize

        uploadModelView(COLOR_ROPE);
        CYLINDER.draw(gl, program, mode);
    }

    /**
     * This is the cart and the rope that moves along the top bar
     */
    function cart_and_rope(rope_size) { 
        pushMatrix();
        /**/cart();
        popMatrix();

        multTranslation([0, -E3 / 2, 0]);
        rope(rope_size);
    }

    /**
     * Draws the Crane's counter weight
     */
    function counter_weight() {
        // This piece of code was the previous counterweight, boring old cube
        // multScale([L3 + E3, L3 + E3, L3 + E3])
        // uploadModelView(CLOLOR_COUTNER_WEIGHT)
        // CUBE.draw(gl, program, mode)

        pushMatrix(); //4 ropes that support the counter weight
            counter_weight_ropes();
        popMatrix();

        
        multTranslation([0, -L3, 0]); // position the base of the counter weight

        pushMatrix(); // the base of the counter weight
        /**/multScale([L3, E3, L3]);
        /**/uploadModelView(COLOR_COUNTER_WEIGHT);
        /**/CUBE.draw(gl, program, mode);
        popMatrix();

        multTranslation([0, E3/2, 0]); //conspensete half the height of the base of the counter weight

        multRotationY(90);
        // The counter weight
        multScale([(L3 + E3) * 5, (L3 + E3) * 5, (L3 + E3) * 5]);
        uploadModelView(COLOR_BUNNY);
        BUNNY.draw(gl, program, mode);
    }

    /**
     * 4 counter weight ropes
     */
    function counter_weight_ropes() {
        multTranslation([0, -(L3- E3)/2, 0]); // para centrar os eixos xyz no centro da posição das cordas
        
        pushMatrix();
        /**/multTranslation([-(L3 - E3)/2 , 0, -(L3 - E3)/2 ]);
        /**/CW_ROPE();
        popMatrix();

        pushMatrix();
        /**/multTranslation([(L3 - E3)/2 , 0, -(L3 - E3)/2 ]);
        /**/CW_ROPE();
        popMatrix();

        pushMatrix();
        /**/multTranslation([-(L3 - E3)/2 , 0, (L3 - E3)/2 ]);
        /**/CW_ROPE();
        popMatrix();
        
        multTranslation([(L3 - E3)/2 , 0, (L3 - E3)/2 ]);
        CW_ROPE();
        
    }

    /**
     * Single counter weight rope
     */
    function CW_ROPE() { 
        multScale([E3, L3, E3]);
        uploadModelView(COLOR_ROPE);
        CYLINDER.draw(gl, program, mode);
    }

    /**
     * This is the top bar of the crane in the cross axis
     * -> This part is static
     */
    function top_bar(cart_position, rope_size) {
        pushMatrix();
        /**/top_bar_forward();
        popMatrix();

        pushMatrix();
        /**/top_bar_backward();
        popMatrix();

        pushMatrix(); 
        /**/multTranslation([0, -E3 * 2, cart_position]);/*cartPosition*/
        /**/multRotationZ(-30);
        /**/multTranslation([-(L3) / 2 - E3, 3*E3/4 , 0]);
        /**/cart_and_rope(rope_size);
        popMatrix();

        multRotationZ(-30);
        multTranslation([-(L3) / 2, -E3, (-(L3+E3)*(T4-1)) + ((L3) / 2)]);
        counter_weight();
    }

    /**
     * Draws the section of the top bar that goes forward
     */
    function top_bar_forward() {
        for (let i = 0; i < T3 + 1; i++) {
            pushMatrix();
            /**/prismBase();
            popMatrix();

            pushMatrix();
            /**/sidesOfPrism();
            popMatrix();

            multTranslation([0, 0, L3]);
        }
        prismBase();
        
        /*
         * READ ME:
         *      Este cliclo for em comentário é equivalente ao anterior e é o representado no grafo de cena, mas é menos eficiente 
         * pq faz mais push e pop de matrizes e mais 1 multTranslation no final
         */
        // for (let i = 0; i < T3 + 1; i++) {
        //     pushMatrix();
        //         multTranslation([0, 0, L3*i]);
        //         pushMatrix();
        //         /**/prismBase();
        //         popMatrix();

        //         pushMatrix();
        //         /**/sidesOfPrism();
        //         popMatrix();
        //     popMatrix();
            
        // }
        // multTranslation([0, 0, L3 * (T3 + 1)]);
        // prismBase();
    }

    /**
     * Draws the section of the top bar that goes backwards
     */
    function top_bar_backward() {
        for (let i = 0; i < T4; i++) {
            multTranslation([0, 0, -L3]);

            pushMatrix();
            /**/sidesOfPrism();
            popMatrix();

            pushMatrix();
            /**/prismBase();
            popMatrix();
        }

        /*
         * READ ME:
         *      Este cliclo for em comentário é equivalente ao anterior e é o representado no grafo de cena, mas é menos eficiente 
         * pq faz mais push e pop de matrizes
         */
        // for (let i = 0; i < T4; i++) {
        //     pushMatrix();
        //         multTranslation([0, 0, -L3*(i+1)]);

        //         pushMatrix();
        //         /**/sidesOfPrism();
        //         popMatrix();

        //         pushMatrix();
        //         /**/prismBase();
        //         popMatrix();
        //     popMatrix();
        // }
    }

    /**
     * This is the base of the crane
     * -> This part is static
     */
    function first_section() {
        for (let i = 0; i < T1; i++) { // Create each block of the first section
            pushMatrix();
            /**/cubeBase(true);
            popMatrix();
            
            pushMatrix();
            /**/sidesOfCube(true);
            popMatrix();

            multTranslation([0, L1, 0]);
        }
        cubeBase(true);

        /*
         * READ ME:
         *      Este cliclo for em comentário é equivalente ao anterior e é o representado no grafo de cena, mas é menos eficiente 
         * pq faz mais push e pop de matrizes e tem de fazer mais um multTranslation no final
         */ 
        // for (let i = 0; i < T1; i++) { // Create each block of the first section
        //     pushMatrix();
        //         multTranslation([0, L1 * i, 0]);
                
        //         pushMatrix();
        //             cubeBase(true);
        //         popMatrix();
                
        //         pushMatrix();
        //             sidesOfCube(true);
        //         popMatrix();
        //     popMatrix();
        // }
        // multTranslation([0, L1 * T1, 0]);
        // cubeBase(true);
    }

    /**
     * The second section of the crane
     * -> This is the part of the crane that goes up and down
     */
    function second_section() {

        for (let i = 0; i < T2; i++) { // Create each block of the second section
            pushMatrix();
            /**/cubeBase(false);
            popMatrix();
            
            pushMatrix();
            /**/sidesOfCube(false);
            popMatrix();
            
            multTranslation([0, L2, 0]);
        }
        cubeBase(false);

        /*
         * READ ME:
         *      Este cliclo for em comentário é equivalente ao anterior e é o representado no grafo de cena, mas é menos eficiente 
         * pq faz mais push e pop de matrizes
         */
        // for (let i = 0; i < T2; i++) { // Create each block of the first section
        //     pushMatrix();
        //         multTranslation([0, L2 * i, 0]);
                
        //         pushMatrix();
        //             cubeBase(false);
        //         popMatrix();
                
        //         pushMatrix();
        //             sidesOfCube(false);
        //         popMatrix();
        //     popMatrix();
        // }
        // multTranslation([0, L2 * T2, 0]);
        // cubeBase(false);
    }

    /**
     * Draws the tower of the crane
     */
    function tower(second_section_height) {
        pushMatrix();
        /**/first_section();
        popMatrix();
        
        multTranslation([-E1, second_section_height, -E1]); /* CURRENT_SECOND_SECTION_HEIGHT */
        second_section();
    }

    /**
     * Create the floor with 2 tones, grey and white
     */
    function floor() {
        multTranslation([0, -FLOOR_BLOCK_SIZE / 200, 0])
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

        /**
         *      READ ME:
         *      Este cliclo for em comentário faz o mesmo que o anterior e é o representado no grafo de cena, mas é menos eficiente 
         * pq faz mais push e pop de matrizes
         
        for (let i = 0; i < FLOOR_SIZE; i++) { // Create each block of the floor
            pushMatrix();
                multTranslation([0, 0, i]);
                
                for (let j = 0; j < FLOOR_SIZE; j++) {
                    pushMatrix();
                        multTranslation([j, 0, 0]);
                        let color = ((i + j) % 2) == 0 ? COLOR_FLOOR_1 : COLOR_FLOOR_2;
                        
                        uploadModelView(color);
                        CUBE.draw(gl, program, mode);
                    popMatrix();
                }
            popMatrix();
            
        }
        */
    }

    /** 

     * Draws the beam from witch the prisms are made of
     */
    function prismBeam() {
        multTranslation([0, L3 / 2, 0]); // To centre the axis xyz
        multScale([E3, L3, E3]);
        uploadModelView(COLOR_BEAM);
        CUBE.draw(gl, program, mode);
    }

    /**
     * Draws the Base of the prism
     */
    function prismBase() {

        pushMatrix();
        /**/prismBeam();
        popMatrix();

        pushMatrix();
        /**/multRotationZ(60);
        /**/prismBeam();
        popMatrix();

        multTranslation([0, L3, 0]);
        multRotationZ(120);
        prismBeam();
    }

    /**
     * Draws the side Beams of the prism
     */
    function sidesOfPrism() {
        
        pushMatrix();
        /**/multRotationX(90);
        /**/multRotationY(-30);
        /**/prismBeam();
        popMatrix();

        pushMatrix();
        /**/multTranslation([0, L3, 0]);
        /**/multRotationX(90);
        /**/multRotationY(-30);
        /**/prismBeam();
        popMatrix();

        multRotationZ(60);
        multTranslation([0, L3, 0]);
        multRotationX(90);
        prismBeam();
    }

    function cubeBeam(isFirstSection) {
        let l = L1;
        let e = E1;
        let color = COLOR_BEAM;
        if (!isFirstSection) { l = L2; e = E2; color = COLOR_BEAM_2; }

        multTranslation([e / 2, l / 2, e / 2]); // To centre the axis xyz
        multScale([e, l, e]);
        uploadModelView(color);
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
        /**/cubeBeam(isFirstSection);
        popMatrix();

        pushMatrix();
        /**/multRotationZ(90);
        /**/cubeBeam(isFirstSection);
        popMatrix();

        pushMatrix();
        /**/multTranslation([e, l, 0]);
        /**/multRotationZ(90);
        /**/cubeBeam(isFirstSection);
        popMatrix();
        
        multTranslation([-l, e, 0]);
        cubeBeam(isFirstSection);
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
        /**/cubeBeam(isFirstSection);
        popMatrix();

        pushMatrix();
        /**/multTranslation([-l, 0, 0]);
        /**/cubeBeam(isFirstSection);
        popMatrix();

        pushMatrix();
        /**/multTranslation([0, 0, -l]);
        /**/cubeBeam(isFirstSection);
        popMatrix();

        multTranslation([-l, 0, -l]);
        cubeBeam(isFirstSection);
    }

    /*
    * Draws the whole crane
    */
    function crane(top_of_tower_height, cart_position, rope_size, current_2nd_section_height, crane_rotation_angle) {
        pushMatrix();
        /**/multTranslation([-(L1 + E1) / 2, 0, -(L1 - E1) / 2]);
        /**/tower(current_2nd_section_height);
        popMatrix();

        // Translação por partes para explicar
        // multTranslation([0, top_of_tower_height + ROTATOR_HEIGHT / 2, 0]);   // Para por na altura actual da torre
        // multTranslation([-FLOOR_BLOCK_SIZE / 2, 0, -FLOOR_BLOCK_SIZE / 2]);  // Centar Eixo no centro da grua

        multTranslation([-FLOOR_BLOCK_SIZE / 2, top_of_tower_height + ROTATOR_HEIGHT / 2, -FLOOR_BLOCK_SIZE / 2]);
        multRotationY(crane_rotation_angle);

        pushMatrix();
        /**/rotator();
        popMatrix();

        multTranslation([0, ROTATOR_HEIGHT / 2 + 3 * E3 /4, -(L3 + E3) / 2]);
        multRotationY(90);
        multRotationZ(30);
        multTranslation([-E3/2, 0, -L3 / 2]);
        top_bar(cart_position, rope_size);
    }

    function render() {
        if (animation) time += speed;
        
        window.requestAnimationFrame(render);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(program);
        gl.uniformMatrix4fv(gl.getUniformLocation(program, "mProjection"), false, flatten(mProjection()));
        
        activeView = VIEWS()[selectedView]; 
        
        loadMatrix(activeView); // Load corresponding perspective matrix

        if (selectedView == "4") {
            multRotationY(THETA);
        }

        multTranslation([L1, 0, L1]); // Recentar o desenho no centro do ecrã
        
        pushMatrix();
        /**/floor();
        popMatrix();

        crane(topOfTowerHeight, cartPosition, ropeSize, CURRENT_SECOND_SECTION_HEIGHT, CRANE_ROTATION_ANGLE);
    }
}

const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then(shaders => setup(shaders))
