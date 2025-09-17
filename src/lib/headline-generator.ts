import crypto from 'crypto';

const WORD_SETS: Record<string, string[]> = {
  smartphone: ['ASTRONÔMICO 📱', 'MISSÃO LUNAR 🚀', 'FLAGSHIP 💥'],
  tv: ['CINEMÃO 📺', 'TELÃO 🎬', 'PIXELS 🔥'],
  notebook: ['ESTUDOS TURBO 💻', 'TRABALHO 🧠', 'NOTE BRABO ⚙️'],
  audio: ['GRAVEZERA 🎧', 'SOM CRISTAL 🎵', 'OUVIDO FELIZ 🔊'],
  gaming: ['FPS NAS ALTURAS 🎮', 'GG EASY 🏆', 'LATÊNCIA ZERO ⚡'],
  casa: ['CASA CHIQUE 🏠', 'UTILIDADE TOP ✨', 'LAR UPGRADE 🔧'],
  cozinha: ['COZINHA PRO 🍳', 'RECEITA VAPT-VUPT 🍝', 'SUCÃO GELADO 🧊'],
  fitness: ['METER O SHAPE 🏋️', 'CARDIO 💪', 'PROJETO VERÃO ☀️'],
  auto: ['CARRO EQUIPADO 🚗', 'GARAGEM TURBO 🛠️', 'RODAS FELIZES 🚘'],
  pet: ['PET FELIZ 🐾', 'MIAU + AU-AU 💚', 'PET PREMIUM 🐶'],
  perfumaria: ['CHEIRO DE RICO 💎', 'AROMA FINO 🌹', 'ASSINATURA ✨'],
  default: ['ACHADO RARO 🔥', 'PEGA ESSA 🎯', 'PREÇO QUEBRADO 💣'],
};

const CATEGORY_PATTERNS: [string, RegExp][] = [
  ['smartphone', /\b(galaxy|iphone|redmi|moto|xiaomi|realme|smartphone|celular)\b/i],
  ['tv', /\b(tv|smart\s*tv|oled|qled|uhd|4k|55['’ ]|65['’ ])\b/i],
  ['notebook', /\b(notebook|laptop|macbook)\b/i],
  ['audio', /\b(fone|headset|earbud|airpods|soundbar|caixa de som)\b/i],
  ['gaming', /\b(ps5|xbox|nintendo|rtx|gpu|placa de vídeo|gamer|gaming)\b/i],
  ['cozinha', /\b(fritadeira|air\s*fryer|liquidificador|batedeira|caf[eé]|micro-ondas|forno)\b/i],
  ['fitness', /\b(whey|creatina|bicicleta|esteira|halter|suplemento|gym)\b/i],
  ['auto', /\b(pneu|som automotivo|suporte veicular|carregador veicular|automotivo)\b/i],
  ['pet', /\b(ração|petisco|arranhador|antipulga|areia|pet)\b/i],
  ['perfumaria', /\b(perfume|eau de|parfum|colônia|toilette)\b/i],
  ['casa', /\b(lençol|edredom|travesseiro|luminária|organizador|ferramenta|casa)\b/i],
];

function pickFrom<T>(lst: T[], seed: string): T {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  const index = parseInt(hash, 16) % lst.length;
  return lst[index];
}

function categoryFor(title: string): string {
  for (const [cat, pat] of CATEGORY_PATTERNS) {
    if (pat.test(title || '')) {
      return cat;
    }
  }
  return 'default';
}

function urgentPrefix(discountPct: number, price: number | null, lightning: boolean): string {
  const high = discountPct >= 40;
  const mid = discountPct >= 25;

  let base: string[];
  if (lightning || high) {
    base = ['CORRE! ⚡', 'RELÂMPAGO ⚡', 'ÚLTIMAS UNIDADES ⌛'];
  } else if (mid) {
    base = ['ACHADO 🔥', 'TÁ VOANDO 💨', 'PEGA AGORA ✅'];
  } else {
    base = ['PREÇO BAIXOU 💥', 'BOA DEMAIS 💙', 'APROVEITA 💫'];
  }

  return pickFrom(base, `urgent-${discountPct}-${price}-${lightning}`);
}

export function generateHeadline(title: string, price_from: any, price: any): string {
  try {
    const p0 = price_from ? parseFloat(price_from) : null;
    const p1 = price ? parseFloat(price) : null;

    const cat = categoryFor(title || '');
    const wordPool = WORD_SETS[cat] || WORD_SETS['default'];

    let discountPct = 0;
    if (p0 && p1 && p0 > 0 && p1 <= p0) {
      discountPct = Math.round(((p0 - p1) / p0) * 100);
    }

    const urgent = urgentPrefix(discountPct, p1, false);
    const seed = `${title}-${p0}-${p1}-${discountPct}-${cat}`;
    const flair = pickFrom(wordPool, seed);

    return `${urgent} ${flair}`;
  } catch {
    return '🔥 Super Oferta!';
  }
}
