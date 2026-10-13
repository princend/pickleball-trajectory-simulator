import * as THREE from "https://esm.sh/three@0.158.0";
import { OrbitControls } from "https://esm.sh/three@0.158.0/examples/jsm/controls/OrbitControls.js";

// === UI 收合邏輯 ===
const toggleUiBtn = document.getElementById("toggleUiBtn");
const uiContent = document.getElementById("ui-content");
toggleUiBtn.addEventListener("click", () => {
  if (uiContent.style.display === "none") {
    uiContent.style.display = "block";
    toggleUiBtn.innerText = "收合";
  } else {
    uiContent.style.display = "none";
    toggleUiBtn.innerText = "展開";
  }
});

// === UI 互動綁定 ===
const angleSlider = document.getElementById("angleSlider");
const powerSlider = document.getElementById("powerSlider");
const heightSlider = document.getElementById("heightSlider"); 

const angleVal = document.getElementById("angleVal");
const powerVal = document.getElementById("powerVal");
const heightVal = document.getElementById("heightVal"); 

const presetSelect = document.getElementById("shotPreset");
const spinTypeSelect = document.getElementById("spinType");

// 💡 完美參數表
const perfectPresets = {
  "drop-flat": { angle: 25.0, power: 11.3, height: 0.7 },
  "drop-topspin": { angle: 43.0, power: 20.7, height: 0.4 }, 
  "drive-flat": { angle: 13.0, power: 19.5, height: 0.8 },   
  "drive-topspin": { angle: 17.0, power: 30.0, height: 0.9 } 
};

function applyPerfectPreset() {
  const shot = presetSelect.value;
  const spin = spinTypeSelect.value;
  const key = `${shot}-${spin}`;
  const preset = perfectPresets[key];

  if (preset) {
    angleSlider.value = preset.angle;
    powerSlider.value = preset.power;
    heightSlider.value = preset.height;
    
    angleVal.innerText = preset.angle;
    powerVal.innerText = preset.power;
    heightVal.innerText = preset.height;
  }
  
  playShot();
}

presetSelect.addEventListener('change', applyPerfectPreset);
spinTypeSelect.addEventListener('change', applyPerfectPreset);
angleSlider.addEventListener('input', (e) => { angleVal.innerText = e.target.value; playShot(); });
powerSlider.addEventListener('input', (e) => { powerVal.innerText = e.target.value; playShot(); });
heightSlider.addEventListener('input', (e) => { heightVal.innerText = e.target.value; playShot(); });

// === 場景初始化 ===
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb5ff);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// 💡 RWD 攝影機初始化與縮放適應
function updateCameraRWD() {
  const aspect = window.innerWidth / window.innerHeight;
  camera.aspect = aspect;
  
  if (aspect < 1) {
    // 📱 手機直立畫面：將攝影機拉高、拉遠，避免球場被左右切掉
    camera.position.set(-10, 8, 16); 
  } else {
    // 💻 電腦寬螢幕：預設黃金視角
    camera.position.set(-7, 5, 11); 
  }
  camera.updateProjectionMatrix();
}

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, -1); 

// === 光源 ===
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// === 建立標準匹克球場 ===
const COURT_WIDTH = 6.10;
const COURT_LENGTH = 13.41;
const NVZ_DEPTH = 2.13;
const NET_HEIGHT = 0.86;

const courtGroup = new THREE.Group();

const groundGeo = new THREE.PlaneGeometry(20, 30);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x3d5a45 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
ground.position.y = -0.01;
courtGroup.add(ground);

const playAreaGeo = new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH);
const playAreaMat = new THREE.MeshStandardMaterial({ color: 0x1f4277 });
const playArea = new THREE.Mesh(playAreaGeo, playAreaMat);
playArea.rotation.x = -Math.PI / 2;
playArea.receiveShadow = true;
courtGroup.add(playArea);

const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
function createLine(w, h, x, z) {
  const line = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(x, 0.005, z);
  courtGroup.add(line);
}

const lw = 0.05;
createLine(COURT_WIDTH + lw, lw, 0, COURT_LENGTH / 2);
createLine(COURT_WIDTH + lw, lw, 0, -COURT_LENGTH / 2);
createLine(lw, COURT_LENGTH, COURT_WIDTH / 2, 0);
createLine(lw, COURT_LENGTH, -COURT_WIDTH / 2, 0);
createLine(COURT_WIDTH, lw, 0, NVZ_DEPTH); 
createLine(COURT_WIDTH, lw, 0, -NVZ_DEPTH); 
const serveDepth = (COURT_LENGTH / 2) - NVZ_DEPTH;
createLine(lw, serveDepth, 0, NVZ_DEPTH + serveDepth / 2);
createLine(lw, serveDepth, 0, -(NVZ_DEPTH + serveDepth / 2));

const netGeo = new THREE.PlaneGeometry(COURT_WIDTH + 0.5, NET_HEIGHT);
const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
const net = new THREE.Mesh(netGeo, netMat);
net.position.set(0, NET_HEIGHT / 2, 0);
courtGroup.add(net);
const netTopGeo = new THREE.BoxGeometry(COURT_WIDTH + 0.5, 0.05, 0.05);
const netTop = new THREE.Mesh(netTopGeo, new THREE.MeshBasicMaterial({color: 0xffffff}));
netTop.position.set(0, NET_HEIGHT, 0);
courtGroup.add(netTop);

scene.add(courtGroup);

