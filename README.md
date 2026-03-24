# 🌌 3D Particle Galaxy (WebGL)

A stunning, interactive 3D particle galaxy created with WebGL and JavaScript. 

This project simulates a rotating galaxy consisting of 100,000 glowing particles, featuring complex orbital mechanics, depth-based sizing, additive light blending, and interactive camera rotation & zooming using only mathematics and basic GLSL shaders. No external graphics libraries like Three.js are used!

## ✨ Features
- **100,000 Unique Particles**: Spread across multiple winding spiral branches using targeted mathematical density and exponential random distribution curves.
- **Dynamic Color Temperature**: The galaxy shifts from a warm "yellow-orange" core to a "deep blue" cooling perimeter. 
- **Smooth Interaction**:
  - **Camera Pan**: Move your mouse naturally to smoothly tilt and orbit around the 3D galaxy.
  - **Zoom Support**: Use your scroll-wheel / trackpad to zoom intensely close into the cosmic dust, or far out to reveal the grand spiral.
- **Performant**: Runs smoothly by computing movements directly on the GPU using custom vertex and fragment shaders.

## 🚀 Running Locally

You don't need to install any heavy build tools or frameworks. Since it's pure HTML/JS, you just need a standard local server.

1. Clone the repository:
   ```bash
   git clone https://github.com/KChaviraa/Particle-Galaxy-WebGL.git
   cd Particle-Galaxy-WebGL
   ```

2. Start a local server (e.g. using Python):
   ```bash
   python3 -m http.server 8080
   ```

3. Open your browser and navigate to:
   [http://localhost:8080](http://localhost:8080)

## 🛠️ Built With
- **HTML5 & CSS3** - Modern layout and styling.
- **Raw WebGL** - Directly programmed native rendering pipeline.
- [**gl-matrix**](https://glmatrix.net/) - A lightweight library for standardized mathematical Mat4 matrix transformations.
