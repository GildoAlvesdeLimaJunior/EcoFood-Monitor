/* =============================================
   EcoFood Monitor — Entrada (Cadastro de Lotes)
   Scan simulado, Eco-Score, localStorage, zonas
   ============================================= */

const form = document.getElementById('produto-form');
const scanBtn = document.getElementById('scan-btn');
const ecoScoreDisplay = document.getElementById('eco-score-display');
const zonaSelect = document.getElementById('zona-produto');

// =============================================
// Popular select de zonas
// =============================================

function populateZonaSelect() {
  if (!zonaSelect) return;
  const zonas = getZonas();
  const currentValue = zonaSelect.value;
  zonaSelect.innerHTML = '<option value="">— Selecione uma zona —</option>';
  zonas.forEach(z => {
    const cat = CATEGORIAS.find(c => c.id === z.categoria);
    const option = document.createElement('option');
    option.value = z.id;
    option.textContent = `${cat?.icone || '📦'} ${z.nome}`;
    zonaSelect.appendChild(option);
  });
  if (currentValue) zonaSelect.value = currentValue;
}

// =============================================
// Preencher formulário com dados mockados
// (simula leitura de código de barras)
// =============================================

function fillMockData() {
  playScanSound();

  const mock = getRandomMock();

  document.getElementById('nome').value = mock.nome;
  document.getElementById('validade').value = mock.validade;
  document.getElementById('temperatura').value = mock.temperatura;
  document.getElementById('categoria').value = mock.categoria;
  document.getElementById('quantidade').value = mock.quantidade;
  document.getElementById('fornecedor').value = mock.fornecedor;
  document.getElementById('lote').value = mock.lote;

  // Preencher zona se disponível
  if (zonaSelect && mock.zonaId) {
    zonaSelect.value = mock.zonaId;
  } else if (zonaSelect && zonaSelect.options.length > 1) {
    const randomIdx = 1 + Math.floor(Math.random() * (zonaSelect.options.length - 1));
    zonaSelect.value = zonaSelect.options[randomIdx].value;
  }

  // Feedback visual no botão
  scanBtn.innerHTML = `
    <svg class="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/>
      <path d="M6 6h.008v.008H6V6z"/>
    </svg>
    Lote escaneado!
  `;
  scanBtn.className = 'btn btn-primary btn-sm !bg-emerald-600';

  setTimeout(() => {
    scanBtn.innerHTML = `
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
        <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/>
        <path d="M6 6h.008v.008H6V6z"/>
      </svg>
      Escanear Lote
    `;
    scanBtn.className = 'btn btn-primary btn-sm';
  }, 2000);

  updateEcoScorePreview();
}

// =============================================
// Preview do Eco-Score (tempo real)
// =============================================

function getFormData() {
  return {
    nome: document.getElementById('nome').value,
    validade: document.getElementById('validade').value,
    temperatura: parseFloat(document.getElementById('temperatura').value) || 0,
    categoria: document.getElementById('categoria').value,
  };
}

function updateEcoScorePreview() {
  const data = getFormData();
  if (!data.nome || !data.validade) {
    ecoScoreDisplay.innerHTML = '';
    return;
  }

  const result = calculateEcoScore(data);
  const risk = getRiskStatus(result.score);

  ecoScoreDisplay.innerHTML = `
    <div class="flex items-center gap-4 animate-fade-in">
      <div class="ecoscore-ring">
        <svg width="56" height="56" viewBox="0 0 36 36">
          <circle class="bg-circle" cx="18" cy="18" r="15.5"/>
          <circle class="progress-circle" cx="18" cy="18" r="15.5"
            stroke="${result.color}"
            stroke-dasharray="97.4"
            stroke-dashoffset="${97.4 - (result.score / 100) * 97.4}"
          />
        </svg>
        <span class="score-text" style="color: ${result.color}">${result.class}</span>
      </div>
      <div>
        <div class="text-sm font-semibold" style="color: ${result.color}">${result.label}</div>
        <div class="text-xs text-gray-500 dark:text-gray-400">Eco-Score: ${result.score}/100</div>
        <span class="badge mt-1 ${risk.color}">Risco ${risk.label}</span>
      </div>
    </div>
  `;
}

['nome', 'validade', 'temperatura', 'categoria'].forEach(id => {
  document.getElementById(id)?.addEventListener('input', updateEcoScorePreview);
  document.getElementById(id)?.addEventListener('change', updateEcoScorePreview);
});

// =============================================
// Salvar produto no localStorage
// =============================================

function handleSubmit(e) {
  e.preventDefault();

  const nome = document.getElementById('nome').value.trim();
  if (!nome) {
    showToast('Preencha o nome do produto.', 'error');
    return;
  }

  const product = {
    nome,
    validade: document.getElementById('validade').value,
    temperatura: parseFloat(document.getElementById('temperatura').value) || 0,
    categoria: document.getElementById('categoria').value,
    quantidade: parseInt(document.getElementById('quantidade').value) || 0,
    fornecedor: document.getElementById('fornecedor').value.trim(),
    lote: document.getElementById('lote').value.trim(),
    zonaId: document.getElementById('zona-produto')?.value || '',
  };

  const eco = calculateEcoScore(product);
  product.ecoScore = eco.score;
  product.ecoClass = eco.class;

  addProduct(product);

  const zona = product.zonaId ? getZonaById(product.zonaId) : null;
  const zonaStr = zona ? ` em ${zona.nome}` : '';
  showToast(`${product.nome} cadastrado${zonaStr}! Eco-Score: ${eco.class} (${eco.score})`, 'success');

  form.reset();
  ecoScoreDisplay.innerHTML = '';

  scanBtn.innerHTML = `
    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"/>
      <path d="M6 6h.008v.008H6V6z"/>
    </svg>
    Escanear Lote
  `;
  scanBtn.className = 'btn btn-primary btn-sm';

  populateZonaSelect();
}

// =============================================
// Event listeners
// =============================================

if (scanBtn) scanBtn.addEventListener('click', fillMockData);
if (form) form.addEventListener('submit', handleSubmit);

document.addEventListener('DOMContentLoaded', populateZonaSelect);
