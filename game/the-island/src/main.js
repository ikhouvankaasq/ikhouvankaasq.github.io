import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2, 10);

const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
directionalLight.position.set(5, 10, 5);
scene.add(directionalLight);

const groundGeometry = new THREE.PlaneGeometry(20, 20);
const groundMaterial = new THREE.MeshStandardMaterial({ 
  color: 0x228b22 
});
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

const controls = new PointerLockControls(camera, document.body);

document.addEventListener('click', () => {
  controls.lock();
});

const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  jump: false,
  sprint: false
};

let canJump = false;
let velocityY = 0;
const gravity = -30;
const jumpStrength = 12;
const walkSpeed = 8;
const sprintSpeed = 14;
const groundLevel = 1.6;

let stamina = 100;
const maxStamina = 100;
const staminaDepletionRate = 30;
const staminaRegenRate = 10;
let isSprinting = false;

document.addEventListener('keydown', (e) => {
  switch (e.code) {
    case 'KeyW': keys.forward = true; break;
    case 'KeyS': keys.backward = true; break;
    case 'KeyA': keys.left = true; break;
    case 'KeyD': keys.right = true; break;
    case 'Space':
      if (canJump) {
        velocityY = jumpStrength;
        canJump = false;
      }
      break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.sprint = true;
      break;
  }
});

document.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW': keys.forward = false; break;
    case 'KeyS': keys.backward = false; break;
    case 'KeyA': keys.left = false; break;
    case 'KeyD': keys.right = false; break;
    case 'ShiftLeft':
    case 'ShiftRight':
      keys.sprint = false;
      break;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let prevTime = performance.now();
const staminaFill = document.getElementById('stamina-fill');
const instructions = document.getElementById('instructions');

function animate() {
  requestAnimationFrame(animate);

  const time = performance.now();
  const delta = (time - prevTime) / 1000;
  prevTime = time;

  if (controls.isLocked) {
    instructions.style.display = 'none';
    
    isSprinting = keys.sprint && stamina > 0 && (keys.forward || keys.backward || keys.left || keys.right);
    
    if (isSprinting) {
      stamina = Math.max(0, stamina - staminaDepletionRate * delta);
    } else {
      stamina = Math.min(maxStamina, stamina + staminaRegenRate * delta);
    }

    const currentSpeed = isSprinting ? sprintSpeed : walkSpeed;

    direction.z = Number(keys.forward) - Number(keys.backward);
    direction.x = Number(keys.right) - Number(keys.left);
    direction.normalize();

    if (keys.forward || keys.backward) velocity.z = direction.z * currentSpeed * delta;
    else velocity.z = 0;

    if (keys.left || keys.right) velocity.x = direction.x * currentSpeed * delta;
    else velocity.x = 0;

    controls.moveRight(velocity.x);
    controls.moveForward(velocity.z);

    velocityY += gravity * delta;
    camera.position.y += velocityY * delta;

    if (camera.position.y < groundLevel) {
      velocityY = 0;
      camera.position.y = groundLevel;
      canJump = true;
    }

    staminaFill.style.width = stamina + '%';
  } else {
    instructions.style.display = 'block';
  }

  renderer.render(scene, camera);
}

animate();
