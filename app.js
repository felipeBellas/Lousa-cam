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

// Armazena os pontos do traço atual para calcular a curva suave de Bézier
let currentPoints = [];

let mediaRecorder;
let recordedChunks = [];
let audioStream;

// SVGs para o botão de gravação
const svgRecord = `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#ff3b30"/></svg>`;
const svgStop = `<svg viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" fill="#ffffff"/></svg>`;

// Função dedicada para fechar todos os menus abertos
function closeMenus() {
  if (!penSideWrapper.classList.contains('collapsed')) {
    penSideWrapper.classList.add('collapsed');
  }
  if (!toolbarWrapper.classList.contains('collapsed')) {
    toolbarWrapper.classList.add('collapsed');
  }
}

// Impede que toques DENTRO dos menus os fechem acidentalmente
penSideWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
penSideWrapper.addEventListener('touchstart', (e) => e.stopPropagation());
toolbarWrapper.addEventListener('pointerdown', (e) => e.stopPropagation());
toolbarWrapper.addEventListener('touchstart', (e) => e.stopPropagation());

// Alternar Menu Principal
btnToggleMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  toolbarWrapper.classList.toggle('collapsed');
});

// Alternar Menu Caneta
btnTogglePen.addEventListener('click', (e) => {
  e.stopPropagation();
  penSideWrapper.classList.toggle('collapsed');
});

// Fechar menus ao clicar/tocar em qualquer área neutra fora dos painéis
document.addEventListener('pointerdown', (e) => {
  if (!penSideWrapper.contains(e.target) && !toolbarWrapper.contains(e.target) && !btnToggleMenu.contains(e.target)) {
    closeMenus();
  }
});

// Redimensionamento do Canvas
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redraw();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 200);
});
resizeCanvas();

// Câmera
async function startCamera() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: currentFacingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 }
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
    console.error("Erro ao acessar câmera/mic: ", err);
  }
}

// Inicializa a câmera assim que a estrutura do DOM estiver pronta
window.addEventListener('DOMContentLoaded', () => {
  startCamera();
});

// Alternar Câmera
document.getElementById('btn-flip').addEventListener('click', () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

// Canvas e Desenhos
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

// Início do desenho/escrita
function startDrawing(e) {
  closeMenus();

  isDrawing = true;
  const pos = getPos(e);
  currentPoints = [pos];

  ctx.lineWidth = document.getElementById('lineWidth').value;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (isEraser) {
    ctx.globalCompositeOperation = 'destination-out';
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = currentColor;
  }
}

// Desenho em tempo real com algoritmo de Curva de Bézier Suavizada
function draw(e) {
  if (!isDrawing) return;
  const pos = getPos(e);
  currentPoints.push(pos);

  // Precisa de pelo menos 2 pontos para começar a curvar
  if (currentPoints.length < 2) return;

  ctx.beginPath();

  if (currentPoints.length === 2) {
    // Para apenas 2 pontos, desenha uma linha direta simples
    ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
    ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
  } else {
    // Aplica a aproximação por Curvas de Bézier para criar um traço orgânico e sem tremilhões
    ctx.moveTo(currentPoints[0].x, currentPoints[0].y);

    let i = 1;
    for (; i < currentPoints.length - 2; i++) {
      const xc = (currentPoints[i].x + currentPoints[i + 1].x) / 2;
      const yc = (currentPoints[i].y + currentPoints[i + 1].y) / 2;
      ctx.quadraticCurveTo(currentPoints[i].x, currentPoints[i].y, xc, yc);
    }

    // Liga o penúltimo e o último ponto
    ctx.quadraticCurveTo(
      currentPoints[i].x,
      currentPoints[i].y,
      currentPoints[i + 1].x,
      currentPoints[i + 1].y
    );
  }

  ctx.stroke();
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    currentPoints = [];
    saveState();
  }
}

// Eventos no Canvas
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('touchstart', startDrawing);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDrawing);

// Seleção de Cores e Borracha
document.querySelectorAll('.color-dot').forEach(dot => {
  dot.addEventListener('click', (e) => {
    isEraser = false;
    document.getElementById('btn-eraser').classList.remove('active');
    document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
    e.target.classList.add('active');
    currentColor = e.target.getAttribute('data-color');
  });
});

document.getElementById('btn-eraser').addEventListener('click', function() {
  isEraser = !isEraser;
  this.classList.toggle('active', isEraser);
});

// Ações no Topo (Desfazer, Refazer e Limpar)
document.getElementById('btn-undo').addEventListener('click', () => {
  closeMenus();
  if (historyIndex > 0) {
    historyIndex--;
    redraw();
  } else if (historyIndex === 0) {
    historyIndex = -1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

document.getElementById('btn-redo').addEventListener('click', () => {
  closeMenus();
  if (historyIndex < history.length - 1) {
    historyIndex++;
    redraw();
  }
});

document.getElementById('btn-clear-all').addEventListener('click', () => {
  closeMenus();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
});

// Gravação de Vídeo
const btnRecord = document.getElementById('btn-record');
let isRecording = false;

btnRecord.addEventListener('click', async () => {
  closeMenus();
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  recordedChunks = [];
  
  const renderCanvas = document.createElement('canvas');
  renderCanvas.width = window.innerWidth;
  renderCanvas.height = window.innerHeight;
  const renderCtx = renderCanvas.getContext('2d');

  function drawFrame() {
    if (!isRecording) return;
    
    renderCtx.save();
    if (currentFacingMode === 'user') {
      renderCtx.translate(renderCanvas.width, 0);
      renderCtx.scale(-1, 1);
    }

    const hRatio = renderCanvas.width / (video.videoWidth || renderCanvas.width);
    const vRatio = renderCanvas.height / (video.videoHeight || renderCanvas.height);
    const ratio = Math.min(hRatio, vRatio);
    const centerShiftX = (renderCanvas.width - (video.videoWidth || renderCanvas.width) * ratio) / 2;
    const centerShiftY = (renderCanvas.height - (video.videoHeight || renderCanvas.height) * ratio) / 2;

    renderCtx.drawImage(
      video, 
      0, 0, video.videoWidth || renderCanvas.width, video.videoHeight || renderCanvas.height,
      centerShiftX, centerShiftY, (video.videoWidth || renderCanvas.width) * ratio, (video.videoHeight || renderCanvas.height) * ratio
    );
    renderCtx.restore();

    renderCtx.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);
    requestAnimationFrame(drawFrame);
  }
  
  isRecording = true;
  drawFrame();

  const streamToRecord = renderCanvas.captureStream(30);
  if (audioStream && audioStream.getAudioTracks().length > 0) {
    streamToRecord.addTrack(audioStream.getAudioTracks()[0]);
  }

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : 'video/webm';

  mediaRecorder = new MediaRecorder(streamToRecord, { mimeType });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = exportVideo;

  mediaRecorder.start();
  btnRecord.classList.add('recording');
  btnRecord.innerHTML = svgStop;
  btnRecord.title = "Parar Gravação";
}

function stopRecording() {
  isRecording = false;
  mediaRecorder.stop();
  btnRecord.classList.remove('recording');
  btnRecord.innerHTML = svgRecord;
  btnRecord.title = "Gravar";
}

async function exportVideo() {
  const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
  const file = new File([blob], 'lousa-cam.mp4', { type: blob.type });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Lousa Cam',
        text: 'Gravado via Lousa Cam PWA'
      });
    } catch (e) { console.log('Compartilhamento cancelado.'); }
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lousa-cam.mp4';
    a.click();
  }
}
