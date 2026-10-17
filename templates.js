(() => {
  'use strict';

  // Quatro modelos PRO disponíveis exclusivamente para testes nesta etapa.
  // Esta interface não comprova assinatura nem concede acesso comercial PRO.
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
    const colors = index <= 4 ? [customColor, ...palettes[paletteIndex].colors.slice(1)] : [];
    const bgStyle = index <= 4 && backgroundMode === 'solid' ? `--chosen-bg:${backgroundColor};` : ''; 
    const previewClass = index <= 4 && backgroundMode === 'transparent' ? ' preview-transparent' : ''; 
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
      const testable = index >= 1 && index <= 4;
      card.innerHTML = `${preview(model, index)}
        <div class="template-info">
          <div class="template-meta"><span>${esc(model.category)}</span><b class="${free ? 'free' : 'pro'}">${free ? 'FREE' : 'PRO'}</b></div>
          <h2>${esc(model.name)}</h2>
          <p>${esc(model.desc)}</p>
          ${free ? `<button type="button" data-model="${index}">Usar template</button>`
            : testable ? `<button type="button" data-model="${index}">Testar modelo PRO</button>`
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

  // Modelos de teste: elementos nativos do editor, sem imagens externas.
  // Coordenadas acompanham o sistema de dimensões 720x1280 / 1280x720.
  function buildProPresentation(modelIndex) {
    const portrait = ratio === '9:16';
    const W = portrait ? 720 : 1280;
    const H = portrait ? 1280 : 720;
    const sx = W / 720;
    const sy = H / 1280;
    const [accent, secondary, tertiary] = [customColor, ...palettes[paletteIndex].colors.slice(1)];
    const white = '#FFFFFF';
    const ink = '#11131A';
    const at = (x, y, w, h) => [Math.round(x * sx), Math.round(y * sy), Math.round(w * sx), Math.round(h * sy)];
    const t = (value, x, y, w, h, size, color, align = 'center') =>
      text(value, ...at(x, y, w, h), Math.round(size * Math.min(sx, sy) * (portrait ? 1 : 1.12)), color, align);
    const sh = (kind, x, y, w, h, color, opacity = 1, rotation = 0) =>
      shape(kind, ...at(x, y, w, h), color, opacity, rotation);
    const bg = () => backgroundMode === 'solid'
      ? { type: 'solid', color: backgroundColor }
      : { type: 'transparent' };
    const scene = (title, elements) => ({ title, background: bg(), elements });
    const label = (value, color = white) => t(value, 90, 1120, 540, 55, 28, color);
    const configs = {
      1: {
        id: 'neon-creator',
        scenes: [
          scene('Neon · Abertura', [
            sh('rounded', 100, 230, 520, 80, tertiary, .85, -8),
            sh('ellipse', 430, 95, 190, 190, secondary, .85),
            sh('rounded', 80, 845, 550, 24, accent, .95, 8),
            t('ON AIR', 55, 405, 610, 170, 112, accent),
            t('ENERGIA EM CADA VÍDEO', 55, 600, 610, 110, 38, white),
            label('NEON CREATOR', secondary)
          ]),
          scene('Neon · Mensagem', [
            sh('ellipse', 45, 180, 160, 160, secondary, .85),
            sh('rounded', 100, 350, 520, 22, tertiary, .9, -5),
            t('SUA IDEIA', 45, 465, 630, 155, 88, accent),
            t('BRILHA AQUI', 45, 625, 630, 135, 70, white),
            label('PERSONALIZE SUA MENSAGEM', secondary)
          ]),
          scene('Neon · Encerramento', [
            sh('ellipse', 430, 250, 185, 185, tertiary, .9),
            sh('rounded', 100, 825, 520, 22, secondary, .95, 6),
            t('CURTIU?', 55, 455, 610, 155, 104, accent),
            t('SIGA PARA MAIS', 50, 640, 620, 110, 48, white),
            label('ATÉ A PRÓXIMA', secondary)
          ])
        ]
      },
      2: {
        id: 'glass-studio',
        scenes: [
          scene('Glass · Abertura', [
            sh('rounded', 72, 310, 576, 500, white, .20),
            sh('ellipse', 445, 195, 165, 165, tertiary, .60),
            sh('ellipse', 95, 850, 180, 180, accent, .50),
            t('GLASS', 85, 435, 550, 120, 88, white),
            t('STUDIO', 85, 555, 550, 110, 80, accent),
            t('UM NOVO OLHAR', 100, 695, 520, 70, 35, white),
            label('LOUSA CAM', white)
          ]),
          scene('Glass · Conteúdo', [
            sh('rounded', 65, 260, 590, 720, white, .16),
            sh('rounded', 95, 320, 530, 125, tertiary, .36),
            t('SUA MENSAGEM', 105, 480, 510, 135, 66, white),
            t('Clareza e criatividade', 100, 640, 520, 110, 40, accent),
            sh('rounded', 125, 790, 470, 15, white, .48),
            label('GLASS STUDIO', white)
          ]),
          scene('Glass · Encerramento', [
            sh('rounded', 78, 370, 564, 450, white, .20),
            sh('ellipse', 430, 225, 175, 175, accent, .65),
            t('OBRIGADO!', 85, 460, 550, 150, 75, white),
            t('ATÉ BREVE', 100, 640, 520, 95, 45, accent),
            label('GLASS STUDIO', white)
          ])
        ]
      },
      3: {
        id: 'pop-motion',
        scenes: [
          scene('Pop · Abertura', [
            sh('ellipse', 450, 165, 185, 185, secondary, .95),
            sh('rounded', 55, 320, 610, 105, tertiary, .95, -8),
            sh('rounded', 75, 850, 560, 90, accent, .95, 9),
            t('POP!', 55, 440, 610, 200, 150, accent),
            t('CRIE SEM LIMITES', 60, 660, 600, 105, 45, white),
            label('POP MOTION', secondary)
          ]),
          scene('Pop · Conteúdo', [
            sh('rounded', 75, 260, 570, 85, accent, .9, 6),
            sh('ellipse', 80, 815, 155, 155, tertiary, .95),
            sh('ellipse', 475, 840, 145, 145, secondary, .95),
            t('NOVA IDEIA!', 45, 440, 630, 150, 83, white),
            t('COLOQUE SEU TEXTO', 55, 620, 610, 100, 42, accent),
            label('COR • ENERGIA • MOVIMENTO', white)
          ]),
          scene('Pop · Encerramento', [
            sh('rounded', 65, 305, 590, 110, secondary, .9, -7),
            sh('ellipse', 430, 835, 175, 175, tertiary, .95),
            t('UHU!', 50, 460, 620, 160, 125, accent),
            t('VEM MAIS POR AÍ', 50, 660, 620, 100, 47, white),
            label('POP MOTION', secondary)
          ])
        ]
      },
      4: {
        id: 'minimal-black',
        scenes: [
          scene('Minimal · Abertura', [
            sh('rounded', 85, 340, 550, 5, accent, .9),
            t('MENOS', 70, 445, 580, 125, 94, white),
            t('É MAIS.', 70, 570, 580, 125, 94, white),
            t('DESIGN ESSENCIAL', 100, 770, 520, 85, 32, accent),
            label('MINIMAL BLACK', white)
          ]),
          scene('Minimal · Conteúdo', [
            sh('rounded', 95, 320, 530, 5, accent),
            t('SUA IDEIA.', 70, 450, 580, 155, 82, white),
            t('Uma mensagem de cada vez.', 100, 635, 520, 130, 34, white),
            label('FOCO NO ESSENCIAL', accent)
          ]),
          scene('Minimal · Encerramento', [
            sh('rounded', 85, 350, 550, 5, accent),
            t('OBRIGADO.', 60, 460, 600, 165, 82, white),
            t('ATÉ A PRÓXIMA', 95, 650, 530, 110, 35, accent),
            label('MINIMAL BLACK', white)
          ])
        ]
      }
    };
    const selected = configs[modelIndex];
    if (!selected) throw new Error('Modelo PRO ainda não disponível para testes.');
    return {
      title: `${models[modelIndex].name} — ${ratio}`,
      aspectRatio: ratio,
      templateId: selected.id,
      scenes: selected.scenes
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
    if (!model || (model.tier !== 'free' && ![1, 2, 3, 4].includes(Number(button.dataset.model)))) return;
    button.disabled = true;
    button.textContent = 'Criando...';
    try {
      if (!window.ScenesStorage) throw new Error('Armazenamento de Cenas indisponível.');
      const created = await ScenesStorage.createPresentation(model.tier === 'free' ? buildPresentation() : buildProPresentation(Number(button.dataset.model)));
      if (window.parent !== window) {
        window.parent.postMessage({type:'lousa-cam-template-created', id:created.id}, window.location.origin);
      } else {
        window.location.assign('./scenes.html');
      }
    } catch (error) {
      showNotice('Não foi possível criar o template: ' + error.message);
      button.disabled = false;
      button.textContent = model.tier === 'free' ? 'Usar template' : 'Testar modelo PRO';
    }
  });
  render();
})();
