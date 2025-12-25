import * as THREE from 'three';
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import './style.css';

// --- CONFIGURATION ---
const CONFIG = {
  particleCount: 20000,
  particleSize: 0.15,
  interactionRadius: 25,
  colors: [0x00ffff, 0xff00ff, 0xffff00, 0x00ff00, 0xff3333], // Cyan, Magenta, Yellow, Green, Red
  cameraZ: 50,
};

// --- STATE ---
const state = {
  currentShapeIndex: 0,
  isPinching: false,
  handPosition: new THREE.Vector3(1000, 1000, 1000), // Start off-screen
  targetPositions: [],
  shapeNames: ["Sphere", "Heart", "Saturn", "Torus", "DNA Helix"],
  viewSize: { width: 1, height: 1 } // Will be updated
};

// --- THREE.JS SETUP ---
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050505, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = CONFIG.cameraZ;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x000000, 0);
document.body.appendChild(renderer.domElement);

// --- VISUAL CURSOR ---
// A ring to show where the AI thinks your hand is
const cursorGeometry = new THREE.RingGeometry(1, 1.2, 32);
const cursorMaterial = new THREE.MeshBasicMaterial({ 
  color: 0xffffff, 
  side: THREE.DoubleSide, 
  transparent: true, 
  opacity: 0.5 
});
const cursor = new THREE.Mesh(cursorGeometry, cursorMaterial);
scene.add(cursor);

// --- PARTICLE SYSTEM ---
const geometry = new THREE.BufferGeometry();
const positions = new Float32Array(CONFIG.particleCount * 3);
const colors = new Float32Array(CONFIG.particleCount * 3);
const velocities = [];

const colorObj = new THREE.Color();
const baseColor = new THREE.Color(CONFIG.colors[0]);

for (let i = 0; i < CONFIG.particleCount; i++) {
  positions[i * 3] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 100;

  colors[i * 3] = baseColor.r;
  colors[i * 3 + 1] = baseColor.g;
  colors[i * 3 + 2] = baseColor.b;

  velocities.push({ x: 0, y: 0, z: 0 });
}

geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Create a softly glowing particle material
const textureLoader = new THREE.TextureLoader();
const sprite = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/spark1.png');

const material = new THREE.PointsMaterial({
  size: CONFIG.particleSize,
  map: sprite,
  vertexColors: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  transparent: true,
  opacity: 0.9
});

const particles = new THREE.Points(geometry, material);
scene.add(particles);

// --- SHAPE GENERATORS ---
const Shapes = {
  sphere: () => {
    const r = 20;
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    return {
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi)
    };
  },
  heart: () => {
    const t = Math.random() * Math.PI * 2;
    const scale = 1.3;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    const z = (Math.random() - 0.5) * 8;
    return { x: x * scale, y: y * scale, z: z };
  },
  saturn: () => {
    const r = Math.random();
    if (r > 0.4) {
      const p = Shapes.sphere();
      return { x: p.x * 0.5, y: p.y * 0.5, z: p.z * 0.5 };
    } else {
      const angle = Math.random() * Math.PI * 2;
      const dist = 16 + Math.random() * 12;
      return {
        x: Math.cos(angle) * dist,
        y: (Math.random() - 0.5) * 0.5,
        z: Math.sin(angle) * dist
      };
    }
  },
  torus: () => {
    const u = Math.random() * Math.PI * 2;
    const v = Math.random() * Math.PI * 2;
    const R = 18; 
    const r = 5;
    return {
      x: (R + r * Math.cos(v)) * Math.cos(u),
      y: (R + r * Math.cos(v)) * Math.sin(u),
      z: r * Math.sin(v)
    };
  },
  helix: (i) => {
    const t = i * 0.05;
    const r = 10;
    const h = 45;
    const strand = i % 2 === 0 ? 0 : Math.PI;
    const y = ((i % CONFIG.particleCount) / CONFIG.particleCount) * h - (h / 2);
    return {
      x: r * Math.cos(t + strand),
      y: y,
      z: r * Math.sin(t + strand)
    };
  }
};

function calculateShape(index) {
  const targets = [];
  const generator = Object.values(Shapes)[index % Object.keys(Shapes).length];
  for (let i = 0; i < CONFIG.particleCount; i++) {
    // For helix we need the index, so we pass it (others ignore it)
    if (index === 4) targets.push(Shapes.helix(i));
    else targets.push(generator());
  }
  return targets;
}

// Initialize
state.targetPositions = calculateShape(0);

// --- LOGIC ---
function updateViewSize() {
  // Calculate visible height/width at Z=0
  const vFOV = THREE.MathUtils.degToRad(camera.fov);
  const height = 2 * Math.tan(vFOV / 2) * camera.position.z;
  const width = height * camera.aspect;
  state.viewSize = { width, height };
}
updateViewSize();

function switchShape() {
  state.currentShapeIndex = (state.currentShapeIndex + 1) % state.shapeNames.length;
  
  // UI Update
  const shapeNameEl = document.getElementById('shape-name');
  if(shapeNameEl) shapeNameEl.innerText = state.shapeNames[state.currentShapeIndex];
  
  state.targetPositions = calculateShape(state.currentShapeIndex);

  // Color Flash
  const newColor = new THREE.Color(CONFIG.colors[state.currentShapeIndex % CONFIG.colors.length]);
  const colorsArr = particles.geometry.attributes.color.array;
  
  // Smoothly transition color? For now, instant with physics chaos is fun
  // Let's just set the array.
  for (let i = 0; i < CONFIG.particleCount; i++) {
    colorsArr[i * 3] = newColor.r;
    colorsArr[i * 3 + 1] = newColor.g;
    colorsArr[i * 3 + 2] = newColor.b;
  }
  particles.geometry.attributes.color.needsUpdate = true;
  
  // Visual feedback on cursor
  const originalColor = cursorMaterial.color.getHex();
  cursorMaterial.color.setHex(0xffffff);
  setTimeout(() => cursorMaterial.color.setHex(originalColor), 200);
}

