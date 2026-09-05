const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startOverlay = document.getElementById('start-overlay');
const btnStart = document.getElementById('btn-start');

const colors = ['#ffffff', '#ff3b30', '#ffcc00', '#34c759', '#007aff'];
let colorIndex = 0;

let points = [];
let isDrawing = false;

function setupCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.strokeStyle = colors[colorIndex];
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

window.addEventListener('resize', setupCanvas);

// Inicialização da Câmera
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
    alert("Erro ao acessar a câmera. Certifique-se de dar permissão ou usar um servidor HTTPS/Localhost.");
    console.error(err);
    startOverlay.style.display = 'none';
    setupCanvas();
  }
});

function getPos(e) {
  const x = e.touches ? e.touches[0].clientX : e.clientX;
  const y = e.touches ? e.touches[0].clientY : e.clientY;
  return { x, y };
}

// Lógica com Algoritmo de Suavização (Curvas Bézier Quadráticas)
function startDraw(e) {
  isDrawing = true;
  const pos = getPos(e);
  points = [pos];
}

function draw(e) {
  if (!isDrawing) return;

  const pos = getPos(e);
  points.push(pos);

  if (points.length < 3) {
    const b = points[0];
    ctx.beginPath();
    ctx.arc(b.x, b.y, ctx.lineWidth / 2, 0, Math.PI * 2, !0);
    ctx.fill();
    ctx.closePath();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  // Calcula os pontos médios para criar a curva suave entre os pontos capturados
  for (var i = 1; i < points.length - 2; i++) {
    var xc = (points[i].x + points[i + 1].x) / 2;
    var yc = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
  }

  ctx.quadraticCurveTo(
    points[i].x,
    points[i].y,
    points[i + 1].x,
    points[i + 1].y
  );

  ctx.stroke();
}

function stopDraw() {
  if (isDrawing) {
    isDrawing = false;
    points = [];
  }
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
  ctx.fillStyle = colors[colorIndex];
});
