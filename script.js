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
const rpmSlider = document.getElementById("rpmSlider");

const angleVal = document.getElementById("angleVal");
const powerVal = document.getElementById("powerVal");
const heightVal = document.getElementById("heightVal");
const rpmVal = document.getElementById("rpmVal");

const presetSelect = document.getElementById("shotPreset");
const spinTypeSelect = document.getElementById("spinType");
const playBtn = document.getElementById("playBtn");
const recordBtn = document.getElementById("recordBtn");

// 💡 100% 地球真實物理黃金參數表 (職業級上旋約 2000 RPM)
const perfectPresets = {
  "drop-flat": { angle: 25.0, power: 11.3, height: 0.7, rpm: 0 },
  "drop-topspin": { angle: 27.0, power: 12.2, height: 0.5, rpm: 2000 },
  "drive-flat": { angle: 13.0, power: 19.5, height: 0.8, rpm: 0 },
  "drive-topspin": { angle: 12.5, power: 22.5, height: 0.8, rpm: 2000 }
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
    rpmSlider.value = preset.rpm;

    angleVal.innerText = preset.angle;
    powerVal.innerText = preset.power;
    heightVal.innerText = preset.height;
    rpmVal.innerText = preset.rpm;
  }

  playShot();
}

// 監聽下拉選單與滑桿變化
presetSelect.addEventListener("change", applyPerfectPreset);
spinTypeSelect.addEventListener("change", applyPerfectPreset);

// 當拉動 RPM 轉速滑桿時，自動同步切換平擊/上旋選單
rpmSlider.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  rpmVal.innerText = val;
  if (val > 0 && spinTypeSelect.value !== "topspin") {
    spinTypeSelect.value = "topspin";
  } else if (val === 0 && spinTypeSelect.value !== "flat") {
    spinTypeSelect.value = "flat";
  }
  playShot();
});

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
let referenceLine = null; // 半透明白色對照線（顯示 0 RPM 無馬格努斯力時的原始軌跡）
let animationFrameId = null;
let pathPoints = [];
let animIndex = 0;

