attribute vec2 vOldPosition;

varying vec2 vNewPosition;

void main() {
    vNewPosition = vOldPosition + normalize(vOldPosition)*0.01;
}