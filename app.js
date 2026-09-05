// INSIRA SUA CHAVE DA API GEMINI AQUI:
const GEMINI_API_KEY = AQ.Ab8RN6K4pLl-FwWMQYnSJB5PofhhsmYERkLn4_OFgpl9kptYoA;

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
    console.warn("Aviso: Câmera não detectada ou permissão negada. O app funcionará no modo Lousa Escura.", err);
    // Aplica fundo escuro no container se a câmera falhar
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

// --- INTEGRAÇÃO COM GEMINI 1.5 FLASH VIA API ---

function showAIPanel(text) {
  if (aiResponseText && aiPanel) {
    aiResponseText.innerText = text;
    aiPanel.classList.add('active');
  }
}

function hideAIPanel() {
  if (aiPanel) aiPanel.classList.remove('active');
}
window.hideAIPanel = hideAIPanel;

const btnGemini = document.getElementById('btn-gemini-ai');
if (btnGemini) {
  btnGemini.addEventListener('click', async () => {
    closeMenus();

    if (!GEMINI_API_KEY || GEMINI_API_KEY === "SUA_CHAVE_API_AQUI") {
      showAIPanel("Adicione sua chave de API do Gemini no arquivo app.js na variável GEMINI_API_KEY.");
      return;
    }

    showAIPanel("Analisando imagem com o Gemini Flash IA... Aguarde!");

    const captureCanvas = document.createElement('canvas');
    captureCanvas.width = canvas.width;
    captureCanvas.height = canvas.height;
    const captureCtx = captureCanvas.getContext('2d');

    // Desenhar Vídeo se disponível
    if (video.readyState >= 2) {
      captureCtx.save();
      if (currentFacingMode === 'user') {
        captureCtx.translate(captureCanvas.width, 0);
        captureCtx.scale(-1, 1);
      }
      captureCtx.drawImage(video, 0, 0, captureCanvas.width, captureCanvas.height);
      captureCtx.restore();
    } else {
      captureCtx.fillStyle = "#1e1e1e";
      captureCtx.fillRect(0, 0, captureCanvas.width, captureCanvas.height);
    }

    captureCtx.drawImage(canvas, 0, 0);

    const base64Image = captureCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Você é um assistente pedagógico. Analise o rascunho/desenho na lousa. Explique de forma didática e concisa o que está representado." },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }]
        })
      })

      const data = await response.json();
      
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        showAIPanel(data.candidates[0].content.parts[0].text);
      } else {
        showAIPanel("Não foi possível analisar a imagem. Tente desenhar algo mais visível.");
      }

    } catch (error) {
      console.error("Erro na requisição da IA:", error);
      showAIPanel("Erro ao conectar à API do Gemini. Verifique sua chave de API ou conexão.");
    }
  });
}

// Gravação de Vídeo
const btnRecord = document.getElementById('btn-record');
let isRecording = false;

if (btnRecord) {
  btnRecord.addEventListener('click', async () => {
    closeMenus();
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });
}

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

    if (video.readyState >= 2) {
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
    } else {
      renderCtx.fillStyle = "#1e1e1e";
      renderCtx.fillRect(0, 0, renderCanvas.width, renderCanvas.height);
    }
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
