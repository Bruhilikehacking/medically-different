// Basic 3D horror doctor's office game using Three.js

let scene, camera, renderer;
let clock;
let player = {
  x: 0,
  z: 5,
  speed: 5,
  rotY: 0
};
let keys = {};
let patients = [];
let raycaster = new THREE.Raycaster();
let mouse = new THREE.Vector2(0, 0); // center of screen
let money = 0;
let hunger = 100;
let hydration = 100;
let treatedCount = 0;
let gameOver = false;
let lastSpawnTime = 0;
let spawnInterval = 5; // seconds
let uiMoney, uiHunger, uiHydration, uiTreated, uiMessage;
let overlay, startBtn;

window.addEventListener("load", () => {
  uiMoney = document.getElementById("money");
  uiHunger = document.getElementById("hunger");
  uiHydration = document.getElementById("hydration");
  uiTreated = document.getElementById("treated");
  uiMessage = document.getElementById("message");
  overlay = document.getElementById("overlay");
  startBtn = document.getElementById("startBtn");

  document.getElementById("buyFood").addEventListener("click", buyFood);
  document.getElementById("buyWater").addEventListener("click", buyWater);
  startBtn.addEventListener("click", startGame);

  // Keep mouse at center for raycasting
  mouse.set(0, 0);
});

function startGame() {
  overlay.style.display = "none";
  init();
  animate();
}

function init() {
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Fog for horror vibe
  scene.fog = new THREE.FogExp2(0x000000, 0.08);

  // Camera
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(player.x, 1.6, player.z);

  // Renderer
  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("gameCanvas"),
    antialias: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);

  // Lighting
  const ambient = new THREE.AmbientLight(0x222222);
  scene.add(ambient);

  const spot = new THREE.SpotLight(0xffffff, 2, 15, Math.PI / 6, 0.5, 1);
  spot.position.set(0, 3, 5);
  spot.target.position.set(0, 0, -5);
  scene.add(spot);
  scene.add(spot.target);

  // Floor
  const floorGeo = new THREE.PlaneGeometry(20, 20);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.9
  });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  // Walls (simple room)
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    roughness: 0.8
  });
  const wallGeo = new THREE.BoxGeometry(20, 4, 0.2);

  const wallBack = new THREE.Mesh(wallGeo, wallMat);
  wallBack.position.set(0, 2, -10);
  scene.add(wallBack);

  const wallFront = new THREE.Mesh(wallGeo, wallMat);
  wallFront.position.set(0, 2, 10);
  scene.add(wallFront);

  const wallLeft = new THREE.Mesh(wallGeo, wallMat);
  wallLeft.rotation.y = Math.PI / 2;
  wallLeft.position.set(-10, 2, 0);
  scene.add(wallLeft);

  const wallRight = new THREE.Mesh(wallGeo, wallMat);
  wallRight.rotation.y = Math.PI / 2;
  wallRight.position.set(10, 2, 0);
  scene.add(wallRight);

  // Simple desk
  const deskGeo = new THREE.BoxGeometry(3, 1, 1.5);
  const deskMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
  const desk = new THREE.Mesh(deskGeo, deskMat);
  desk.position.set(0, 0.5, 0);
  scene.add(desk);

  // Clock
  clock = new THREE.Clock();

  // Input
  window.addEventListener("keydown", (e) => (keys[e.code] = true));
  window.addEventListener("keyup", (e) => (keys[e.code] = false));
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("click", onClick);
  window.addEventListener("resize", onResize);

  // Initial patients
  for (let i = 0; i < 3; i++) {
    spawnPatient();
  }

  gameOver = false;
  money = 0;
  hunger = 100;
  hydration = 100;
  treatedCount = 0;
  updateUI();
  uiMessage.textContent = "Listen carefully. Some of them are wrong.";
}

function onResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(e) {
  if (gameOver) return;
  const movementX = e.movementX || 0;
  player.rotY -= movementX * 0.002;
}

function onClick() {
  if (gameOver) return;
  // Treat patient in the center of view
  treatPatient();
}

