/* =============================================
   EcoFood Monitor — Shared JavaScript
   localStorage helpers, tema escuro, toast,
   som de scan, navegação
   ============================================= */

// =============================================
// localStorage — CRUD de produtos
// =============================================

const DB_KEY = 'ecofood_products';

function getProducts() {
  try {
    return JSON.parse(localStorage.getItem(DB_KEY)) || [];
  } catch {
    return [];
  }
}

function saveProducts(products) {
  localStorage.setItem(DB_KEY, JSON.stringify(products));
}

function addProduct(product) {
  const products = getProducts();
  product.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  product.createdAt = new Date().toISOString();
  products.push(product);
  saveProducts(products);
  return product;
}

function deleteProduct(id) {
  const products = getProducts().filter(p => p.id !== id);
  saveProducts(products);
  return products;
}

function getProductById(id) {
  return getProducts().find(p => p.id === id) || null;
}

function getProductsByZona(zonaId) {
  return getProducts().filter(p => p.zonaId === zonaId);
}

function getZonaByProduct(product) {
  if (!product.zonaId) return null;
  return getZonaById(product.zonaId);
}

// =============================================
// localStorage — CRUD de zonas
// =============================================

const ZONAS_KEY = 'ecofood_zonas';

const CATEGORIAS = [
  { id: 'geladeira', nome: 'Geladeira', tempIdeal: 4, tempMin: 1, tempMax: 8, umidIdeal: 80, umidMin: 70, umidMax: 90, icone: '🧊' },
  { id: 'freezer', nome: 'Freezer', tempIdeal: -18, tempMin: -22, tempMax: -5, umidIdeal: 30, umidMin: 20, umidMax: 40, icone: '❄️' },
  { id: 'estoque', nome: 'Estoque Principal', tempIdeal: 25, tempMin: 20, tempMax: 30, umidIdeal: 60, umidMin: 45, umidMax: 75, icone: '🏭' },
  { id: 'camara', nome: 'Câmara Fria', tempIdeal: 2, tempMin: 0, tempMax: 5, umidIdeal: 88, umidMin: 80, umidMax: 95, icone: '🥶' },
  { id: 'adega', nome: 'Adega / Vinho', tempIdeal: 12, tempMin: 10, tempMax: 14, umidIdeal: 70, umidMin: 60, umidMax: 80, icone: '🍷' },
  { id: 'seco', nome: 'Estoque Seco', tempIdeal: 22, tempMin: 18, tempMax: 25, umidIdeal: 40, umidMin: 30, umidMax: 55, icone: '📦' },
];

function getZonas() {
  try { return JSON.parse(localStorage.getItem(ZONAS_KEY)) || []; }
  catch { return []; }
}

function saveZonas(zonas) {
  localStorage.setItem(ZONAS_KEY, JSON.stringify(zonas));
}

function addZona(zona) {
  const zonas = getZonas();
  zona.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  zona.createdAt = new Date().toISOString();
  zona.leituraAtual = {
    temperatura: zona.tempIdeal || 0,
    umidade: zona.umidIdeal || 50,
    timestamp: new Date().toISOString()
  };
  zona.historico = [];
  zonas.push(zona);
  saveZonas(zonas);
  return zona;
}

function deleteZona(id) {
  const zonas = getZonas().filter(z => z.id !== id);
  saveZonas(zonas);
  return zonas;
}

function getZonaById(id) {
  return getZonas().find(z => z.id === id) || null;
}

function simularLeitura(zona) {
  const variacaoTemp = (Math.random() - 0.5) * 1.5;
  const variacaoUmid = (Math.random() - 0.5) * 3;
  const novaTemp = Math.round((zona.leituraAtual.temperatura + variacaoTemp) * 10) / 10;
  const novaUmid = Math.round(Math.max(0, Math.min(100, zona.leituraAtual.umidade + variacaoUmid)));
  zona.leituraAtual = {
    temperatura: novaTemp,
    umidade: novaUmid,
    timestamp: new Date().toISOString()
  };
  zona.historico.push({ ...zona.leituraAtual });
  if (zona.historico.length > 60) zona.historico = zona.historico.slice(-60);
  return zona;
}

