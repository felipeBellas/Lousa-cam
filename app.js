const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const toolbarWrapper = document.getElementById('toolbarWrapper');
const btnToggleMenu = document.getElementById('btn-toggle-menu');

const penSideWrapper = document.getElementById('penSideWrapper');
const btnTogglePen = document.getElementById('btn-toggle-pen');

const svgSideWrapper = document.getElementById('svgSideWrapper');
const btnToggleSvg = document.getElementById('btn-toggle-svg');
const svgScaleInput = document.getElementById('svgScale');

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
  toolbarWrapper.classList.add('collapsed');
  penSideWrapper.classList.add('collapsed');
  svgSideWrapper.classList.add('collapsed');
}

function closeMenusExcept(wrapper) {
  [toolbarWrapper, penSideWrapper, svgSideWrapper].forEach(w => {
    if (w !== wrapper) w.classList.add('collapsed');
  });
}

[penSideWrapper, toolbarWrapper, svgSideWrapper].forEach(el => {
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('touchstart', (e) => e.stopPropagation());
});

btnToggleMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  closeMenusExcept(toolbarWrapper);
  toolbarWrapper.classList.toggle('collapsed');
});

btnTogglePen.addEventListener('click', (e) => {
  e.stopPropagation();
  closeMenusExcept(penSideWrapper);
  penSideWrapper.classList.toggle('collapsed');
});

btnToggleSvg.addEventListener('click', (e) => {
  e.stopPropagation();
  closeMenusExcept(svgSideWrapper);
  svgSideWrapper.classList.toggle('collapsed');
});

document.addEventListener('pointerdown', (e) => {
  if (!penSideWrapper.contains(e.target) && !toolbarWrapper.contains(e.target) && !svgSideWrapper.contains(e.target) && !btnToggleMenu.contains(e.target)) {
    closeMenus();
  }
});

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redraw();
}

window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(resizeCanvas, 200));
resizeCanvas();

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
    console.error("Erro na câmera: ", err);
  }
}

window.addEventListener('DOMContentLoaded', startCamera);

document.getElementById('btn-flip').addEventListener('click', () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

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

// Inserção com controle de escala
function insertSVG(type) {
  closeMenus();
  
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const scale = parseFloat(svgScaleInput.value) || 1.0;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);

  ctx.strokeStyle = currentColor;
  ctx.fillStyle = currentColor;
  ctx.lineWidth = 3 / scale; // Mantém a espessura do traço proporcional

  if (type === 'cell') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 120, 90, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-20, -10, 30, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'nucleus') {
    ctx.beginPath();
    ctx.arc(0, 0, 50, 0, Math.PI * 2);
    ctx.stroke();
  } else if (type === 'mitochondria') {
    ctx.beginPath();
    ctx.roundRect(-50, -25, 100, 50, 25);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-30, -15);
    ctx.lineTo(-10, 15);
    ctx.lineTo(10, -15);
    ctx.lineTo(30, 15);
    ctx.stroke();
  } else if (type === 'arrow') {
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(40, 0);
    ctx.lineTo(20, -15);
    ctx.moveTo(40, 0);
    ctx.lineTo(20, 15);
    ctx.stroke();
  }

  ctx.restore();
  saveState();
}

window.insertSVG = insertSVG;

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
