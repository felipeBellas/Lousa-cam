const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const toolbarWrapper = document.getElementById('toolbarWrapper');
const btnToggleMenu = document.getElementById('btn-toggle-menu');

const penSideWrapper = document.getElementById('penSideWrapper');
const btnTogglePen = document.getElementById('btn-toggle-pen');

let currentFacingMode = 'user';
let currentColor = '#ffffff';
let isEraser = false;
let history = [];
let historyIndex = -1;
let isDrawing = false;
let currentPoints = [];

let mediaRecorder;
let recordedChunks = [];
let audioStream;

const svgRecord = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#ff3b30"/></svg>`;
const svgStop = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#ffffff"/></svg>`;

// Fechar menus
function closeMenus() {
  if (penSideWrapper && !penSideWrapper.classList.contains('collapsed')) {
    penSideWrapper.classList.add('collapsed');
  }
  if (toolbarWrapper && !toolbarWrapper.classList.contains('collapsed')) {
    toolbarWrapper.classList.add('collapsed');
  }
}

// Eventos de clique para abrir/fechar menus
if (penSideWrapper) {
  penSideWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
  penSideWrapper.addEventListener('touchstart', (e) => e.stopPropagation());
}
if (toolbarWrapper) {
  toolbarWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
  toolbarWrapper.addEventListener('touchstart', (e) => e.stopPropagation());
}

if (btnToggleMenu) {
  btnToggleMenu.addEventListener('click', (e) => {
    e.stopPropagation();
    toolbarWrapper.classList.toggle('collapsed');
  });
}

if (btnTogglePen) {
  btnTogglePen.addEventListener('click', (e) => {
    e.stopPropagation();
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

// Redimensionar Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redraw();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));

// Inicialização da Câmera sem travar o microfone
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
      audio: false // Desativado na abertura para evitar bloqueio do navegador
    });
    
    video.srcObject = stream;
    await video.play();

    if (currentFacingMode === 'environment') {
      video.classList.add('rear-camera');
    } else {
      video.classList.remove('rear-camera');
    }

    // Esconde a tela do botão azul caso ela exista
    const startOverlay = document.getElementById('start-overlay');
    if (startOverlay) {
      startOverlay.style.display = 'none';
    }

  } catch (err) {
    console.error("Erro ao acessar câmera: ", err);
    alert("Erro ao abrir a câmera. Verifique se deu permissão no navegador ou se está rodando via Localhost/HTTPS.");
  }
}

// Suporte para acionar pelo botão azul "Iniciar Câmera e Lousa" se ele existir
const btnStartOverlay = document.getElementById('btn-start');
if (btnStartOverlay) {
  btnStartOverlay.addEventListener('click', () => {
    resizeCanvas();
    startCamera();
  });
} else {
  window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    startCamera();
  });
}

const btnFlip = document.getElementById('btn-flip');
if (btnFlip) {
  btnFlip.addEventListener('click', () => {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera();
  });
}

// Histórico do Canvas
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

// Lógica de Desenho com Suavização (Curva de Bézier)
function startDrawing(e) {
  closeMenus();

  isDrawing = true;
  const pos = getPos(e);
  currentPoints = [pos];

  const lineWidthInput = document.getElementById('lineWidth');
  ctx.lineWidth = lineWidthInput ? lineWidthInput.value : 4;
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
  currentPoints.push(pos);

  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
}

function simplifyPoints(points, minDistance = 5) {
  if (points.length <= 2) return points;
  const result = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = Math.hypot(curr.x - prev.x, curr.y - prev.y);
    if (dist >= minDistance) {
      result.push(curr);
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

function drawSmoothStroke(points) {
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
  } else {
    let i = 1;
    for (; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    ctx.quadraticCurveTo(
      points[i].x,
      points[i].y,
      points[i + 1].x,
      points[i + 1].y
    );
  }
  ctx.stroke();
}

function stopDrawing() {
  if (!isDrawing) return;
  isDrawing = false;

  if (currentPoints.length > 2) {
    if (historyIndex >= 0 && history[historyIndex]) {
      const img = new Image();
      img.src = history[historyIndex];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        const smoothedPoints = simplifyPoints(currentPoints, 6);
        drawSmoothStroke(smoothedPoints);

        saveState();
        currentPoints = [];
      };
      return;
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const smoothedPoints = simplifyPoints(currentPoints, 6);
      drawSmoothStroke(smoothedPoints);
    }
  }

  saveState();
  currentPoints = [];
}

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

// Eventos dos Controles
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', (e) => {
    isEraser = false;
    const btnEraser = document.getElementById('btn-eraser');
    if (btnEraser) btnEraser.classList.remove('active');
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active');
    currentColor = e.target.getAttribute('data-color');
  });
});

const btnEraser = document.getElementById('btn-eraser');
if (btnEraser) {
  btnEraser.addEventListener('click', function() {
    isEraser = !isEraser;
    this.classList.toggle('active', isEraser);
  });
}

const btnUndo = document.getElementById('btn-undo');
if (btnUndo) {
  btnUndo.addEventListener('click', () => {
    closeMenus();
    if (historyIndex > 0) {
      historyIndex--;
      redraw();
    } else if (historyIndex === 0) {
      historyIndex = -1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

const btnRedo = document.getElementById('btn-redo');
if (btnRedo) {
  btnRedo.addEventListener('click', () => {
    closeMenus();
    if (historyIndex < history.length - 1) {
      historyIndex++;
      redraw();
    }
  });
}

const btnClearAll = document.getElementById('btn-clear-all');
if (btnClearAll) {
  btnClearAll.addEventListener('click', () => {
    closeMenus();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    saveState();
  });
}