function avaliarZona(zona) {
  const t = zona.leituraAtual.temperatura;
  const u = zona.leituraAtual.umidade;
  const tempOk = t >= zona.tempMin && t <= zona.tempMax;
  const umidOk = u >= zona.umidMin && u <= zona.umidMax;
  if (!tempOk && !umidOk) return { status: 'crítico', label: 'Crítico', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
  if (!tempOk || !umidOk) return { status: 'alerta', label: 'Alerta', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
  return { status: 'normal', label: 'Normal', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' };
}

// =============================================
// Eco-Score Calculator
// =============================================

function calculateEcoScore(product) {
  const daysToExpiry = Math.ceil(
    (new Date(product.validade) - new Date()) / (1000 * 60 * 60 * 24)
  );

  const tempOk = product.temperatura >= 0 && product.temperatura <= 8;
  const category = product.categoria || 'geral';

  let score = 0;

  // Frescor: penalidade severa para vencidos
  if (daysToExpiry < 0) {
    score += Math.max(-50, daysToExpiry * 2.5);
  } else if (daysToExpiry > 30) score += 50;
  else if (daysToExpiry > 14) score += 40;
  else if (daysToExpiry > 7) score += 30;
  else if (daysToExpiry > 3) score += 20;
  else if (daysToExpiry > 1) score += 10;
  else score += 5;

  if (tempOk) score += 30;
  else score += 5;

  const categoryBonus = {
    'orgânico': 20, 'orgánico': 20, 'organico': 20,
    'vegetais': 18, 'verduras': 18, 'legumes': 18,
    'frutas': 18,
    'laticínios': 15, 'laticinios': 15, 'leite': 15, 'queijo': 15,
    'carnes': 12, 'carne': 12, 'aves': 12, 'peixes': 12,
    'grãos': 10, 'graos': 10, 'cereais': 10,
    'bebidas': 8,
    'geral': 10
  };
  score += categoryBonus[category.toLowerCase()] || 10;

  score = Math.min(100, Math.max(0, score));

  let ecoClass, label, color;
  if (score >= 80) { ecoClass = 'A'; label = 'Excelente'; color = '#16a34a'; }
  else if (score >= 60) { ecoClass = 'B'; label = 'Bom'; color = '#84cc16'; }
  else if (score >= 30) { ecoClass = 'C'; label = 'Regular'; color = '#eab308'; }
  else if (score >= 10) { ecoClass = 'D'; label = 'Ruim'; color = '#f97316'; }
  else { ecoClass = 'E'; label = 'Crítico'; color = '#ef4444'; }

  return { score, class: ecoClass, label, color };
}

function getRiskStatus(ecoScore) {
  if (ecoScore >= 60) return { label: 'Baixo', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' };
  if (ecoScore >= 30) return { label: 'Médio', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' };
  return { label: 'Crítico', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' };
}

// =============================================
// Tema escuro
// =============================================

function initTheme() {
  const saved = localStorage.getItem('ecofood_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (saved === 'dark' || (!saved && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('ecofood_theme', isDark ? 'dark' : 'light');
  updateThemeIcon();
}

function updateThemeIcon() {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = document.documentElement.classList.contains('dark');
  btn.innerHTML = isDark
    ? `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path d="M21.752 15.002A9.72 9.72 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/>
      </svg>`
    : `<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/>
      </svg>`;
}

// =============================================
// Toast notifications
// =============================================

function showToast(message, type = 'success', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const icons = {
    success: '<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    error: '<path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    info: '<path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>',
    warning: '<path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>'
  };

  const config = {
    success: { border: 'border-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/40', text: 'text-emerald-500' },
    error: { border: 'border-red-500', bg: 'bg-red-50 dark:bg-red-900/40', text: 'text-red-500' },
    info: { border: 'border-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/40', text: 'text-blue-500' },
    warning: { border: 'border-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-900/40', text: 'text-yellow-500' }
  };

  const c = config[type];

  const toast = document.createElement('div');
  toast.className = `flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-xl border-l-4 ${c.border} ${c.bg} backdrop-blur-sm`;
  toast.style.cssText = 'min-width: 340px; max-width: 460px; animation: toastIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;';

  toast.innerHTML = `
    <svg class="w-5 h-5 flex-shrink-0 ${c.text}" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      ${icons[type]}
    </svg>
    <p class="text-sm font-medium text-gray-800 dark:text-gray-100 flex-1">${message}</p>
    <button class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 p-0.5" onclick="this.closest('[id^=toast]').remove()" aria-label="Fechar">
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentElement) {
      toast.style.animation = 'toastOut 0.35s ease-in forwards';
      setTimeout(() => toast.remove(), 350);
    }
  }, duration);
}

// =============================================
// Som de scan (Web Audio API)
// =============================================

function playScanSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(1600, ctx.currentTime + 0.15);
    osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch (_) {}
}

// =============================================
// Formatação
// =============================================

function formatDate(dateString) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// =============================================
// Navegação
// =============================================

function goTo(page) {
  window.location.href = page;
}

// =============================================
// Resetar dados (simular nova conta)
// =============================================

function resetAllData() {
  if (!confirm('Tem certeza? Isso vai apagar TODOS os produtos, zonas e configurações do sistema.')) return;
  if (!confirm('Essa ação não pode ser desfeita. Confirmar exclusão?')) return;

  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(ZONAS_KEY);
  localStorage.removeItem('ecofood_theme');

  showToast('Dados resetados! Recarregando...', 'info', 2000);
  setTimeout(() => window.location.reload(), 1000);
}

// =============================================
// Dados mockados para simulação de scan
// =============================================

const MOCK_PRODUCTS = [
  { nome: 'Tomate Orgânico', validade: '2026-07-20', temperatura: 4, categoria: 'orgânico', quantidade: 50, fornecedor: 'Horta Feliz Ltda', lote: 'LOT-2026-001' },
  { nome: 'Leite Integral', validade: '2026-07-12', temperatura: 2, categoria: 'laticínios', quantidade: 120, fornecedor: 'Laticínios Vale Verde', lote: 'LOT-2026-002' },
  { nome: 'Alface Crespa', validade: '2026-07-06', temperatura: 6, categoria: 'vegetais', quantidade: 80, fornecedor: 'Sítio Esperança', lote: 'LOT-2026-003' },
  { nome: 'Carne Bovina Moída', validade: '2026-07-08', temperatura: 1, categoria: 'carnes', quantidade: 30, fornecedor: 'Frigorífico Boi Nobre', lote: 'LOT-2026-004' },
  { nome: 'Suco de Laranja Natural', validade: '2026-07-15', temperatura: 5, categoria: 'bebidas', quantidade: 200, fornecedor: 'Sucos da Terra', lote: 'LOT-2026-005' },
];

function getRandomMock() {
  const mock = { ...MOCK_PRODUCTS[Math.floor(Math.random() * MOCK_PRODUCTS.length)] };
  const zonas = getZonas();
  if (zonas.length > 0) {
    mock.zonaId = zonas[Math.floor(Math.random() * zonas.length)].id;
  }
  return mock;
}

// =============================================
// Inicialização
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  updateThemeIcon();

  const themeBtn = document.getElementById('theme-toggle');
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
});
