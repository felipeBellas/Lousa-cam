(() => {
  'use strict';

  // Catálogo PRO: prévias bloqueadas até a futura integração de compras.
  // Não conceder acesso PRO somente por um valor armazenado no navegador.
  const models = [
  {
    "name": "Bora Criar!",
    "category": "Criadores",
    "tier": "free",
    "headline": "BORA CRIAR?",
    "sub": "Seu conteúdo. Sua vibe.",
    "desc": "Abertura jovem e personalizável.",
    "style": "pop"
  },
  {
    "name": "Neon Creator",
    "category": "Criadores",
    "tier": "pro",
    "headline": "ON AIR",
    "sub": "Energia em cada vídeo",
    "desc": "Cores neon e impacto.",
    "style": "neon"
  },
  {
    "name": "Glass Studio",
    "category": "Criadores",
    "tier": "pro",
    "headline": "GLASS STUDIO",
    "sub": "Um novo olhar",
    "desc": "Painéis translúcidos.",
    "style": "glass"
  },
  {
    "name": "Pop Motion",
    "category": "Criadores",
    "tier": "pro",
    "headline": "POP!",
    "sub": "Criatividade em movimento",
    "desc": "Geometria e cores pop.",
    "style": "pop2"
  },
  {
    "name": "Minimal Black",
    "category": "Criadores",
    "tier": "pro",
    "headline": "MENOS É MAIS",
    "sub": "Visual que comunica",
    "desc": "Tipografia minimalista.",
    "style": "minimal"
  },
  {
    "name": "Podcast Show",
    "category": "Criadores",
    "tier": "pro",
    "headline": "PODCAST",
    "sub": "Conversa de verdade",
    "desc": "Apresentação de episódio.",
    "style": "podcast"
  },
  {
    "name": "Vlog Diário",
    "category": "Criadores",
    "tier": "pro",
    "headline": "MEU DIA",
    "sub": "Vem comigo!",
    "desc": "Diário e lifestyle.",
    "style": "vlog"
  },
  {
    "name": "Reels Impacto",
    "category": "Criadores",
    "tier": "pro",
    "headline": "OLHA ISSO!",
    "sub": "Você precisa ver",
    "desc": "Títulos rápidos e fortes.",
    "style": "reels"
  },
  {
    "name": "Top 5",
    "category": "Infográficos",
    "tier": "pro",
    "headline": "TOP 5",
    "sub": "Minhas escolhas",
    "desc": "Rankings com destaques.",
    "style": "ranking"
  },
  {
    "name": "Storytelling",
    "category": "Criadores",
    "tier": "pro",
    "headline": "ERA UMA VEZ",
    "sub": "Uma história real",
    "desc": "Narrativas em sequência.",
    "style": "story"
  },
  {
    "name": "Tutorial Pro",
    "category": "Tutoriais",
    "tier": "pro",
    "headline": "COMO FAZER",
    "sub": "Passo a passo",
    "desc": "Guias claros e modernos.",
    "style": "tutorial"
  },
  {
    "name": "Tech Future",
    "category": "Tecnologia",
    "tier": "pro",
    "headline": "FUTURO",
    "sub": "Ideias que conectam",
    "desc": "Tecnologia e inovação.",
    "style": "tech"
  },
  {
    "name": "Comparativo",
    "category": "Infográficos",
    "tier": "pro",
    "headline": "ANTES / DEPOIS",
    "sub": "Compare as diferenças",
    "desc": "Comparações visuais.",
    "style": "compare"
  },
  {
    "name": "Infográfico Color",
    "category": "Infográficos",
    "tier": "pro",
    "headline": "3 IDEIAS",
    "sub": "Informação visual",
    "desc": "Setas e etapas coloridas.",
    "style": "infographic"
  },
  {
    "name": "Quote Art",
    "category": "Criadores",
    "tier": "pro",
    "headline": "“INSPIRE”",
    "sub": "Sua frase aqui",
    "desc": "Citações com personalidade.",
    "style": "quote"
  },
  {
    "name": "Aula Dinâmica",
    "category": "Educação",
    "tier": "pro",
    "headline": "VAMOS APRENDER",
    "sub": "Uma aula diferente",
    "desc": "Ensino com visual moderno.",
    "style": "class"
  },
  {
    "name": "Ciência Visual",
    "category": "Educação",
    "tier": "pro",
    "headline": "CIÊNCIA",
    "sub": "Descubra o porquê",
    "desc": "Explicações científicas.",
    "style": "science"
  },
  {
    "name": "Business Clean",
    "category": "Profissional",
    "tier": "pro",
    "headline": "APRESENTAÇÃO",
    "sub": "Sua melhor ideia",
    "desc": "Elegância e clareza.",
    "style": "business"
  },
  {
    "name": "Product Spotlight",
    "category": "Profissional",
    "tier": "pro",
    "headline": "NOVIDADE",
    "sub": "Conheça o produto",
    "desc": "Destaques de produtos.",
    "style": "product"
  },
  {
    "name": "Cinematic Intro",
    "category": "Criadores",
    "tier": "pro",
    "headline": "AÇÃO!",
    "sub": "Sua história começa",
    "desc": "Abertura cinematográfica.",
    "style": "cinema"
  }
];
  const $ = id => document.getElementById(id);
  const gallery = $('models');
  const notice = $('notice');
  let ratio = '9:16';
  let backgroundMode = 'transparent';
  let backgroundColor = '#191A29';

  const palettes = [
    { name: 'Pop', colors: ['#C6FF42', '#FF65B7', '#21D4E8', '#FFFFFF'] },
    { name: 'Sunset', colors: ['#FFB347', '#FF537B', '#7138B7', '#FFFFFF'] },
    { name: 'Ocean', colors: ['#43E5D0', '#47A5FF', '#0B3978', '#FFFFFF'] },
    { name: 'Candy', colors: ['#F5A9DC', '#9B87FF', '#FFE46A', '#FFFFFF'] },
    { name: 'Classic', colors: ['#E9C46A', '#F4F1EA', '#3C4554', '#FFFFFF'] }
  ];
  let paletteIndex = 0;
  let customColor = palettes[0].colors[0];
  const esc = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function showNotice(message) {
    notice.textContent = message;
    notice.hidden = false;
  }

  function preview(model, index) {
    const colors = index === 0 ? [customColor, ...palettes[paletteIndex].colors.slice(1)] : [];
    const bgStyle = index === 0 && backgroundMode === 'solid' ? `--chosen-bg:${backgroundColor};` : ''; 
    const previewClass = index === 0 && backgroundMode === 'transparent' ? ' preview-transparent' : ''; 
    return `<div class="preview${previewClass} ${ratio === '9:16' ? 'portrait' : 'landscape'} style-${esc(model.style)}" style="${colors.length ? `--accent:${colors[0]};--accent2:${colors[1]};--accent3:${colors[2]};` : ''}${bgStyle}">
      <div class="preview-decoration decoration-one"></div>
      <div class="preview-decoration decoration-two"></div>
      <div class="preview-decoration decoration-three"></div>
      <div class="preview-head">LOUSA CAM</div>
      <div class="preview-main"><strong>${esc(model.headline)}</strong><span>${esc(model.sub)}</span></div>
      <div class="preview-foot">${esc(model.category)}</div>
    </div>`;
  }

  function render() {
    gallery.innerHTML = '';
    models.forEach((model, index) => {
      const card = document.createElement('article');
      card.className = 'template-card';
      const free = model.tier === 'free';
      card.innerHTML = `${preview(model, index)}
        <div class="template-info">
          <div class="template-meta"><span>${esc(model.category)}</span><b class="${free ? 'free' : 'pro'}">${free ? 'FREE' : 'PRO'}</b></div>
          <h2>${esc(model.name)}</h2>
          <p>${esc(model.desc)}</p>
          ${free ? `<button type="button" data-model="${index}">Usar template</button>`
            : '<button type="button" disabled title="Aguarda integração da assinatura">PRO · Em preparação</button>'}
        </div>`;
      gallery.appendChild(card);
    });
  }

  function elementId() { return ScenesStorage.createId('element'); }
  function text(value, x, y, width, height, fontSize, color, align = 'center', weight = 'bold') {
    return {
      id: elementId(), type: 'text', x, y, width, height,
      rotation: 0, opacity: 1, text: value, fontSize, color, align,
      fontFamily: 'Arial, sans-serif', fontWeight: weight
    };
  }
  function shape(kind, x, y, width, height, color, opacity = 1, rotation = 0) {
    return {
      id: elementId(), type: 'shape', shape: kind, x, y, width, height,
      rotation, opacity, color, radius: 35
    };
  }

  function buildPresentation() {
    const portrait = ratio === '9:16';
    const w = portrait ? 720 : 1280;
    const h = portrait ? 1280 : 720;
    const [accent, pink, cyan, white] = [customColor, ...palettes[paletteIndex].colors.slice(1)];
    const size = portrait ? 76 : 94;
    const main = portrait ? [45, 435, 630, 130] : [110, 205, 1060, 120];
    const sub = portrait ? [58, 585, 605, 120] : [118, 345, 1000, 90];

    const decor = () => portrait ? [
      shape('ellipse', 475, 180, 180, 180, pink, .88),
      shape('rounded', 70, 260, 260, 72, accent, .92, -9),
      shape('ellipse', 90, 825, 125, 125, cyan, .85),
      shape('rounded', 390, 945, 250, 55, pink, .85, 10)
    ] : [
      shape('ellipse', 980, 85, 175, 175, pink, .9),
      shape('rounded', 95, 105, 250, 62, accent, .9, -8),
      shape('ellipse', 85, 500, 105, 105, cyan, .85),
      shape('rounded', 900, 540, 220, 45, pink, .85, 8)
    ];
    const opening = [
      ...decor(),
      text('BORA CRIAR?', ...main, size, accent),
      text('Seu conteúdo. Sua vibe.', ...sub, portrait ? 40 : 46, white),
      text('LOUSA CAM', portrait ? 90 : 985, portrait ? 1120 : 630,
        portrait ? 540 : 210, 65, 25, white)
    ];
    const content = [
      ...decor(),
      text('SUA IDEIA AQUI', portrait ? 50 : 135, portrait ? 390 : 220,
        portrait ? 620 : 1010, 140, portrait ? 61 : 85, accent),
      text('Toque e personalize tudo!', portrait ? 55 : 145,
        portrait ? 565 : 370, portrait ? 610 : 990, 100, portrait ? 35 : 45, white)
    ];
    const ending = [
      ...decor(),
      text('CURTIU?', portrait ? 50 : 150, portrait ? 410 : 220,
        portrait ? 620 : 980, 145, portrait ? 86 : 105, accent),
      text('Segue para mais!', portrait ? 60 : 160,
        portrait ? 590 : 370, portrait ? 600 : 960, 90, portrait ? 42 : 52, white)
    ];
    const sceneBackground = backgroundMode === 'solid'
      ? { type: 'solid', color: backgroundColor }
      : { type: 'transparent' };
    return {
      title: `Bora Criar! — ${ratio}`,
      aspectRatio: ratio,
      templateId: 'bora-criar',
      scenes: [
        { title: 'Abertura', background: { ...sceneBackground }, elements: opening },
        { title: 'Conteúdo', background: { ...sceneBackground }, elements: content },
        { title: 'Encerramento', background: { ...sceneBackground }, elements: ending }
      ]
    };
  }

  $('backgroundMode').addEventListener('change', event => {
    backgroundMode = event.target.value === 'solid' ? 'solid' : 'transparent';
    $('backgroundColorLabel').hidden = backgroundMode !== 'solid';
    render();
  });
  $('backgroundColor').addEventListener('input', event => {
    backgroundColor = event.target.value;
    render();
  });
  $('orientation').addEventListener('change', event => {
    ratio = event.target.value;
    render();
  });
  $('palette').addEventListener('change', event => {
    paletteIndex = Number(event.target.value);
    customColor = palettes[paletteIndex].colors[0];
    $('customColor').value = customColor;
    render();
  });
  $('customColor').addEventListener('input', event => {
    customColor = event.target.value;
    render();
  });
  gallery.addEventListener('click', async event => {
    const button = event.target.closest('button[data-model]');
    if (!button || button.disabled) return;
    const model = models[Number(button.dataset.model)];
    if (!model || model.tier !== 'free') return;
    button.disabled = true;
    button.textContent = 'Criando...';
    try {
      if (!window.ScenesStorage) throw new Error('Armazenamento de Cenas indisponível.');
      await ScenesStorage.createPresentation(buildPresentation());
      window.location.assign('./scenes.html');
    } catch (error) {
      showNotice('Não foi possível criar o template: ' + error.message);
      button.disabled = false;
      button.textContent = 'Usar template';
    }
  });
  render();
})();
