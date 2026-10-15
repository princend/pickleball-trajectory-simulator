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
const playBtn = document.getElementById("playBtn");
const recordBtn = document.getElementById("recordBtn");

// 💡 完美參數表（已根據真實物理模型校正，且高度完全對齊 HTML step="0.1"）
const perfectPresets = {
  "drop-flat": { angle: 25.0, power: 11.3, height: 0.7 },
  "drop-topspin": { angle: 27.0, power: 12.0, height: 0.5 }, 
  "drive-flat": { angle: 13.0, power: 19.5, height: 0.8 },   
  "drive-topspin": { angle: 12.5, power: 22.0, height: 0.8 } 
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

// 監聽下拉選單與滑桿變化
presetSelect.addEventListener("change", applyPerfectPreset);
spinTypeSelect.addEventListener("change", applyPerfectPreset);
angleSlider.addEventListener("input", (e) => { angleVal.innerText = e.target.value; playShot(); });
powerSlider.addEventListener("input", (e) => { powerVal.innerText = e.target.value; playShot(); });
heightSlider.addEventListener("input", (e) => { heightVal.innerText = e.target.value; playShot(); });

// === 場景初始化 ===
const container = document.getElementById("canvas-container");
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6eb5ff); // 天空藍

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

// 💡 RWD 攝影機動態適應
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

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

// === 建立標準匹克球場 (公制單位: 公尺) ===
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
createLine(COURT_WIDTH + lw, lw, 0, COURT_LENGTH / 2); // 南底線
createLine(COURT_WIDTH + lw, lw, 0, -COURT_LENGTH / 2); // 北底線
createLine(lw, COURT_LENGTH, COURT_WIDTH / 2, 0); // 東邊線
createLine(lw, COURT_LENGTH, -COURT_WIDTH / 2, 0); // 西邊線
createLine(COURT_WIDTH, lw, 0, NVZ_DEPTH); // 南廚房線
createLine(COURT_WIDTH, lw, 0, -NVZ_DEPTH); // 北廚房線
const serveDepth = (COURT_LENGTH / 2) - NVZ_DEPTH;
createLine(lw, serveDepth, 0, NVZ_DEPTH + serveDepth / 2); // 南發球中線
createLine(lw, serveDepth, 0, -(NVZ_DEPTH + serveDepth / 2)); // 北發球中線

