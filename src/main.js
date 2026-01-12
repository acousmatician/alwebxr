import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer;
let listener, sound, audioLoader;
let audioReady = false;

// --- OSC bridge (browser -> ws://127.0.0.1:8081 -> UDP OSC) ---
let oscWS;

function sendOSC(address, args = []) {
  const ws = oscWS && oscWS.readyState <= 1 ? oscWS : (oscWS = new WebSocket("ws://127.0.0.1:8081"));
  const msg = JSON.stringify({ address, args });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(msg);
  } else {
    ws.addEventListener("open", () => ws.send(msg), { once: true });
  }
}

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(
    70,
    window.innerWidth / window.innerHeight,
    0.01,
    200
  );
  camera.position.set(0, 1.6, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x666666 })
  );
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Optional Blender-exported model
new GLTFLoader().load(
  import.meta.env.BASE_URL + "assets/models/Studio_Try_1.glb",
  (gltf) => {
    scene.add(gltf.scene);

    // Inspect named objects
    gltf.scene.traverse((obj) => {
      if (obj.name === "audio_main") {
        console.log("Found audio anchor:", obj.name);
        // later: attach positional audio here
      }
    });
  }
);


  // Audio
  listener = new THREE.AudioListener();
  camera.add(listener);

  sound = new THREE.Audio(listener);
  audioLoader = new THREE.AudioLoader();

  document.getElementById("play").onclick = async () => {
  if (!audioReady) {
    await loadAudio(import.meta.env.BASE_URL + "assets/audio/DarkGlass.wav");
    audioReady = true;
  }

  sound.play();
  document.getElementById("stop").disabled = false;

  // Send OSC message on play
  sendOSC("/alwebxr/play", [1]);
};


  document.getElementById("stop").onclick = () => {
  if (sound.isPlaying) sound.stop();

  // Send OSC message on stop
  sendOSC("/alwebxr/stop", [0]);
};


  window.addEventListener("resize", onResize);
}

function loadAudio(url) {
  return new Promise((resolve) => {
    audioLoader.load(url, (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.7);
      resolve();
    });
  });
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  renderer.setAnimationLoop(() => renderer.render(scene, camera));
}
