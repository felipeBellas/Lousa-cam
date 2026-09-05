// Chave da API Gemini configurada
const GEMINI_API_KEY = "AQ.Ab8RN6K4pLl-FwWMQYnSJB5PofhhsmYERkLn4_OFgpl9kptYoA";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const toolbarWrapper = document.getElementById('toolbarWrapper');
const btnToggleMenu = document.getElementById('btn-toggle-menu');

const penSideWrapper = document.getElementById('penSideWrapper');
const btnTogglePen = document.getElementById('btn-toggle-pen');

const aiPanel = document.getElementById('ai-response-panel');
const aiResponseText = document.getElementById('ai-response-text');

let currentFacingMode = 'user';
let currentColor = '#ffffff';
let isEraser = false;
let history = [];
let historyIndex = -1;
let isDrawing = false;

let mediaRecorder;
let recordedChunks = [];
let audioStream;

const svgRecord = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#ff3b30"/></svg>`;
const svgStop = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#ffffff"/></svg>`;

function closeMenus() {
  if (toolbarWrapper) toolbarWrapper.classList.add('collapsed');
  if (penSideWrapper) penSideWrapper.classList.add('collapsed');
}

function closeMenusExcept(wrapper) {
  [toolbarWrapper, penSideWrapper].forEach(w => {
    if (w && w !== wrapper) w.classList.add('collapsed');
  });
}

[penSideWrapper, toolbarWrapper].forEach(el => {
  if (el) {
    el.addEventListener('pointerdown', (e) => e.stopPropagation());
    el.addEventListener('touchstart', (e) => e.stopPropagation());
  }
});

if (btnToggleMenu) {
  btnToggleMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenusExcept(toolbarWrapper);
    toolbarWrapper.classList.toggle('collapsed');
  });
}

if (btnTogglePen) {
  btnTogglePen.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMenusExcept(penSideWrapper);
    penSideWrapper.classList.toggle('collapsed');
  });
}

document.addEventListener('pointerdown', (e) => {
  if (penSideWrapper && toolbarWrapper && btnToggleMenu) {
    if (!penSideWrapper.contains(e.target) && !toolbarWrapper.contains(e.target) && !btnToggleMenu.contains(e.target)) {
      closeMenus();
    }
  }
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redraw();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

async function startCamera() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: currentFacingMode,
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: true
    });
    
    video.srcObject = stream;
    audioStream = stream;

    if (currentFacingMode === 'environment') {
      video.classList.add('rear-camera');
    } else {
      video.classList.remove('rear-camera');
    }
  } catch (err) {
    console.warn("Câmera indisponível ou permissão negada. O aplicativo funcionará no modo Lousa Escura.", err);
    document.getElementById('app-container').style.backgroundColor = '#1e1e1e';
  }
}

window.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  startCamera();
});

const btnFlip = document.getElementById('btn-flip');
if (btnFlip) {
  btnFlip.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera();
  });
}

function saveState() {
  historyIndex++;
  history = history.slice(0, historyIndex);
  history.push(canvas.toDataURL());
}

function redraw() {
  if (historyIndex >= 0 && history[historyIndex]) {
    const img = new Image();
    img.src = history[historyIndex];
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return { x: clientX - rect.left, y: clientY - rect.top };
}

function startDrawing(e) {
  closeMenus();

  isDrawing = true;
  const pos = getPos(e);

  ctx.lineWidth = document.getElementById('lineWidth').value;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
  }

  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    saveState();
  }
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', (e) => {
    isEraser = false;
    const btnEraser = document.getElementById('btn-eraser');
    if (btnEraser) btnEraser.classList.remove('active');
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active');
    currentColor =
