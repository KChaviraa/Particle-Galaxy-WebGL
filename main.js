const vsSource = `
    attribute vec3 aVertexPosition;
    attribute vec3 aColor;
    attribute vec2 aParams; // x: angle, y: radius

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform float uTime;

    varying lowp vec3 vColor;

    void main(void) {
        // Spiral animation logic
        float angle = aParams.x;
        float radius = aParams.y;
        
        // Rotate over time, inner particles rotate faster
        float timeEvolved = angle + uTime * (1.5 / (radius + 0.5));
        
        // Compute new position
        float x = cos(timeEvolved) * radius + aVertexPosition.x;
        float y = aVertexPosition.y; // Keep vertical spread
        float z = sin(timeEvolved) * radius + aVertexPosition.z;

        vec4 pos = vec4(x, y, z, 1.0);
        gl_Position = uProjectionMatrix * uModelViewMatrix * pos;
        
        // Size attenuation based on depth relative to camera
        gl_PointSize = max((20.0 / gl_Position.z), 1.0);
        
        vColor = aColor;
    }
`;

const fsSource = `
    varying lowp vec3 vColor;

    void main(void) {
        // Make it circular with soft edges
        lowp vec2 coord = gl_PointCoord - vec2(0.5);
        lowp float dist = length(coord);
        if (dist > 0.5) {
            discard;
        }
        
        // Soft glowing effect
        lowp float alpha = smoothstep(0.5, 0.1, dist);
        
        gl_FragColor = vec4(vColor, alpha);
    }
`;

function initWebGL() {
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl', { alpha: false, premultipliedAlpha: false });

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    // Resize canvas to full screen
    function resize() {
        canvas.width = window.innerWidth * window.devicePixelRatio;
        canvas.height = window.innerHeight * window.devicePixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    // Compile Shaders
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return;
    }

    const programInfo = {
        program: shaderProgram,
        attribLocations: {
            vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
            color: gl.getAttribLocation(shaderProgram, 'aColor'),
            params: gl.getAttribLocation(shaderProgram, 'aParams'),
        },
        uniformLocations: {
            projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
            modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
            time: gl.getUniformLocation(shaderProgram, 'uTime'),
        },
    };

    // Generate Galaxy Data
    const numParticles = 100000;
    const branches = 5;
    const maxRadius = 20.0;
    
    const positions = new Float32Array(numParticles * 3);
    const colors = new Float32Array(numParticles * 3);
    const params = new Float32Array(numParticles * 2);

    // Color palettes for galaxy
    const colorInside = [1.0, 0.6, 0.4]; // Warm orange/pink/yellow
    const colorOutside = [0.2, 0.4, 1.0]; // Cool blue

    for (let i = 0; i < numParticles; i++) {
        // Base polar coordinates using power factor for density near center
        const radius = Math.pow(Math.random(), 1.5) * maxRadius;
        const branchAngle = ((i % branches) / branches) * Math.PI * 2;
        
        const i3 = i * 3;
        const i2 = i * 2;

        // Gaussian random for spread
        const randomX = (Math.random() + Math.random() + Math.random() - 1.5);
        const randomY = (Math.random() + Math.random() + Math.random() - 1.5);
        const randomZ = (Math.random() + Math.random() + Math.random() - 1.5);
        
        const spreadFactor = Math.pow(radius / maxRadius, 0.5) * 1.5;

        // Position offset (base offsets around the radius)
        positions[i3] = randomX * spreadFactor; // X offset
        
        // Thickness of galaxy decreases at edges, bulging in the middle
        positions[i3 + 1] = randomY * (1.2 - (radius / maxRadius)) * 2.0; // Y (height/thickness)
        
        positions[i3 + 2] = randomZ * spreadFactor; // Z offset

        // Params: initial angle and radius
        params[i2] = branchAngle + (maxRadius - radius) * 0.4; // Start angle with inward curl
        params[i2 + 1] = radius;

        // Interpolate color based on radius and add randomness
        const mixRatio = radius / maxRadius;
        colors[i3] = Math.min(1.0, Math.max(0.0, lerp(colorInside[0], colorOutside[0], mixRatio) + (Math.random() * 0.2 - 0.1)));
        colors[i3 + 1] = Math.min(1.0, Math.max(0.0, lerp(colorInside[1], colorOutside[1], mixRatio) + (Math.random() * 0.2 - 0.1)));
        colors[i3 + 2] = Math.min(1.0, Math.max(0.0, lerp(colorInside[2], colorOutside[2], mixRatio) + (Math.random() * 0.2 - 0.1)));
    }

    // Buffers
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);

    const paramsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, paramsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, params, gl.STATIC_DRAW);

    // Mouse Interaction
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0.5; // Slight initial tilt down
    let currentRotationY = 0;
    let targetZoom = -45.0;
    let currentZoom = -45.0;

    window.addEventListener('mousemove', (e) => {
        const mouseX = (e.clientX / window.innerWidth) * 2 - 1;
        const mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
        
        targetRotationY = mouseX * Math.PI * 0.5; // Look left/right max 90 degrees
        targetRotationX = 0.5 + mouseY * Math.PI * 0.25; // Look up/down base 0.5 + variance
    });

    window.addEventListener('wheel', (e) => {
        targetZoom += e.deltaY * 0.05;
        // Clamp the zoom so the user can't fly completely out of bounds or through the center
        targetZoom = Math.max(-100.0, Math.min(-5.0, targetZoom));
    }, { passive: true });

    let startTime = Date.now();

    // Render Loop
    function render() {
        gl.clearColor(0.03, 0.03, 0.05, 1.0);
        gl.clearDepth(1.0);
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        
        // Additive blending for gorgeous light emission
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Smoothly interpolate rotation and zoom
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        currentZoom += (targetZoom - currentZoom) * 0.05;

        // Matrices using gl-matrix
        const projectionMatrix = mat4.create();
        mat4.perspective(projectionMatrix,
            45 * Math.PI / 180,
            canvas.width / canvas.height,
            0.1,
            200.0);

        const modelViewMatrix = mat4.create();
        
        // Base camera placement
        mat4.translate(modelViewMatrix, modelViewMatrix, [0.0, 0.0, currentZoom]);
        
        // Apply mouse rotation
        mat4.rotate(modelViewMatrix, modelViewMatrix, currentRotationX, [1, 0, 0]); 
        mat4.rotate(modelViewMatrix, modelViewMatrix, currentRotationY, [0, 1, 0]);

        // Tilt galaxy purely
        mat4.rotate(modelViewMatrix, modelViewMatrix, 0.2, [0, 0, 1]); // slight static tilt

        gl.useProgram(programInfo.program);

        // Attributes setup
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.color, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.color);

        gl.bindBuffer(gl.ARRAY_BUFFER, paramsBuffer);
        gl.vertexAttribPointer(programInfo.attribLocations.params, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.params);

        // Uniforms setup
        gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        
        const time = (Date.now() - startTime) * 0.001;
        gl.uniform1f(programInfo.uniformLocations.time, time);

        // Render particles
        gl.drawArrays(gl.POINTS, 0, numParticles);

        requestAnimationFrame(render);
    }

    render();
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function lerp(start, end, amt) {
    return (1 - amt) * start + amt * end;
}

window.onload = initWebGL;