// === 匹克球物件 ===
const actualRadius = 0.037; 
const ballGeo = new THREE.SphereGeometry(actualRadius * 2.5, 32, 32); 
const ballMat = new THREE.MeshStandardMaterial({ color: 0xcaff00, roughness: 0.3 });
const ball = new THREE.Mesh(ballGeo, ballMat);
ball.castShadow = true;
scene.add(ball);

let trajectoryLine = null;
let animationFrameId = null;
let pathPoints = [];
let animIndex = 0;

// === 物理引擎核心 ===
function calculatePhysicsTrajectory(angleDeg, power, spinType, startHeight) {
  const g = 9.81; 
  const mass = 0.026; 
  const rho = 1.225; 
  const A = Math.PI * actualRadius * actualRadius; 
  const Cd = 0.5; 
  const COR = 0.75; 
  const FRICTION = 0.8; 

  let pos = new THREE.Vector3(1.5, startHeight, 6.7);
  let v = new THREE.Vector3();

  const angleRad = angleDeg * Math.PI / 180;
  const dirX = -0.05; 
  const dirY = Math.sin(angleRad);
  const dirZ = -Math.cos(angleRad);
  
  v.set(dirX * power, dirY * power, dirZ * power);

  const dt = 0.005; 
  const points = [pos.clone()];
  let hitNet = false;
  let bounceCount = 0;
  let isOut = false; 
  
  while (points.length < 2500) {
    let vMag = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
    if (vMag < 0.1 && bounceCount > 0) break; 

    let F_drag = 0.5 * rho * (vMag**2) * Cd * A;
    let a_drag = F_drag / mass;
    let ax = -a_drag * (v.x / vMag);
    let ay = -g - a_drag * (v.y / vMag);
    let az = -a_drag * (v.z / vMag);

    if (spinType === "topspin") {
      let Cl_dynamic = (angleDeg > 20) ? 1.5 : 0.35; 
      let F_magnus = 0.5 * rho * (vMag**2) * Cl_dynamic * A;
      let a_magnus = F_magnus / mass;
      ay -= a_magnus; 
    }

    v.x += ax * dt;
    v.y += ay * dt;
    v.z += az * dt;

    let nextPos = pos.clone().addScaledVector(v, dt);

    if (pos.z > 0 && nextPos.z <= 0) {
      if (nextPos.y < NET_HEIGHT) {
        hitNet = true;
        points.push(nextPos);
        break; 
      }
    }

    if (nextPos.y <= actualRadius) {
      nextPos.y = actualRadius; 
      v.y = -v.y * COR;         
      v.x = v.x * FRICTION;     
      v.z = v.z * FRICTION;
      
      if (bounceCount === 0) {
          if (nextPos.z > 0 || nextPos.z < -COURT_LENGTH/2 || Math.abs(nextPos.x) > COURT_WIDTH/2) {
              isOut = true;
          }
      }
      
      bounceCount++;
      if (bounceCount > 2) {
        points.push(nextPos);
        break;
      }
    }

    pos.copy(nextPos);
    points.push(pos.clone());
  }

  return { points, hitNet, isOut, firstBounceZ: points.find(p => p.y <= actualRadius)?.z };
}

function drawTrajectory(points, hitNet, isOut) {
  if (trajectoryLine) scene.remove(trajectoryLine);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  let lineColor = 0x00ff00; 
  if (hitNet) {
    lineColor = 0xff3333;   
  } else if (isOut) {
    lineColor = 0xff9800;   
  }

  const material = new THREE.LineBasicMaterial({ color: lineColor, linewidth: 3 });
  trajectoryLine = new THREE.Line(geometry, material);
  scene.add(trajectoryLine);
}

function playShot() {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  
  const angle = parseFloat(angleSlider.value);
  const power = parseFloat(powerSlider.value);
  const height = parseFloat(heightSlider.value); 
  const spinType = spinTypeSelect.value;
  const statusDiv = document.getElementById("status");
  
  const result = calculatePhysicsTrajectory(angle, power, spinType, height);
  pathPoints = result.points;
  
  drawTrajectory(pathPoints, result.hitNet, result.isOut);
  
  if (result.hitNet) {
    statusDiv.innerHTML = "❌ 擊球掛網！";
    statusDiv.style.color = "#ff3333";
  } else if (result.isOut) {
    statusDiv.innerHTML = "❌ 出界 (Out)！";
    statusDiv.style.color = "#ff9800";
  } else {
    if (result.firstBounceZ < 0 && result.firstBounceZ > -NVZ_DEPTH) {
        statusDiv.innerHTML = "🏆 完美！落入廚房區 (NVZ)";
        statusDiv.style.color = "#a4d955";
    } 
    else if (result.firstBounceZ < -5.5) {
        statusDiv.innerHTML = "🔥 好球！精準壓向底線深區";
        statusDiv.style.color = "#00e5ff";
    }
    else {
        statusDiv.innerHTML = "✅ 過網 (安全界內)";
        statusDiv.style.color = "#ffffff";
    }
  }
  
  animIndex = 0;
  ball.position.copy(pathPoints[0]);
  animateBall();
}

function animateBall() {
  if (animIndex < pathPoints.length) {
    ball.position.copy(pathPoints[animIndex]);
    animIndex += 3; 
    animationFrameId = requestAnimationFrame(animateBall);
  }
}

// 💡 RWD 事件監聽：當視窗縮放時（或手機旋轉螢幕），自動重新計算尺寸與攝影機位置
window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraRWD();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

document.getElementById("playBtn").addEventListener("click", playShot);

// 頁面載入時，觸發 RWD 判定與預設動畫
updateCameraRWD();
applyPerfectPreset();
animate();