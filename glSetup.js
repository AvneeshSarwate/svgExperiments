const glCanvas = document.querySelector("#glCanvas");
glCanvas.width = 1920*rd*2;
glCanvas.height = 1080*rd*2;

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
const webgl2Supported = !!document.querySelector("#glCanvas").getContext("webgl2");
const gl = document.querySelector("#glCanvas").getContext(webgl2Supported ? "webgl2" : "webgl", {
    alpha: false,
    depth: false,
    antialias: true,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true
});
const frameBuffers = [twgl.createFramebufferInfo(gl), twgl.createFramebufferInfo(gl)];

const arrays = {
    position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
};
const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

let textures = {}; 

let frameBufferIndex = 0;

function render(time) {
    // if(twgl.resizeCanvasToDisplaySize(gl.canvas)){
    //     twgl.resizeFramebufferInfo(gl, frameBuffers[0]);
    //     twgl.resizeFramebufferInfo(gl, frameBuffers[1]);
    // }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    twgl.setTextureFromElement(gl, textures.svgFrame, svgCanvas);
    twgl.setTextureFromElement(gl, textures.eyeVideo1, eyeVideo1);
    twgl.setTextureFromElement(gl, textures.eyeVideo2, eyeVideo2);
    twgl.setTextureFromElement(gl, textures.eyeVideo3, eyeVideo3);
    twgl.setTextureFromElement(gl, textures.selfieVid, selfieVid);

    const uniforms = {
        time: time * 0.001,
        resolution: [gl.canvas.width, gl.canvas.height],
        svgFrame: textures.svgFrame,
        eyeVideo1: textures.eyeVideo1,
        eyeVideo2: textures.eyeVideo2,
        eyeVideo3: textures.eyeVideo3,
        selfieVid: textures.selfieVid,
        backbuffer: frameBuffers[frameBufferIndex].attachments[0],
        circlePositions: flock.boids.map(b => [b.position.x, b.position.y]).flat(),
        circleRadii: flock.boids.map(b => b.svgElement.ry()),
        cameraBlend: sliders[2]/127,
        feedbackRotation: sliders[1]/127,
        rd: rd
    };

    gl.useProgram(programInfo.program);
    twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
    twgl.setUniforms(programInfo, uniforms);

    twgl.bindFramebufferInfo(gl, frameBuffers[(frameBufferIndex+1)%2]);
    twgl.drawBufferInfo(gl, bufferInfo);

    const uniforms_stage2 = {
        time: time * 0.001,
        resolution: [gl.canvas.width, gl.canvas.height],
        lastStage: frameBuffers[(frameBufferIndex+1)%2].attachments[0],
        warpSlider: sliders[3]/127,
        baseCutSlider: sliders[4]/127
    }

    gl.useProgram(programInfo_stage2.program);
    twgl.setBuffersAndAttributes(gl, programInfo_stage2, bufferInfo);
    twgl.setUniforms(programInfo_stage2, uniforms_stage2);

    twgl.bindFramebufferInfo(gl);
    twgl.drawBufferInfo(gl, bufferInfo);

    frameBufferIndex = (frameBufferIndex+1)%2;
    
    redraw();
    fpsMeter.tick();
    requestAnimationFrame(render);
    
}

const shaderPaths = {
    header: webgl2Supported ? "header.frag" : "header_gl1.frag",
    pass1: webgl2Supported ? 'eyebeamSVG.glsl' : "shader1_gl1.glsl",
    pass2: webgl2Supported ? 'eyebeamSVG_stage2.glsl' : "shader2_gl1.glsl"
};

const headerFSreq = $.get(shaderPaths.header);
const fsReq = $.get(shaderPaths.pass1);
const fsReq2 = $.get(shaderPaths.pass2);
let programInfo;// = twgl.createProgramInfo(gl, ["vs", "fs"]);
let programInfo_stage2;// = twgl.createProgramInfo(gl, ["vs", "fs"]);

let gl1TextureOptions = webgl2Supported ? {} : {min: gl.LINEAR, mag: gl.LINEAR, wrap: gl.CLAMP_TO_EDGE};

let createTextureInfo = (srcElem, tag) => {
    let sizeOptions = {width: srcElem.videoWidth, height: srcElem.videoHeight};
    let info = Object.assign({src: srcElem, elemName: tag}, gl1TextureOptions);
    if(sizeOptions.height) return Object.assign(info, sizeOptions);
    else return info;
}

let shadersAndVideos;
let initializer = ev => {
    console.log("clicked");
    shadersAndVideos = [headerFSreq, fsReq, fsReq2, eyeVideo1.play(), eyeVideo2.play(), eyeVideo3.play(), selfieVid.play()];
    console.log("setting up promises", shadersAndVideos);
    Promise.all(shadersAndVideos).then( shaderArray => {
        console.log("shaderArray", shaderArray);
    
        const glTextureSources = {
            svgFrame: createTextureInfo(svgCanvas, "svg"), 
            eyeVideo1: createTextureInfo(eyeVideo1, "vid1"),
            eyeVideo2: createTextureInfo(eyeVideo2, "vid2"),
            eyeVideo3: createTextureInfo(eyeVideo3, "vid3"),
            selfieVid: createTextureInfo(selfieVid, "cam")
        };

        textures = twgl.createTextures(gl, glTextureSources);

        programInfo = twgl.createProgramInfo(gl, [webgl2Supported ? "vs" : "vs_gl1", shaderArray[0]+shaderArray[1]]);
        programInfo_stage2 = twgl.createProgramInfo(gl, [webgl2Supported ? "vs" : "vs_gl1", shaderArray[0]+shaderArray[2]]);


        requestAnimationFrame(render);
    }).catch(function(err){
        console.log(err)
    });

    if(!webgl2Supported) document.body.onclick = null;
};

if(webgl2Supported) initializer();
else document.body.onclick = initializer;