// === 物理引擎核心：100% 嚴格地球空氣動力學 (RK4 + 二次風阻 + 正交馬格努斯外積) ===
function calculatePhysicsTrajectory(angleDeg, power, spinRPM, startHeight) {
  const g = 9.81;        // 地球標準重力加速度 m/s^2
  const mass = 0.026;    // 標準匹克球質量 26g (0.026 kg)
  const rho = 1.225;     // 地球海平面標準空氣密度 1.225 kg/m^3
  const A = Math.PI * actualRadius * actualRadius; // 球體橫截面積
  const Cd = 0.50;       // 多孔塑膠球風洞實測阻力係數
  const COR = 0.65;      // USAPA 法規標準地面垂直恢復係數
  const FRICTION = 0.78; // 地面水平摩擦保留係數
  const CL_SLOPE = 0.28; // 多孔球馬格努斯升力斜率係數 (CL = CL_SLOPE * S)

  // 將 RPM 轉為角速度 rad/s
  let omega = (spinRPM * 2 * Math.PI) / 60.0;

  let pos = new THREE.Vector3(1.5, startHeight, 6.7);

  // 發射方向向量正規化，確保初速度大小嚴格等於 power
  const angleRad = (angleDeg * Math.PI) / 180;
  let dir = new THREE.Vector3(-0.05, Math.sin(angleRad), -Math.cos(angleRad)).normalize();
  let v = dir.multiplyScalar(power);

  const dt = 0.005;
  const points = [pos.clone()];
  let hitNet = false;
  let bounceCount = 0;
  let isOut = false;
  let firstBounceZ = null;

  // 計算瞬時加速度 (嚴格遵守牛頓流體力學與馬格努斯正交外積)
  function getAcceleration(velocity, currentOmega) {
    let vMag = velocity.length();
    if (vMag < 0.0001) return new THREE.Vector3(0, -g, 0);

    // 1. 空氣阻力 F_d = -0.5 * rho * Cd * A * v * vec(v)
    let a_drag_mag = (0.5 * rho * (vMag ** 2) * Cd * A) / mass;
    let ax = -a_drag_mag * (velocity.x / vMag);
    let ay = -g - a_drag_mag * (velocity.y / vMag);
    let az = -a_drag_mag * (velocity.z / vMag);

    // 2. 馬格努斯力 F_m = 0.5 * rho * CL * A * v^2 * (hat(omega) x hat(v))
    // 其中旋轉比 S = (r * omega) / v，升力係數 CL = CL_SLOPE * S
    if (currentOmega > 0) {
      let r_omega = actualRadius * currentOmega;
      let a_magnus_mag = (0.5 * rho * A * (CL_SLOPE * r_omega) * vMag) / mass;
      let vxz = Math.sqrt(velocity.x ** 2 + velocity.z ** 2);

      if (vxz > 0.0001) {
        // 嚴格正交分解 (vec(F_m) · vec(v) = 0，完全遵守能量守恆)：
        // 垂直分量恆向下 (-y)
        ay -= a_magnus_mag * (vxz / vMag);
        // 水平分量：上升期 (vy > 0) 指向前下方；下降期 (vy < 0) 自然轉向後下方產生減速尾勁！
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

    // --- RK4 四階龍格－庫塔取樣積分 ---
    let dv1 = getAcceleration(v, omega);
    let dx1 = v.clone();

    let v2 = v.clone().addScaledVector(dv1, dt * 0.5);
    let dv2 = getAcceleration(v2, omega);
    let dx2 = v2.clone();

    let v3 = v.clone().addScaledVector(dv2, dt * 0.5);
    let dv3 = getAcceleration(v3, omega);
    let dx3 = v3.clone();

    let v4 = v.clone().addScaledVector(dv3, dt);
    let dv4 = getAcceleration(v4, omega);
    let dx4 = v4.clone();

    let nextPos = pos.clone().add(
      dx1.clone().add(dx2.clone().multiplyScalar(2)).add(dx3.clone().multiplyScalar(2)).add(dx4).multiplyScalar(dt / 6)
    );

    v.add(
      dv1.clone().add(dv2.clone().multiplyScalar(2)).add(dv3.clone().multiplyScalar(2)).add(dv4).multiplyScalar(dt / 6)
    );

    // 空中旋轉阻尼：球在空氣中飛行時，轉速每秒自然衰減約 5%
    omega *= (1.0 - 0.05 * dt);

    // 網子碰撞偵測 (使用線性內插算出 Z=0 瞬間的精確球底高度)
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

      // 上旋球觸地效應 (Topspin Kick)：前旋球咬住地面，保留更多向前動能、彈跳更低平
      let spinKick = Math.min(0.12, (omega / 250.0) * 0.08);
      v.x = v.x * (FRICTION + spinKick);
      v.z = v.z * (FRICTION + spinKick);
      omega *= 0.4; // 觸地摩擦後轉速衰減

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

// 繪製主軌跡與「無旋轉 (0 RPM) 對照虛線」
function drawTrajectory(points, hitNet, isOut, refPoints) {
  if (trajectoryLine) scene.remove(trajectoryLine);
  if (referenceLine) scene.remove(referenceLine);

  // 1. 若有開啟上旋，繪製半透明白色對照線（展示無馬格努斯力時的原始拋物線）
  if (refPoints && refPoints.length > 0) {
    const refGeo = new THREE.BufferGeometry().setFromPoints(refPoints);
    const refMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.35
    });
    referenceLine = new THREE.Line(refGeo, refMat);
    scene.add(referenceLine);
  }

  // 2. 繪製實際軌跡線
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
  const rpm = spinType === "topspin" ? parseFloat(rpmSlider.value) : 0;
  const statusDiv = document.getElementById("status");

  const result = calculatePhysicsTrajectory(angle, power, rpm, height);
  pathPoints = result.points;

  // 若有上旋 (rpm > 0)，同步計算一條 0 RPM 的純平擊軌跡作為視覺對照
  let refPoints = null;
  let shortenDistText = "";
  if (rpm > 0) {
    const refResult = calculatePhysicsTrajectory(angle, power, 0, height);
    refPoints = refResult.points;
    if (result.firstBounceZ !== null && refResult.firstBounceZ !== null) {
      const diff = Math.abs(refResult.firstBounceZ - result.firstBounceZ);
      shortenDistText = ` (馬格努斯下壓縮短 ${diff.toFixed(2)}m)`;
    }
  }

  drawTrajectory(pathPoints, result.hitNet, result.isOut, refPoints);

  if (result.hitNet) {
    statusDiv.innerHTML = `❌ 擊球掛網！${shortenDistText}`;
    statusDiv.style.color = "#ff3333";
  } else if (result.isOut) {
    statusDiv.innerHTML = `❌ 出界 (Out)！${shortenDistText}`;
    statusDiv.style.color = "#ff9800";
  } else {
    if (result.firstBounceZ !== null && result.firstBounceZ < 0 && result.firstBounceZ > -NVZ_DEPTH) {
      statusDiv.innerHTML = `🏆 完美！落入廚房區${shortenDistText}`;
      statusDiv.style.color = "#a4d955";
    }
    else if (result.firstBounceZ !== null && result.firstBounceZ < -5.5) {
      statusDiv.innerHTML = `🔥 好球！壓向底線深區${shortenDistText}`;
      statusDiv.style.color = "#00e5ff";
    }
    else {
      statusDiv.innerHTML = `✅ 過網安全界內${shortenDistText}`;
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
  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state === "recording") {
      mediaRecorder.stop();
    }
    return;
  }

  const stream = renderer.domElement.captureStream(60);

  const mimeTypes = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm"
  ];
  const selectedMime = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || "";

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

    const a = document.createElement("a");
    a.href = url;
    a.download = `pickleball-${presetSelect.value}-${spinTypeSelect.value}-${Date.now()}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);

    isRecording = false;
    recordBtn.innerText = "🎥 錄影";
    recordBtn.classList.remove("recording");
  };

  isRecording = true;
  recordBtn.innerText = "⏹️ 結束";
  recordBtn.classList.add("recording");

  mediaRecorder.start();
  playShot();
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