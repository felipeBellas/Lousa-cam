(() => {
  'use strict';

  // Os 19 modelos PRO estão disponíveis exclusivamente para testes nesta etapa.
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
    const colors = index <= 19 ? [customColor, ...palettes[paletteIndex].colors.slice(1)] : [];
    const bgStyle = index <= 19 && backgroundMode === 'solid' ? `--chosen-bg:${backgroundColor};` : ''; 
    const previewClass = index <= 19 && backgroundMode === 'transparent' ? ' preview-transparent' : ''; 
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
      const testable = index >= 1 && index <= 19;
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
      },
      5: {
        id: 'podcast-show',
        scenes: [
          scene('Podcast · Abertura', [
            sh('ellipse', 220, 205, 280, 280, accent, .22),
            sh('rounded', 305, 235, 110, 245, secondary, .92),
            sh('rounded', 265, 330, 190, 150, tertiary, .9),
            sh('rounded', 170, 455, 380, 22, accent, .95),
            t('PODCAST', 55, 565, 610, 145, 88, white),
            t('CONVERSA DE VERDADE', 65, 705, 590, 90, 35, secondary),
            label('EPISÓDIO • 01', white)
          ]),
          scene('Podcast · Episódio', [
            sh('rounded', 75, 285, 570, 610, white, .13),
            sh('rounded', 100, 355, 520, 18, secondary, .9),
            t('EP. 01', 90, 430, 540, 105, 54, accent),
            t('UM PAPO\nQUE INSPIRA', 70, 535, 580, 220, 70, white),
            t('Convidado: seu nome aqui', 90, 775, 540, 90, 32, secondary),
            label('PODCAST SHOW', white)
          ]),
          scene('Podcast · Encerramento', [
            sh('ellipse', 430, 250, 155, 155, secondary, .8),
            sh('rounded', 90, 800, 540, 20, accent, .95),
            t('VALEU POR\nOUVIR!', 60, 435, 600, 240, 86, white),
            t('Até o próximo episódio', 85, 700, 550, 90, 38, secondary),
            label('SIGA • COMPARTILHE', white)
          ])
        ]
      },
      6: {
        id: 'vlog-diario',
        scenes: [
          scene('Vlog · Abertura', [
            sh('rounded', 90, 260, 540, 610, accent, .18, -4),
            sh('rounded', 115, 300, 490, 130, secondary, .9, 3),
            t('MEU DIA', 65, 455, 590, 155, 100, white),
            t('VEM COMIGO!', 75, 625, 570, 105, 50, accent),
            label('VLOG DIÁRIO • 01', white)
          ]),
          scene('Vlog · Momentos', [
            sh('rounded', 75, 295, 570, 190, secondary, .75, -3),
            sh('rounded', 75, 535, 570, 190, tertiary, .7, 3),
            sh('rounded', 75, 775, 570, 190, accent, .65, -2),
            t('MANHÃ', 95, 335, 530, 110, 58, white),
            t('TARDE', 95, 575, 530, 110, 58, white),
            t('NOITE', 95, 815, 530, 110, 58, white),
            label('3 MOMENTOS DO MEU DIA', white)
          ]),
          scene('Vlog · Encerramento', [
            sh('ellipse', 465, 235, 140, 140, secondary, .8),
            sh('rounded', 100, 820, 520, 20, accent, .95),
            t('ATÉ AMANHÃ!', 50, 455, 620, 165, 78, white),
            t('Obrigado por acompanhar', 70, 650, 580, 100, 36, secondary),
            label('VLOG DIÁRIO', white)
          ])
        ]
      },
      7: {
        id: 'reels-impacto',
        scenes: [
          scene('Reels · Gancho', [
            sh('rounded', 65, 280, 590, 18, accent, .95, -5),
            sh('rounded', 65, 875, 590, 18, secondary, .95, 5),
            sh('ellipse', 465, 190, 135, 135, tertiary, .85),
            t('OLHA\nISSO!', 45, 420, 630, 280, 128, white),
            t('VOCÊ PRECISA VER', 65, 710, 590, 100, 42, accent),
            label('REELS • IMPACTO', white)
          ]),
          scene('Reels · Destaque', [
            sh('rounded', 85, 300, 550, 650, white, .12),
            sh('rounded', 115, 390, 490, 20, tertiary, .95),
            t('3 DICAS', 70, 470, 580, 145, 92, accent),
            t('RÁPIDAS', 70, 615, 580, 145, 88, white),
            t('Salve para ver depois', 90, 790, 540, 85, 34, secondary),
            label('CONTEÚDO DIRETO AO PONTO', white)
          ]),
          scene('Reels · Chamada', [
            sh('ellipse', 90, 255, 155, 155, secondary, .85),
            sh('rounded', 95, 835, 530, 22, accent, .95),
            t('CURTIU?', 55, 450, 610, 155, 105, white),
            t('COMENTA AQUI ↓', 60, 625, 600, 115, 48, accent),
            label('COMPARTILHE • SIGA', white)
          ])
        ]
      },
      8: {
        id: 'top-5',
        scenes: [
          scene('Top 5 · Abertura', [
            sh('ellipse', 465, 200, 145, 145, secondary, .85),
            sh('rounded', 90, 330, 540, 95, accent, .95, -4),
            t('TOP 5', 55, 455, 610, 185, 145, white),
            t('MINHAS ESCOLHAS', 65, 650, 590, 100, 42, secondary),
            label('RANKING • LISTA', white)
          ]),
          scene('Top 5 · Ranking', [
            sh('rounded', 95, 315, 530, 125, accent, .85),
            sh('rounded', 95, 475, 530, 125, secondary, .85),
            sh('rounded', 95, 635, 530, 125, tertiary, .85),
            sh('rounded', 95, 795, 530, 125, white, .18),
            t('01  PRIMEIRO', 115, 330, 490, 95, 43, white, 'left'),
            t('02  SEGUNDO', 115, 490, 490, 95, 43, white, 'left'),
            t('03  TERCEIRO', 115, 650, 490, 95, 43, white, 'left'),
            t('04  QUARTO', 115, 810, 490, 95, 43, white, 'left'),
            label('EDITE OS ITENS NO EDITOR', white)
          ]),
          scene('Top 5 · Fechamento', [
            sh('rounded', 90, 345, 540, 100, tertiary, .9),
            t('E O Nº 1?', 55, 465, 610, 155, 100, white),
            t('Qual é o seu favorito?', 65, 650, 590, 105, 40, accent),
            t('Comente sua escolha', 70, 785, 580, 80, 32, secondary),
            label('TOP 5', white)
          ])
        ]
      }
      ,
      9: {
        id: 'storytelling',
        scenes: [
          scene('Storytelling · Abertura', [
            sh('rounded',65,235,590,650,tertiary,.24,-3),
            sh('ellipse',450,140,165,165,secondary,.8),
            sh('rounded',110,945,500,18,accent,.9),
            t('ERA UMA VEZ', 45, 465, 630, 165, 91, white),
            t('Uma história para contar', 60, 665, 600, 115, 39, accent),
            label('STORYTELLING', secondary)
          ]),
          scene('Storytelling · Conteúdo', [
            sh('rounded',75,235,570,95,accent,.8),
            sh('ellipse',95,800,170,170,secondary,.8),
            sh('rounded',230,850,360,55,tertiary,.75,-6),
            t('O GRANDE MOMENTO', 45, 465, 630, 165, 70, white),
            t('O que aconteceu depois?', 60, 665, 600, 115, 39, accent),
            label('STORYTELLING', secondary)
          ]),
          scene('Storytelling · Encerramento', [
            sh('ellipse',240,160,240,240,secondary,.7),
            sh('rounded',80,880,560,28,accent,.9),
            t('CONTINUA...', 45, 465, 630, 165, 91, white),
            t('Sua próxima história começa aqui', 60, 665, 600, 115, 39, accent),
            label('STORYTELLING', secondary)
          ])
        ]
      },
      10: {
        id: 'tutorial-pro',
        scenes: [
          scene('Tutorial Pro · Abertura', [
            sh('rounded',85,230,550,90,accent,.9),
            sh('rounded',105,830,510,45,secondary,.85),
            t('COMO FAZER', 45, 465, 630, 165, 91, white),
            t('Aprenda em poucos passos', 60, 665, 600, 115, 39, accent),
            label('TUTORIAL PRO', secondary)
          ]),
          scene('Tutorial Pro · Conteúdo', [
            sh('rounded',100,250,520,110,accent,.8),
            sh('rounded',100,820,520,110,tertiary,.8),
            sh('ellipse',90,1030,90,90,secondary,.85),
            t('PASSO 1 • 2 • 3', 45, 465, 630, 165, 70, white),
            t('Personalize as instruções', 60, 665, 600, 115, 39, accent),
            label('TUTORIAL PRO', secondary)
          ]),
          scene('Tutorial Pro · Encerramento', [
            sh('ellipse',270,185,180,180,accent,.8),
            sh('rounded',120,850,480,45,secondary,.85),
            t('VOCÊ CONSEGUIU!', 45, 465, 630, 165, 70, white),
            t('Salve e compartilhe', 60, 665, 600, 115, 39, accent),
            label('TUTORIAL PRO', secondary)
          ])
        ]
      },
      11: {
        id: 'tech-future',
        scenes: [
          scene('Tech Future · Abertura', [
            sh('rounded',100,205,520,14,accent,.85),
            sh('ellipse',455,270,160,160,tertiary,.7),
            sh('rounded',90,875,540,18,secondary,.9),
            t('FUTURO', 45, 465, 630, 165, 91, white),
            t('Ideias que conectam', 60, 665, 600, 115, 39, accent),
            label('TECH FUTURE', secondary)
          ]),
          scene('Tech Future · Conteúdo', [
            sh('rounded',70,230,580,530,tertiary,.20),
            sh('ellipse',95,820,160,160,accent,.8),
            t('NOVA TECNOLOGIA', 45, 465, 630, 165, 70, white),
            t('Inovação na prática', 60, 665, 600, 115, 39, accent),
            label('TECH FUTURE', secondary)
          ]),
          scene('Tech Future · Encerramento', [
            sh('ellipse',255,180,210,210,secondary,.75),
            sh('rounded',85,830,550,28,accent,.9),
            t('PRÓXIMO NÍVEL', 45, 465, 630, 165, 91, white),
            t('Explore novas possibilidades', 60, 665, 600, 115, 39, accent),
            label('TECH FUTURE', secondary)
          ])
        ]
      },
      12: {
        id: 'comparativo',
        scenes: [
          scene('Comparativo · Abertura', [
            sh('rounded',70,280,275,580,secondary,.40),
            sh('rounded',375,280,275,580,accent,.40),
            t('ANTES / DEPOIS', 45, 465, 630, 165, 91, white),
            t('Veja a transformação', 60, 665, 600, 115, 39, accent),
            label('COMPARATIVO', secondary)
          ]),
          scene('Comparativo · Conteúdo', [
            sh('rounded',75,270,265,620,secondary,.30),
            sh('rounded',380,270,265,620,tertiary,.30),
            sh('rounded',346,290,26,580,white,.7),
            t('LADO A LADO', 45, 465, 630, 165, 91, white),
            t('Compare os resultados', 60, 665, 600, 115, 39, accent),
            label('COMPARATIVO', secondary)
          ]),
          scene('Comparativo · Encerramento', [
            sh('ellipse',100,220,180,180,secondary,.8),
            sh('ellipse',440,220,180,180,accent,.8),
            t('QUAL VOCÊ PREFERE?', 45, 465, 630, 165, 70, white),
            t('Compartilhe sua escolha', 60, 665, 600, 115, 39, accent),
            label('COMPARATIVO', secondary)
          ])
        ]
      },
      13: {
        id: 'infografico-color',
        scenes: [
          scene('Infográfico Color · Abertura', [
            sh('ellipse',90,260,135,135,accent,.9),
            sh('ellipse',290,260,135,135,secondary,.9),
            sh('ellipse',490,260,135,135,tertiary,.9),
            t('3 IDEIAS', 45, 465, 630, 165, 91, white),
            t('Informação que se destaca', 60, 665, 600, 115, 39, accent),
            label('INFOGRÁFICO COLOR', secondary)
          ]),
          scene('Infográfico Color · Conteúdo', [
            sh('rounded',105,260,510,95,accent,.8),
            sh('rounded',105,425,510,95,secondary,.8),
            sh('rounded',105,590,510,95,tertiary,.8),
            t('1 • 2 • 3', 45, 465, 630, 165, 91, white),
            t('Edite cada etapa', 60, 665, 600, 115, 39, accent),
            label('INFOGRÁFICO COLOR', secondary)
          ]),
          scene('Infográfico Color · Encerramento', [
            sh('ellipse',100,245,155,155,accent,.8),
            sh('rounded',100,865,520,45,secondary,.85),
            t('RESUMO VISUAL', 45, 465, 630, 165, 91, white),
            t('Aprenda de um jeito novo', 60, 665, 600, 115, 39, accent),
            label('INFOGRÁFICO COLOR', secondary)
          ])
        ]
      },
      14: {
        id: 'quote-art',
        scenes: [
          scene('Quote Art · Abertura', [
            sh('ellipse',55,170,200,200,secondary,.35),
            sh('rounded',110,870,500,12,accent,.9),
            t('“INSPIRE”', 45, 465, 630, 165, 91, white),
            t('Sua frase aqui', 60, 665, 600, 115, 39, accent),
            label('QUOTE ART', secondary)
          ]),
          scene('Quote Art · Conteúdo', [
            sh('rounded',70,280,580,560,tertiary,.18),
            sh('ellipse',485,160,140,140,accent,.65),
            t('“ACREDITE”', 45, 465, 630, 165, 91, white),
            t('As palavras têm força', 60, 665, 600, 115, 39, accent),
            label('QUOTE ART', secondary)
          ]),
          scene('Quote Art · Encerramento', [
            sh('ellipse',260,180,200,200,secondary,.4),
            sh('rounded',110,875,500,14,accent,.9),
            t('“CRIE”', 45, 465, 630, 165, 91, white),
            t('Compartilhe sua mensagem', 60, 665, 600, 115, 39, accent),
            label('QUOTE ART', secondary)
          ])
        ]
      },
      15: {
        id: 'aula-dinamica',
        scenes: [
          scene('Aula Dinâmica · Abertura', [
            sh('rounded',65,250,590,75,accent,.85),
            sh('ellipse',460,840,160,160,secondary,.85),
            t('VAMOS APRENDER', 45, 465, 630, 165, 91, white),
            t('Um tema por vez', 60, 665, 600, 115, 39, accent),
            label('AULA DINÂMICA', secondary)
          ]),
          scene('Aula Dinâmica · Conteúdo', [
            sh('rounded',80,255,560,620,tertiary,.20),
            sh('rounded',100,875,520,22,accent,.85),
            t('CONCEITO-CHAVE', 45, 465, 630, 165, 91, white),
            t('Explique com exemplos', 60, 665, 600, 115, 39, accent),
            label('AULA DINÂMICA', secondary)
          ]),
          scene('Aula Dinâmica · Encerramento', [
            sh('ellipse',280,170,160,160,accent,.75),
            sh('rounded',95,840,530,55,secondary,.85),
            t('HORA DE PRATICAR', 45, 465, 630, 165, 70, white),
            t('Revise o que aprendeu', 60, 665, 600, 115, 39, accent),
            label('AULA DINÂMICA', secondary)
          ])
        ]
      },
      16: {
        id: 'ciencia-visual',
        scenes: [
          scene('Ciência Visual · Abertura', [
            sh('ellipse',245,145,235,235,tertiary,.30),
            sh('ellipse',305,200,115,115,accent,.75),
            sh('rounded',95,850,530,25,secondary,.9),
            t('CIÊNCIA', 45, 465, 630, 165, 91, white),
            t('Perguntas que transformam', 60, 665, 600, 115, 39, accent),
            label('CIÊNCIA VISUAL', secondary)
          ]),
          scene('Ciência Visual · Conteúdo', [
            sh('ellipse',120,240,190,190,secondary,.5),
            sh('ellipse',380,240,190,190,accent,.5),
            sh('rounded',85,870,550,20,tertiary,.9),
            t('OBSERVE • EXPLIQUE', 45, 465, 630, 165, 70, white),
            t('Da hipótese à descoberta', 60, 665, 600, 115, 39, accent),
            label('CIÊNCIA VISUAL', secondary)
          ]),
          scene('Ciência Visual · Encerramento', [
            sh('ellipse',270,180,190,190,accent,.65),
            sh('rounded',105,865,510,20,secondary,.9),
            t('DESCUBRA MAIS', 45, 465, 630, 165, 91, white),
            t('A ciência está em tudo', 60, 665, 600, 115, 39, accent),
            label('CIÊNCIA VISUAL', secondary)
          ])
        ]
      },
      17: {
        id: 'business-clean',
        scenes: [
          scene('Business Clean · Abertura', [
            sh('rounded',95,320,530,7,accent,.9),
            sh('rounded',95,845,530,7,secondary,.75),
            t('APRESENTAÇÃO', 45, 465, 630, 165, 91, white),
            t('Sua melhor ideia', 60, 665, 600, 115, 39, accent),
            label('BUSINESS CLEAN', secondary)
          ]),
          scene('Business Clean · Conteúdo', [
            sh('rounded',80,270,560,570,tertiary,.15),
            sh('rounded',100,870,520,9,accent,.9),
            t('NOSSA PROPOSTA', 45, 465, 630, 165, 91, white),
            t('Estratégia e resultados', 60, 665, 600, 115, 39, accent),
            label('BUSINESS CLEAN', secondary)
          ]),
          scene('Business Clean · Encerramento', [
            sh('rounded',95,350,530,8,accent,.9),
            sh('rounded',95,835,530,8,secondary,.8),
            t('OBRIGADO', 45, 465, 630, 165, 91, white),
            t('Vamos conversar?', 60, 665, 600, 115, 39, accent),
            label('BUSINESS CLEAN', secondary)
          ])
        ]
      },
      18: {
        id: 'product-spotlight',
        scenes: [
          scene('Product Spotlight · Abertura', [
            sh('rounded',155,210,410,320,tertiary,.30),
            sh('ellipse',270,245,180,180,accent,.55),
            t('NOVIDADE', 45, 465, 630, 165, 91, white),
            t('Conheça o produto', 60, 665, 600, 115, 39, accent),
            label('PRODUCT SPOTLIGHT', secondary)
          ]),
          scene('Product Spotlight · Conteúdo', [
            sh('rounded',130,250,460,390,tertiary,.22),
            sh('rounded',120,840,480,55,accent,.75),
            t('EM DESTAQUE', 45, 465, 630, 165, 91, white),
            t('Benefícios e diferenciais', 60, 665, 600, 115, 39, accent),
            label('PRODUCT SPOTLIGHT', secondary)
          ]),
          scene('Product Spotlight · Encerramento', [
            sh('ellipse',245,200,230,230,secondary,.50),
            sh('rounded',105,855,510,45,accent,.85),
            t('CONHEÇA AGORA', 45, 465, 630, 165, 91, white),
            t('Saiba mais', 60, 665, 600, 115, 39, accent),
            label('PRODUCT SPOTLIGHT', secondary)
          ])
        ]
      },
      19: {
        id: 'cinematic-intro',
        scenes: [
          scene('Cinematic Intro · Abertura', [
            sh('rounded',70,230,580,14,accent,.9),
            sh('rounded',70,890,580,14,accent,.9),
            sh('ellipse',480,280,120,120,secondary,.6),
            t('AÇÃO!', 45, 465, 630, 165, 91, white),
            t('Sua história começa', 60, 665, 600, 115, 39, accent),
            label('CINEMATIC INTRO', secondary)
          ]),
          scene('Cinematic Intro · Conteúdo', [
            sh('rounded',70,210,580,16,accent,.9),
            sh('rounded',70,910,580,16,accent,.9),
            sh('ellipse',110,290,130,130,secondary,.45),
            t('A HISTÓRIA', 45, 465, 630, 165, 91, white),
            t('Cada detalhe importa', 60, 665, 600, 115, 39, accent),
            label('CINEMATIC INTRO', secondary)
          ]),
          scene('Cinematic Intro · Encerramento', [
            sh('rounded',70,240,580,15,accent,.9),
            sh('rounded',70,870,580,15,accent,.9),
            t('FIM DE CENA', 45, 465, 630, 165, 91, white),
            t('Até a próxima produção', 60, 665, 600, 115, 39, accent),
            label('CINEMATIC INTRO', secondary)
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
    if (!model || (model.tier !== 'free' && !(Number(button.dataset.model) >= 1 && Number(button.dataset.model) <= 19))) return;
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