// 實體球網
const netGeo = new THREE.PlaneGeometry(COURT_WIDTH + 0.5, NET_HEIGHT);
const netMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
const net = new THREE.Mesh(netGeo, netMat);
net.position.set(0, NET_HEIGHT / 2, 0);
courtGroup.add(net);
const netTopGeo = new THREE.BoxGeometry(COURT_WIDTH + 0.5, 0.05, 0.05);
const netTop = new THREE.Mesh(netTopGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
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

// === 物理引擎核心：RK4 (四階龍格－庫塔法) + 真實空氣動力學模型 ===
function calculatePhysicsTrajectory(angleDeg, power, spinType, startHeight) {
  const g = 9.81; 
  const mass = 0.026; // 標準匹克球質量 26g
  const rho = 1.225;  // 標準空氣密度 kg/m^3
  const A = Math.PI * actualRadius * actualRadius; 
  const Cd = 0.5;     // 多孔球風阻係數
  const COR = 0.65;   // USAPA 標準地面垂直恢復係數 (約 0.64~0.66)
  const FRICTION = 0.78; // 地面水平摩擦保留係數

  // 馬格努斯效應常數 (以職業選手強烈上旋 1800 RPM 計算)
  const TOPSPIN_RPM = 1800;
  const omega = (TOPSPIN_RPM * 2 * Math.PI) / 60; // 約 188.5 rad/s
  const CL_COEFF = 0.22; // 多孔球馬格努斯升力比例係數

  let pos = new THREE.Vector3(1.5, startHeight, 6.7);
  
  // 發射方向正規化，確保合速度嚴格等於 power
  const angleRad = (angleDeg * Math.PI) / 180;
  let dir = new THREE.Vector3(-0.05, Math.sin(angleRad), -Math.cos(angleRad)).normalize();
  let v = dir.multiplyScalar(power);

  const dt = 0.005; 
  const points = [pos.clone()];
  let hitNet = false;
  let bounceCount = 0;
  let isOut = false; 
  let firstBounceZ = null;
  let spinDecay = 1.0; // 觸地後旋轉衰減倍率

  // 計算加速度輔助函數 (包含重力、3D 空氣阻力、3D 正交馬格努斯力)
  function getAcceleration(velocity) {
    let vMag = velocity.length();
    if (vMag < 0.0001) return new THREE.Vector3(0, -g, 0);

    // 1. 空氣阻力 (與速度向量反向)
    let a_drag_mag = (0.5 * rho * (vMag ** 2) * Cd * A) / mass;
    let ax = -a_drag_mag * (velocity.x / vMag);
    let ay = -g - a_drag_mag * (velocity.y / vMag);
    let az = -a_drag_mag * (velocity.z / vMag);

    // 2. 馬格努斯效應 (與速度向量嚴格垂直: F_m ∝ ω × v)
    if (spinType === "topspin") {
      let r_omega = actualRadius * omega * spinDecay;
      let a_magnus_mag = (0.5 * rho * A * (CL_COEFF * r_omega) * vMag) / mass;
      let vxz = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

      if (vxz > 0.0001) {
        // 垂直下壓分量
        ay -= a_magnus_mag * (vxz / vMag);
        // 水平分量 (上升時微幅向後減速、下降時微幅向前加速，維持動能守恆)
        let a_magnus_horiz = a_magnus_mag * (velocity.y / vMag);
        ax += a_magnus_horiz * (velocity.x / vxz);
        az += a_magnus_horiz * (velocity.z / vxz);
      }
    }

    return new THREE.Vector3(ax, ay, az);
  }
  
  while (points.length < 2500) {
    let vMag = v.length();
    if (vMag < 0.1 && bounceCount > 0) break; 

    // --- RK4 四階取樣計算 ---
    let dv1 = getAcceleration(v);
    let dx1 = v.clone();

    let v2 = v.clone().addScaledVector(dv1, dt * 0.5);
    let dv2 = getAcceleration(v2);
    let dx2 = v2.clone();

    let v3 = v.clone().addScaledVector(dv2, dt * 0.5);
    let dv3 = getAcceleration(v3);
    let dx3 = v3.clone();

    let v4 = v.clone().addScaledVector(dv3, dt);
    let dv4 = getAcceleration(v4);
    let dx4 = v4.clone();

    let nextPos = pos.clone().add(
      dx1.clone().add(dx2.clone().multiplyScalar(2)).add(dx3.clone().multiplyScalar(2)).add(dx4).multiplyScalar(dt / 6)
    );
    
    v.add(
      dv1.clone().add(dv2.clone().multiplyScalar(2)).add(dv3.clone().multiplyScalar(2)).add(dv4).multiplyScalar(dt / 6)
    );

    // 網子碰撞偵測 (使用線性內插計算 Z=0 瞬間的精確高度，並考量球體半徑)
    if (pos.z > 0 && nextPos.z <= 0) {
      let t_net = pos.z / (pos.z - nextPos.z);
      let y_at_net = pos.y + t_net * (nextPos.y - pos.y);
      let x_at_net = pos.x + t_net * (nextPos.x - pos.x);

      if (y_at_net - actualRadius < NET_HEIGHT) {
        hitNet = true;
        points.push(new THREE.Vector3(x_at_net, y_at_net, 0));
        break; 
      }
    }

    // 地面彈跳偵測
    if (nextPos.y <= actualRadius) {
      nextPos.y = actualRadius; 
      v.y = -v.y * COR;         
      v.x = v.x * FRICTION;     
      v.z = v.z * FRICTION;
      spinDecay *= 0.4; // 落地摩擦後旋轉大幅衰減
      
      if (bounceCount === 0) {
        firstBounceZ = nextPos.z;
        if (nextPos.z > 0 || nextPos.z < -COURT_LENGTH / 2 || Math.abs(nextPos.x) > COURT_WIDTH / 2) {
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

  return { points, hitNet, isOut, firstBounceZ };
}

// 根據狀態決定軌跡顏色 (好球綠色 / 掛網紅色 / 出界橘色)
function drawTrajectory(points, hitNet, isOut) {
  if (trajectoryLine) scene.remove(trajectoryLine);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  let lineColor = 0x00ff00; // 預設亮綠色
  if (hitNet) {
    lineColor = 0xff3333;   // 掛網紅色
  } else if (isOut) {
    lineColor = 0xff9800;   // 出界橘色
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
    if (result.firstBounceZ !== null && result.firstBounceZ < 0 && result.firstBounceZ > -NVZ_DEPTH) {
      statusDiv.innerHTML = "🏆 完美！落入廚房區 (NVZ)";
      statusDiv.style.color = "#a4d955";
    } 
    else if (result.firstBounceZ !== null && result.firstBounceZ < -5.5) {
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
  } else if (pathPoints.length > 0) {
    // 確保球停在最後一個位置
    ball.position.copy(pathPoints[pathPoints.length - 1]);
  }
}

// ==========================================
// 🎥 手動控制：開始錄影 / 結束錄影並下載影片
// ==========================================
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

function toggleRecording() {
  // 如果正在錄影 -> 按下按鈕即「結束錄影」
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    return;
  }

  // 如果尚未錄影 -> 按下按鈕即「開始錄影」
  const stream = renderer.domElement.captureStream(60);

  // 優先使用 Threads 支援度最高的 MP4 格式，若瀏覽器不支援則退回 WebM
  const mimeTypes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm"
  ];
  const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || "";

  // 設定高畫質流量 (8 Mbps)，避免上傳 Threads 被壓縮變糊
  mediaRecorder = new MediaRecorder(stream, {
    mimeType: selectedMime,
    videoBitsPerSecond: 8000000
  });

  recordedChunks = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const ext = selectedMime.includes("mp4") ? "mp4" : "webm";
    const blob = new Blob(recordedChunks, { type: selectedMime || "video/webm" });
    const url = URL.createObjectURL(blob);

    // 自動觸發下載
    const a = document.createElement("a");
    a.href = url;
    a.download = `pickleball-${presetSelect.value}-${spinTypeSelect.value}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    // 恢復按鈕外觀
    isRecording = false;
    recordBtn.innerText = "🎥 錄影";
    recordBtn.classList.remove("recording");
  };

  isRecording = true;
  recordBtn.innerText = "⏹️ 結束";
  recordBtn.classList.add("recording");

  mediaRecorder.start();
  playShot(); // 按下開始錄影時先自動發第一球，之後你可以自由按「揮拍擊球」或轉視角！
}

recordBtn.addEventListener("click", toggleRecording);
playBtn.addEventListener("click", playShot);

// RWD 視窗大小與攝影機自動適應監聽
window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  updateCameraRWD();
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// 初始化執行
updateCameraRWD();
applyPerfectPreset();
animate();