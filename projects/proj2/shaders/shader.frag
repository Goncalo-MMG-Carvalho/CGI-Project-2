precision highp float;

uniform vec4 uColor;

varying vec3 fNormal;

void main() {
    gl_FragColor = uColor;
    //gl_FragColor = vec4(abs(fNormal), 1.0);
}

