const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const toolbarWrapper = document.getElementById('toolbarWrapper');
const btnToggleMenu = document.getElementById('btn-toggle-menu');

let currentFacingMode = 'user';
let currentColor = '#ffffff';
let isEraser = false;
let history = [];
let historyIndex = -1;
let isDrawing = false;

let recordMode = 'video'; // 'video' ou 'screen'
let mediaRecorder;
let recordedChunks = [];
let audioStream;

// Menu Retrátil
btnToggleMenu.addEventListener('click', () => {
  toolbarWrapper.classList.toggle('collapsed');
  if (toolbarWrapper.classList.contains('collapsed')) {
    btnToggleMenu.textContent = '▲ Menu';
  } else {
    btnToggleMenu.textContent = '▼ Ocultar Menu';
  }
});

// Redimensionamento
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  redraw();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Câmera
async function startCamera() {
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
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
startCamera();

// Trocar Câmera
document.getElementById('btn-flip').addEventListener('click', () => {
  currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
  startCamera();
});

// Histórico e Desenho
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
  isDrawing = true;
  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
}

function draw(e) {
  if (!isDrawing) return;
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

// Ferramentas
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
  if (historyIndex > 0) {
    historyIndex--;
    redraw();
  } else if (historyIndex === 0) {
    historyIndex = -1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
});

document.getElementById('btn-redo').addEventListener('click', () => {
  if (historyIndex < history.length - 1) {
    historyIndex++;
    redraw();
  }
});

// Borracha de Limpar Tudo (com preservação do histórico para Undo)
document.getElementById('btn-clear-all').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
});

// Alternar Modo de Gravação (Vídeo vs Tela)
const btnRecMode = document.getElementById('btn-rec-mode');
btnRecMode.addEventListener('click', () => {
  if (recordMode === 'video') {
    recordMode = 'screen';
    btnRecMode.textContent = '🖥️ Modo: Tela';
    btnRecMode.style.background = '#007aff';
  } else {
    recordMode = 'video';
    btnRecMode.textContent = '📹 Modo: Vídeo';
    btnRecMode.style.background = '#444';
  }
});

// Gravação
const btnRecord = document.getElementById('btn-record');
let isRecording = false;

btnRecord.addEventListener('click', async () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  recordedChunks = [];
  let streamToRecord;

  if (recordMode === 'screen') {
    try {
      streamToRecord = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
    } catch (err) {
      console.error("Erro ao selecionar gravação de tela: ", err);
      return;
    }
  } else {
    // Gravação Composta da Câmera + Canvas
    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = 1280;
    renderCanvas.height = 720;
    const renderCtx = renderCanvas.getContext('2d');

    function drawFrame() {
      if (!isRecording) return;
      renderCtx.save();
      if (currentFacingMode === 'user') {
        renderCtx.translate(renderCanvas.width, 0);
        renderCtx.scale(-1, 1);
      }
      renderCtx.drawImage(video, 0, 0, renderCanvas.width, renderCanvas.height);
      renderCtx.restore();
      renderCtx.drawImage(canvas, 0, 0, renderCanvas.width, renderCanvas.height);
      requestAnimationFrame(drawFrame);
    }
    isRecording = true;
    drawFrame();

    streamToRecord = renderCanvas.captureStream(30);
    if (audioStream && audioStream.getAudioTracks().length > 0) {
      streamToRecord.addTrack(audioStream.getAudioTracks()[0]);
    }
  }

  isRecording = true;

  const mimeType = MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')
    ? 'video/mp4;codecs=avc1'
    : 'video/webm';

  mediaRecorder = new MediaRecorder(streamToRecord, { mimeType });
  mediaRecorder.ondataavailable = e => { if (e.data.size > 0) recordedChunks.push(e.data); };
  mediaRecorder.onstop = exportVideo;

  mediaRecorder.start();
  btnRecord.textContent = '⏹️ Parar';
  btnRecord.style.background = '#ff3b30';
}

function stopRecording() {
  isRecording = false;
  mediaRecorder.stop();
  btnRecord.textContent = '🔴 Gravar';
  btnRecord.style.background = '#ff3b30';
}

async function exportVideo() {
  const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType });
  const file = new File([blob], 'lousa-cam.mp4', { type: blob.type });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Lousa Cam Recording',
        text: 'Vídeo gravado na Lousa Cam'
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
