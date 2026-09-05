const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const startOverlay = document.getElementById('start-overlay');
const btnStart = document.getElementById('btn-start');

const pointer = document.getElementById('pointer-indicator');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

const colors = ['#ffffff', '#ff3b30', '#ffcc00', '#34c759', '#007aff'];
let colorIndex = 0;

let lastX = 0;
let lastY = 0;
let isDrawing = false;

function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.strokeStyle = colors[colorIndex];
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

window.addEventListener('resize', setupCanvas);

// Configuração do MediaPipe Hands
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults(onResults);

function onResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    statusDot.classList.add('active');
    statusText.innerText = "Mão Detectada";

    const landmarks = results.multiHandLandmarks[0];

    // Ponto 8: Ponta do Indicador | Ponto 4: Ponta do Polegar
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Espelha horizontalmente (x) para corresponder ao vídeo invertido
    const x = (1 - indexTip.x) * window.innerWidth;
    const y = indexTip.y * window.innerHeight;

    // Distância euclidiana entre a ponta do indicador e do polegar
    const distance = Math.hypot(
      (indexTip.x - thumbTip.x),
      (indexTip.y - thumbTip.y)
    );

    // Mover o cursor visual
    pointer.style.display = 'block';
    pointer.style.left = `${x}px`;
    pointer.style.top = `${y}px`;

    // Se a distância for menor que o limite (0.07), considera como gesto de "Pinçar/Desenhar"
    const isPinching = distance < 0.07;

    if (isPinching) {
      pointer.style.background = 'rgba(52, 199, 89, 0.9)'; // Verde ao desenhar
      
      if (!isDrawing) {
        isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    } else {
      pointer.style.background = 'rgba(255, 59, 48, 0.6)'; // Vermelho quando apenas apontando
      isDrawing = false;
    }

    lastX = x;
    lastY = y;
  } else {
    statusDot.classList.remove('active');
    statusText.innerText = "Procurando Mão...";
    pointer.style.display = 'none';
    isDrawing = false;
  }
}

// Inicializar Câmera e MediaPipe no clique
btnStart.addEventListener('click', async () => {
  setupCanvas();

  const camera = new Camera(video, {
    onFrame: async () => {
      await hands.send({ image: video });
    },
    width: 1280,
    height: 720
  });

  try {
    await camera.start();
    startOverlay.style.display = 'none';
  } catch (err) {
    alert("Erro ao iniciar a câmera. Verifique as permissões do navegador.");
    console.error(err);
  }
});

// Botões de Ação
document.getElementById('btn-clear').addEventListener('click', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
});

document.getElementById('btn-color').addEventListener('click', () => {
  colorIndex = (colorIndex + 1) % colors.length;
  ctx.strokeStyle = colors[colorIndex];
});
