// Doctor's Office 3D Horror - robust startup and all 3D assets
// Requires Three.js r152 loaded before this script.

(() => {
  // DOM references
  const ui = {
    money: null, hunger: null, hydration: null, treated: null, message: null,
    buyFood: null, buyWater: null
  };
  let overlay, startBtn, canvas;

  // Three.js essentials
  let scene, camera, renderer, clock;
  let player = { x: 0, z: 5, speed: 4, rotY: 0 };
  let keys = {};
  let patients = [];
  let raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2(0, 0); // center
  let money = 0, hunger = 100, hydration = 100, treatedCount = 0;
  let gameOver = false;
  let lastSpawnTime = 0, spawnInterval = 6;
  let started = false;

  // Defensive init after DOM ready
  window.addEventListener('DOMContentLoaded', () => {
    ui.money = document.getElementById('money');
    ui.hunger = document.getElementById('hunger');
    ui.hydration = document.getElementById('hydration');
    ui.treated = document.getElementById('treated');
    ui.message = document.getElementById('message');
    ui.buyFood = document.getElementById('buyFood');
    ui.buyWater = document.getElementById('buyWater');

    overlay = document.getElementById('overlay');
    startBtn = document.getElementById('startBtn');
    canvas = document.getElementById('gameCanvas');

    // Attach listeners
    startBtn.addEventListener('click', safeStart);
    canvas.addEventListener('keydown', (e) => {
      if (!started && (e.code === 'Enter' || e.code === 'Space')) safeStart();
    });

    // Buttons
    ui.buyFood.addEventListener('click', buyFood);
    ui.buyWater.addEventListener('click', buyWater);

    // Provide initial hint
    ui.message.textContent = 'Press Start Shift to begin. Use WASD to move, click to treat.';
  });

  // Safe start wrapper to catch errors and avoid double-init
  function safeStart() {
    if (started) {
      // If restarting after death, reload scene cleanly
      resetState();
      overlay.style.display = 'none';
      ui.message.textContent = 'Restarting shift...';
      return;
    }
    try {
      startGame();
    } catch (err) {
      console.error('Start failed:', err);
      ui.message.textContent = 'Failed to start. Open console for details.';
      overlay.style.display = 'flex';
    }
  }

  function startGame() {
    started = true;
    overlay.style.display = 'none';
    init();
    animate();
    // focus canvas so key events work immediately
    canvas.focus();
  }

  function resetState() {
    // Remove previous scene objects and stop animation by toggling gameOver then re-init
    gameOver = false;
    started = false;
    // Clear arrays
    patients.forEach(p => { try { scene.remove(p); } catch(e){} });
    patients = [];
    // Reset player and stats
    player = { x: 0, z: 5, speed: 4, rotY: 0 };
    money = 0; hunger = 100; hydration = 100; treatedCount = 0;
    lastSpawnTime = 0;
    // Re-init
    startGame();
  }

  function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.Fog(0x050505, 6, 30);

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(player.x, 1.6, player.z);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x050505);

    // Lights
    const ambient = new THREE.AmbientLight(0x404040, 1.2);
    scene.add(ambient);
    const keyLight = new THREE.DirectionalLight(0xfff7e6, 0.9);
    keyLight.position.set(2, 6, 2);
    scene.add(keyLight);
    const cold = new THREE.PointLight(0x66aaff, 0.6, 12);
    cold.position.set(-3, 2.5, -2);
    scene.add(cold);

    // Room: floor + walls
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0f0f0f, roughness: 0.95 });
    const back = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.2), wallMat); back.position.set(0, 2, -10); scene.add(back);
    const front = back.clone(); front.position.set(0, 2, 10); scene.add(front);
    const left = new THREE.Mesh(new THREE.BoxGeometry(20, 4, 0.2), wallMat); left.rotation.y = Math.PI/2; left.position.set(-10,2,0); scene.add(left);
    const right = left.clone(); right.position.set(10,2,0); scene.add(right);

    // Desk
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.1, roughness: 0.7 });
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.4), deskMat);
    desk.position.set(0, 0.45, 0);
    scene.add(desk);

    // Chair
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 0.8), chairMat);
    seat.position.set(-1.6, 0.25, 0.6);
    scene.add(seat);
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.12), chairMat);
    backrest.position.set(-1.6, 0.65, 1.0);
    scene.add(backrest);

    // Gurney
    const gurneyMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b });
    const gurney = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.8), gurneyMat);
    gurney.position.set(3.5, 0.35, -2.5);
    scene.add(gurney);

    // Lamp
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.2), new THREE.MeshStandardMaterial({ color: 0x999999 }));
    lampBase.position.set(2.5, 1.0, 3.5);
    scene.add(lampBase);
    const lampHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), new THREE.MeshStandardMaterial({ color: 0xfff1cc, emissive: 0x221100, emissiveIntensity: 0.6 }));
    lampHead.position.set(2.5, 1.6, 3.5);
    scene.add(lampHead);

    // Poster
    const posterMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.9 });
    const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), posterMat);
    poster.position.set(-4.5, 2.0, -6.9);
    poster.rotation.y = 0.05;
    scene.add(poster);

    // Clock
    clock = new THREE.Clock();

    // Input
    window.addEventListener('keydown', (e) => keys[e.code] = true);
    window.addEventListener('keyup', (e) => keys[e.code] = false);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('click', onClick);
    window.addEventListener('resize', onResize);

    // Spawn initial patients
    for (let i = 0; i < 3; i++) spawnPatient();

    // Reset stats
    money = 0; hunger = 100; hydration = 100; treatedCount = 0; gameOver = false; lastSpawnTime = 0;
    updateUI();
    ui.message.textContent = 'Shift started. Treat humans, avoid alternates.';
  }

  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(e) {
    if (gameOver) return;
    const movementX = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
    player.rotY -= movementX * 0.0025;
  }

  function onClick() {
    if (gameOver) return;
    treatPatient();
  }

  function spawnPatient() {
    const isAlternate = Math.random() < 0.35;
    const bodyColor = isAlternate ? 0x330000 : 0xdcdcdc;
    const emissive = isAlternate ? 0x220000 : 0x000000;

    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, emissive, roughness: 0.8 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.0, 0.35), bodyMat);
    torso.position.set(0, 0.8, 0);
    group.add(torso);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshStandardMaterial({ color: 0xf2d9c9, roughness: 0.9 }));
    head.position.set(0, 1.6, 0);
    group.add(head);

    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.18), bodyMat);
    leftLeg.position.set(-0.18, 0.25, 0);
    group.add(leftLeg);
    const rightLeg = leftLeg.clone(); rightLeg.position.set(0.18, 0.25, 0); group.add(rightLeg);

    // Random position not too close to player
    let x, z;
    let attempts = 0;
    do {
      x = (Math.random() - 0.5) * 14;
      z = (Math.random() - 0.5) * 14;
      attempts++;
      if (attempts > 50) break;
    } while (Math.hypot(x - player.x, z - player.z) < 3);

    group.position.set(x, 0, z);
    group.userData = { isAlternate, baseY: group.position.y, phase: Math.random() * Math.PI * 2 };

    scene.add(group);
    patients.push(group);
  }

  function movePatients(delta) {
    for (let p of patients) {
      p.userData.phase += delta * 2;
      p.position.y = p.userData.baseY + Math.sin(p.userData.phase) * 0.03;

      if (p.userData.isAlternate) {
        const dx = player.x - p.position.x;
        const dz = player.z - p.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
          const speed = 0.6;
          p.position.x += (dx / dist) * speed * delta;
          p.position.z += (dz / dist) * speed * delta;
        }
        if (Math.hypot(player.x - p.position.x, player.z - p.position.z) < 0.9 && !gameOver) {
          triggerDeath('An alternate reached you.');
        }
      } else {
        p.position.x += Math.sin(p.userData.phase * 0.5) * 0.02 * delta;
        p.position.z += Math.cos(p.userData.phase * 0.5) * 0.02 * delta;
      }
    }
  }

  function treatPatient() {
    if (!camera) return;
    raycaster.setFromCamera(mouse, camera);

    // Build mesh list for intersection
    const meshes = [];
    for (let g of patients) {
      g.traverse((m) => { if (m.isMesh) meshes.push(m); });
    }

    const intersects = raycaster.intersectObjects(meshes, false);
    if (!intersects.length) {
      ui.message.textContent = 'No patient in view.';
      return;
    }
    const hit = intersects[0];
    const dist = hit.distance;
    if (dist > 4) {
      ui.message.textContent = 'Too far to treat.';
      return;
    }

    // find parent group
    let parent = hit.object;
    while (parent && !patients.includes(parent)) parent = parent.parent;
    if (!parent) {
      ui.message.textContent = 'No patient found.';
      return;
    }

    if (parent.userData.isAlternate) {
      triggerDeath('You tried to treat an alternate.');
      return;
    }

    // treat human
    money += 15;
    treatedCount++;
    ui.message.textContent = 'You treated a human. They leave quietly.';
    scene.remove(parent);
    patients = patients.filter(p => p !== parent);
    setTimeout(spawnPatient, 1200);
    updateUI();
  }

  function triggerDeath(reason) {
    gameOver = true;
    ui.message.textContent = 'GAME OVER: ' + reason;
    overlay.style.display = 'flex';
    overlay.querySelector('#title').textContent = 'You Died';
    overlay.querySelector('#subtitle').textContent = reason + ' Shift ended.';
    startBtn.textContent = 'Try Again';
    started = false;
  }

  function buyFood() {
    if (gameOver) return;
    if (money >= 10) { money -= 10; hunger = Math.min(100, hunger + 25); ui.message.textContent = 'You eat something.'; updateUI(); }
    else ui.message.textContent = 'Not enough money for food.';
  }

  function buyWater() {
    if (gameOver) return;
    if (money >= 5) { money -= 5; hydration = Math.min(100, hydration + 25); ui.message.textContent = 'You drink water.'; updateUI(); }
    else ui.message.textContent = 'Not enough money for water.';
  }

  function updateUI() {
    if (!ui.money) return;
    ui.money.textContent = money.toString();
    ui.hunger.textContent = Math.max(0, hunger).toFixed(0);
    ui.hydration.textContent = Math.max(0, hydration).toFixed(0);
    ui.treated.textContent = treatedCount.toString();
  }

  function updateStats(delta) {
    hunger -= 1.5 * delta;
    hydration -= 2.2 * delta;
    if (hunger <= 0 || hydration <= 0) {
      if (!gameOver) triggerDeath('You neglected your own needs.');
    }
    updateUI();
  }

  function movePlayer(delta) {
    const forward = keys['KeyW'] || keys['ArrowUp'];
    const back = keys['KeyS'] || keys['ArrowDown'];
    const left = keys['KeyA'] || keys['ArrowLeft'];
    const right = keys['KeyD'] || keys['ArrowRight'];

    let mx = 0, mz = 0;
    if (forward) mz -= 1;
    if (back) mz += 1;
    if (left) mx -= 1;
    if (right) mx += 1;

    const len = Math.hypot(mx, mz);
    if (len > 0) { mx /= len; mz /= len; }

    const sin = Math.sin(player.rotY), cos = Math.cos(player.rotY);
    const dx = (mz * sin + mx * cos) * player.speed * delta;
    const dz = (mz * cos - mx * sin) * player.speed * delta;

    player.x += dx; player.z += dz;
    player.x = Math.max(-8.5, Math.min(8.5, player.x));
    player.z = Math.max(-8.5, Math.min(8.5, player.z));

    camera.position.set(player.x, 1.6, player.z);
    camera.rotation.set(0, player.rotY, 0, 'YXZ');
  }

  function spawnLoop(delta) {
    lastSpawnTime += delta;
    if (lastSpawnTime >= spawnInterval) {
      lastSpawnTime = 0;
      spawnPatient();
    }
  }

  function animate() {
    if (!clock) clock = new THREE.Clock();
    const delta = clock.getDelta();

    if (!gameOver) {
      movePlayer(delta);
      movePatients(delta);
      updateStats(delta);
      spawnLoop(delta);
    }

    // ensure camera rotation follows player
    if (camera) camera.rotation.y = player.rotY;

    if (renderer && scene && camera) renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }

  // Expose nothing globally; all handled inside IIFE
})();
