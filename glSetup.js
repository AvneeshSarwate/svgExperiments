const glCanvas = document.querySelector("#glCanvas");

//can enter/exit fullscreen display with spacebar
document.addEventListener("keyup", (event) => {
    console.log("key", event);
    if (event.code == "Space") {
        toggleFullScreen();
    }
    if (event.code == "KeyR") {
        const headerFSreq = $.get("header.frag");
        const fsReq = $.get("eyebeamSVG.glsl");
        Promise.all([headerFSreq, fsReq]).then( shaderArray => {
            console.log("shaderArray", shaderArray);
            programInfo = twgl.createProgramInfo(gl, ["vs", shaderArray[0]+shaderArray[1]]);
        });
    }
});
function toggleFullScreen() {
    if (!document.fullscreenElement) {
        glCanvas.requestFullscreen();
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

//setting up 
const gl = document.querySelector("#glCanvas").getContext("webgl2");
const frameBuffers = [twgl.createFramebufferInfo(gl), twgl.createFramebufferInfo(gl)];

const arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
};
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

const textures = twgl.createTextures(gl, {
    svgFrame: {src: svgCanvas}
});

let frameBufferIndex = 0;

function render(time) {
    if(twgl.resizeCanvasToDisplaySize(gl.canvas)){
        twgl.resizeFramebufferInfo(gl, frameBuffers[0]);
        twgl.resizeFramebufferInfo(gl, frameBuffers[1]);
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    twgl.setTextureFromElement(gl, textures.svgFrame, svgCanvas);

    const uniforms = {
        time: time * 0.001,
        resolution: [gl.canvas.width, gl.canvas.height],
        svgFrame: textures.svgFrame,
        backbuffer: frameBuffers[frameBufferIndex].attachments[0],
        circlePositions: flock.boids.map(b => [b.position.x, b.position.y]).flat(),
        circleRadii: flock.boids.map(b => b.svgElement.ry())
    };

    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);
    twgl.bindFramebufferInfo(gl, frameBuffers[(frameBufferIndex+1)%2]);
    twgl.drawBufferInfo(gl, bufferInfo);
    twgl.bindFramebufferInfo(gl);
    twgl.drawBufferInfo(gl, bufferInfo);

    frameBufferIndex = (frameBufferIndex+1)%2;
    
    requestAnimationFrame(render);
}

const headerFSreq = $.get("header.frag");
const fsReq = $.get("eyebeamSVG.glsl");
let programInfo = twgl.createProgramInfo(gl, ["vs", "fs"]);
Promise.all([headerFSreq, fsReq]).then( shaderArray => {
    console.log("shaderArray", shaderArray);
    programInfo = twgl.createProgramInfo(gl, ["vs", shaderArray[0]+shaderArray[1]]);
    requestAnimationFrame(render);
});