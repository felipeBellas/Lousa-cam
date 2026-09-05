const GEMINI_API_KEY = "AQ.Ab8RN6K4pLl-FwWMQYnSJB5PofhhsmYERkLn4_OFgpl9kptYoA";

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('start-overlay');
const btnStart = document.getElementById('btn-start-app');

const colors = ['#ffffff', '#ff3b30', '#ffcc00', '#34c759', '#007aff'];
let colorIndex = 0;
let isDrawing = false;

// Redimensionamento do Canvas
function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.strokeStyle = colors[colorIndex];
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
}

window.addEventListener('resize', setupCanvas);

// Inicialização por Gesto do Usuário
btnStart.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user' },
      audio: false
    });
    
    video.srcObject = stream;
    await video.play();
    
    startOverlay.style.display = 'none';
    setupCanvas();
  } catch (err) {
    alert("Erro ao acessar a câmera. Certifique-se de estar usando HTTPS ou Localhost e que concedeu permissão.");
    console.error(err);
    startOverlay.style.display = 'none';
    setupCanvas();
  }
});

// Lógica Simples de Desenho
function getPos(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  return { x, y };
}

function startDraw(e) {
  isDrawing = true;
  const { x, y } = getPos(e);
  ctx.beginPath();
  ctx.moveTo(x, y);
}

function draw(e) {
  if (!isDrawing) return;
  const { x, y } = getPos(e);
  ctx.lineTo(x, y);
  ctx.stroke();
}

function stopDraw() {
  isDrawing = false;
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);

canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDraw);

// Botões
document.getElementById('btn-clear').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('btn-color').addEventListener('click', () => {
  colorIndex = (colorIndex + 1) % colors.length;
  ctx.strokeStyle = colors[colorIndex];
});

// Integração IA
const aiPanel = document.getElementById('ai-panel');
const aiText = document.getElementById('ai-text');

document.getElementById('btn-ai').addEventListener('click', async () => {
  aiPanel.classList.add('visible');
  aiText.innerText = "Processando imagem com Gemini Flash...";

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tCtx = tempCanvas.getContext('2d');

  if (video.readyState >= 2) {
    tCtx.save();
    tCtx.translate(tempCanvas.width, 0);
    tCtx.scale(-1, 1);
    tCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
    tCtx.restore();
  } else {
    tCtx.fillStyle = "#1a1a1a";
    tCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
  }

  tCtx.drawImage(canvas, 0, 0);
  const base64Image = tempCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Descreva e resolva didaticamente o conteúdo desenhado nesta tela." },
            { inline_data: { mime_type: "image/jpeg", data: base64Image } }
          ]
        }]
      })
    });

    const data = await res.json();
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      aiText.innerText = data.candidates[0].content.parts[0].text;
    } else if (data.error) {
      aiText.innerText = "Erro na API: " + data.error.message;
    }
  } catch (err) {
    aiText.innerText = "Erro de conexão ao acessar o Gemini.";
  }
});

document.getElementById('btn-close-ai').addEventListener('click', () => {
  aiPanel.classList.remove('visible');
});
