# Interactive Hand Particles

A futuristic, hand-controlled 3D particle system. Move your hand to interact with 20,000 glowing particles in real-time.

## features

- **Gesture Control**:
  - 👋 **Hover / Move Hand**: Creates a gravitational field that attracts particles.
  - 👌 **Pinch (Index + Thumb)**: Switches the particle shape and triggers a repulsive explosion effect.
- **Dynamic Shapes**: Morph between Sphere, Heart, Saturn, Torus, and DNA Helix.
- **Visual Feedback**: A holographic cursor tracks your hand position in real-time.
- **Performance**: Optimized for smooth performance with 20,000 particles using Three.js and Vite.

## Setup & Run

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the App**:
   ```bash
   npm run dev
   ```

3. **Enjoy**:
   Open the link (usually http://localhost:5173). Allow camera access.

## Tech Stack
- **Three.js**: 3D rendering engine.
- **MediaPipe Hands**: Machine learning for hand tracking.
- **Vite**: Modern frontend tooling.