// --- MEDIAPIPE ---
const videoElement = document.getElementById('video-input') || document.createElement('video');
// Ensure video element exists for Camera utils even if we create it dynamically
if (!document.getElementById('video-input')) {
  videoElement.id = 'video-input';
  document.body.appendChild(videoElement);
}

function onResults(results) {
  const loading = document.getElementById('loading');
  if (loading) loading.style.opacity = '0'; // Fade out
  setTimeout(() => { if(loading) loading.style.display = 'none'; }, 500);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // 1. Map Coordinates
    // Index tip is 8
    const indexTip = landmarks[8];
    
    // Invert X for mirroring
    const x = (0.5 - indexTip.x) * state.viewSize.width;
    const y = (0.5 - indexTip.y) * state.viewSize.height;
    
    // Smoothing
    state.handPosition.lerp(new THREE.Vector3(x, y, 0), 0.3);

    // Update Cursor
    cursor.position.copy(state.handPosition);
    cursor.visible = true;

    // 2. Pinch Detection
    const thumbTip = landmarks[4];
    const distance = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
    
    // Threshold depends on how far the hand is, but 0.05 is decent for normalized coords
    const isPinchingNow = distance < 0.05;

    if (isPinchingNow && !state.isPinching) {
      // Pinch STARTED
      state.isPinching = true;
      switchShape();
      cursor.scale.set(0.5, 0.5, 0.5);
      cursorMaterial.color.set(0xff0000); // Red when pinching
    } else if (!isPinchingNow && state.isPinching) {
      // Pinch ENDED
      state.isPinching = false;
      cursor.scale.set(1, 1, 1);
      cursorMaterial.color.set(0xffffff);
    }

  } else {
    // No hand
    state.handPosition.set(1000, 1000, 1000);
    cursor.visible = false;
  }
}

// Initialize Hands
// We use a CDN-based locateFile to avoid local asset issues
const hands = new Hands({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
  }
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

hands.onResults(onResults);

// Initialize Camera
const cameraUtils = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480
});
cameraUtils.start();


// --- ANIMATION LOOP ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  const delta = clock.getDelta();
  const time = clock.getElapsedTime();

  // Scene rotation
  particles.rotation.y = time * 0.05;

  const positionsArr = particles.geometry.attributes.position.array;
  
  // Pre-calculate rotation matrix for hand interaction
  // We need to transform hand position into the particle's local space (which is rotating)
  // Or simpler: Transform particle world position?
  // Let's do the inverse rotation on the hand pos to get "local hand pos"
  const cosR = Math.cos(-particles.rotation.y);
  const sinR = Math.sin(-particles.rotation.y);
  const localHandX = state.handPosition.x * cosR - state.handPosition.z * sinR;
  const localHandZ = state.handPosition.x * sinR + state.handPosition.z * cosR;
  const localHandY = state.handPosition.y;

  for (let i = 0; i < CONFIG.particleCount; i++) {
    const idx = i * 3;
    const px = positionsArr[idx];
    const py = positionsArr[idx + 1];
    const pz = positionsArr[idx + 2];

    const tx = state.targetPositions[i].x;
    const ty = state.targetPositions[i].y;
    const tz = state.targetPositions[i].z;

    let vx = velocities[i].x;
    let vy = velocities[i].y;
    let vz = velocities[i].z;

    // 1. Home Force (Spring to shape)
    vx += (tx - px) * 0.03; 
    vy += (ty - py) * 0.03;
    vz += (tz - pz) * 0.03;

    // 2. Hand Interaction
    const dx = px - localHandX;
    const dy = py - localHandY;
    const dz = pz - localHandZ;
    const distSq = dx*dx + dy*dy + dz*dz;

    if (distSq < CONFIG.interactionRadius * CONFIG.interactionRadius) {
      const dist = Math.sqrt(distSq);
      const force = (CONFIG.interactionRadius - dist) / CONFIG.interactionRadius;
      
      // Swirl Vector: Cross product of (dx,dy,dz) and Up(0,1,0) -> (dz, 0, -dx) roughly
      // Actually let's just make them move away or towards
      
      if (state.isPinching) {
         // Explode/Repel
         const repel = force * 2.0;
         vx += dx * repel;
         vy += dy * repel;
         vz += dz * repel;
      } else {
         // Attract with a bit of randomness
         const attract = force * 8.0;
         vx -= dx * attract * 0.1; // Pull in
         vy -= dy * attract * 0.1;
         vz -= dz * attract * 0.1;
         
         // Add some noise/turbulence
         vx += (Math.random() - 0.5) * 0.5;
         vy += (Math.random() - 0.5) * 0.5;
         vz += (Math.random() - 0.5) * 0.5;
      }
    }

    // 3. Damping
    vx *= 0.92;
    vy *= 0.92;
    vz *= 0.92;

    positionsArr[idx] += vx;
    positionsArr[idx + 1] += vy;
    positionsArr[idx + 2] += vz;

    velocities[i].x = vx;
    velocities[i].y = vy;
    velocities[i].z = vz;
  }

  particles.geometry.attributes.position.needsUpdate = true;
  renderer.render(scene, camera);
}

animate();

// --- RESIZE ---
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateViewSize();
});