function spawnPatient() {
  const isAlternate = Math.random() < 0.35; // 35% chance
  const bodyGeo = new THREE.BoxGeometry(0.6, 1.6, 0.4);
  const color = isAlternate ? 0x550000 : 0xcccccc;
  const bodyMat = new THREE.MeshStandardMaterial({
    color,
    emissive: isAlternate ? 0x220000 : 0x000000
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);

  // Random position in room, but not too close to player
  let x, z;
  do {
    x = (Math.random() - 0.5) * 14;
    z = (Math.random() - 0.5) * 14;
  } while (Math.hypot(x - player.x, z - player.z) < 3);

  body.position.set(x, 0.8, z);

  // Slight idle animation data
  body.userData = {
    isAlternate,
    baseY: body.position.y,
    phase: Math.random() * Math.PI * 2
  };

  scene.add(body);
  patients.push(body);
}

function movePatients(delta) {
  patients.forEach((p) => {
    // Idle float
    p.userData.phase += delta;
    p.position.y = p.userData.baseY + Math.sin(p.userData.phase) * 0.05;

    // Alternates slowly drift toward you
    if (p.userData.isAlternate) {
      const dirX = player.x - p.position.x;
      const dirZ = player.z - p.position.z;
      const dist = Math.hypot(dirX, dirZ);
      if (dist > 0.1) {
        const speed = 0.5;
        p.position.x += (dirX / dist) * speed * delta;
        p.position.z += (dirZ / dist) * speed * delta;
      }

      // If they get too close, instant death
      if (dist < 0.8 && !gameOver) {
        triggerDeath("An alternate reached you.");
      }
    }
  });
}

function treatPatient() {
  // Raycast from camera center
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(patients, false);

  if (intersects.length === 0) {
    uiMessage.textContent = "No patient in reach.";
    return;
  }

  const target = intersects[0].object;
  const dist = intersects[0].distance;
  if (dist > 4) {
    uiMessage.textContent = "Too far to treat.";
    return;
  }

  const isAlternate = target.userData.isAlternate;

  if (isAlternate) {
    triggerDeath("You tried to treat an alternate.");
  } else {
    // Reward
    money += 15;
    treatedCount++;
    uiMessage.textContent = "You treated a human. They leave quietly.";
    // Remove patient
    scene.remove(target);
    patients = patients.filter((p) => p !== target);
    // Spawn a new one after a short delay
    setTimeout(spawnPatient, 1500);
  }

  updateUI();
}

function triggerDeath(reason) {
  gameOver = true;
  uiMessage.textContent = "GAME OVER: " + reason;
  overlay.style.display = "flex";
  overlay.querySelector("#title").textContent = "You Died";
  overlay.querySelector("#subtitle").textContent = reason + " Shift ended.";
  startBtn.textContent = "Try Again";
}

function buyFood() {
  if (gameOver) return;
  if (money >= 10) {
    money -= 10;
    hunger = Math.min(100, hunger + 25);
    uiMessage.textContent = "You eat something. The room feels quieter.";
    updateUI();
  } else {
    uiMessage.textContent = "Not enough money for food.";
  }
}

function buyWater() {
  if (gameOver) return;
  if (money >= 5) {
    money -= 5;
    hydration = Math.min(100, hydration + 25);
    uiMessage.textContent = "You drink water. For a moment, you feel human.";
    updateUI();
  } else {
    uiMessage.textContent = "Not enough money for water.";
  }
}

function updateUI() {
  uiMoney.textContent = money.toString();
  uiHunger.textContent = Math.max(0, hunger).toFixed(0);
  uiHydration.textContent = Math.max(0, hydration).toFixed(0);
  uiTreated.textContent = treatedCount.toString();
}

function updateStats(delta) {
  // Hunger and hydration drain over time
  hunger -= 2 * delta;
  hydration -= 3 * delta;

  if (hunger <= 0 || hydration <= 0) {
    if (!gameOver) {
      triggerDeath("You neglected your own needs.");
    }
  }

  updateUI();
}

function movePlayer(delta) {
  const forward = keys["KeyW"] || keys["ArrowUp"];
  const backward = keys["KeyS"] || keys["ArrowDown"];
  const left = keys["KeyA"] || keys["ArrowLeft"];
  const right = keys["KeyD"] || keys["ArrowRight"];

  let moveX = 0;
  let moveZ = 0;

  if (forward) moveZ -= 1;
  if (backward) moveZ += 1;
  if (left) moveX -= 1;
  if (right) moveX += 1;

  const len = Math.hypot(moveX, moveZ);
  if (len > 0) {
    moveX /= len;
    moveZ /= len;
  }

  const sin = Math.sin(player.rotY);
  const cos = Math.cos(player.rotY);

  const worldDX = (moveZ * sin + moveX * cos) * player.speed * delta;
  const worldDZ = (moveZ * cos - moveX * sin) * player.speed * delta;

  player.x += worldDX;
  player.z += worldDZ;

  // Clamp inside room
  player.x = Math.max(-8.5, Math.min(8.5, player.x));
  player.z = Math.max(-8.5, Math.min(8.5, player.z));

  camera.position.set(player.x, 1.6, player.z);
  camera.rotation.set(0, player.rotY, 0);
}

function spawnLoop(delta) {
  lastSpawnTime += delta;
  if (lastSpawnTime >= spawnInterval) {
    lastSpawnTime = 0;
    spawnPatient();
  }
}

function animate() {
  if (!clock) return;
  const delta = clock.getDelta();

  if (!gameOver) {
    movePlayer(delta);
    movePatients(delta);
    updateStats(delta);
    spawnLoop(delta);
  }

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
