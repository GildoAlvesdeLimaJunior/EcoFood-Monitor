/* =============================================
   EcoFood Monitor — Dashboard
   Gráficos Chart.js, tabela dinâmica,
   filtros, zonas, modal Telegram, localStorage
   ============================================= */

// =============================================
// Inicializar gráficos (Chart.js via CDN)
// =============================================

let chartCategorias = null;
let chartRisco = null;

function initCharts() {
  const products = getProducts();

  const catCtx = document.getElementById('chart-categorias');
  if (catCtx) {
    const categorias = {};
    products.forEach(p => {
      const cat = p.categoria || 'geral';
      categorias[cat] = (categorias[cat] || 0) + 1;
    });

    if (Object.keys(categorias).length === 0) {
      categorias['Nenhum produto'] = 1;
    }

    const colors = ['#059669', '#10b981', '#84cc16', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#06b6d4'];

    if (chartCategorias) chartCategorias.destroy();
    chartCategorias = new Chart(catCtx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(categorias).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
        datasets: [{
          data: Object.values(categorias),
          backgroundColor: colors.slice(0, Object.keys(categorias).length),
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true, font: { size: 11 } } }
        }
      }
    });
  }

  const riskCtx = document.getElementById('chart-risco');
  if (riskCtx) {
    let baixo = 0, medio = 0, critico = 0;
    products.forEach(p => {
      const status = getRiskStatus(p.ecoScore || 0);
      if (status.label === 'Baixo') baixo++;
      else if (status.label === 'Médio') medio++;
      else critico++;
    });

    if (baixo === 0 && medio === 0 && critico === 0) medio = 1;

    if (chartRisco) chartRisco.destroy();
    chartRisco = new Chart(riskCtx, {
      type: 'bar',
      data: {
        labels: ['Baixo', 'Médio', 'Crítico'],
        datasets: [{
          label: 'Lotes',
          data: [baixo, medio, critico],
          backgroundColor: ['#10b981', '#eab308', '#ef4444'],
          borderRadius: 6,
          borderSkipped: false,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { display: false } },
          x: { grid: { display: false } }
        }
      }
    });
  }
}

// =============================================
// Renderizar tabela de lotes
// =============================================

let currentFilter = 'todos';
let currentZonaFilter = 'todas';

function renderTable(filter = 'todos', zonaFilter) {
  currentFilter = filter;
  if (zonaFilter !== undefined) currentZonaFilter = zonaFilter;

  const tbody = document.getElementById('lotes-tbody');
  const empty = document.getElementById('empty-state');
  if (!tbody) return;

  let products = getProducts();

  if (currentZonaFilter && currentZonaFilter !== 'todas') {
    products = products.filter(p => p.zonaId === currentZonaFilter);
  }

  products.sort((a, b) => {
    const riskA = getRiskStatus(a.ecoScore || 0).label;
    const riskB = getRiskStatus(b.ecoScore || 0).label;
    const order = { 'Crítico': 0, 'Médio': 1, 'Baixo': 2 };
    if (order[riskA] !== order[riskB]) return order[riskA] - order[riskB];
    return (a.ecoScore || 0) - (b.ecoScore || 0);
  });

  if (filter !== 'todos') {
    products = products.filter(p => {
      const status = getRiskStatus(p.ecoScore || 0).label;
      return status.toLowerCase() === filter.toLowerCase();
    });
  }

  if (products.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    updateCounts();
    renderZonaFilters();
    return;
  }

  if (empty) empty.classList.add('hidden');

  const html = products.map(p => {
    const eco = { score: p.ecoScore || 0, class: p.ecoClass || 'N/A' };
    const risk = getRiskStatus(eco.score);
    const zona = getZonaById(p.zonaId);
    const cat = zona ? CATEGORIAS.find(c => c.id === zona.categoria) : null;

    return `
      <tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg ${risk.color.split(' ')[0]} bg-opacity-20 flex items-center justify-center text-xs font-bold ${risk.color.split(' ')[1]}">
              ${eco.class}
            </div>
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">${p.nome}</p>
              <p class="text-xs text-gray-400">${p.lote || 'Sem lote'}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3">
          ${zona ? `<span class="inline-flex items-center gap-1 text-xs text-gray-600 dark:text-gray-300"><span>${cat?.icone || '📦'}</span> ${zona.nome}</span>` : `<span class="text-xs text-gray-400">—</span>`}
        </td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${formatDate(p.validade)}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${p.temperatura != null ? p.temperatura + '°C' : '—'}</td>
        <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">${p.quantidade || '—'}</td>
        <td class="px-4 py-3">
          <span class="badge ${risk.color}">${risk.label}</span>
        </td>
        <td class="px-4 py-3 text-right">
          <div class="flex items-center justify-end gap-1">
            ${risk.label === 'Crítico' ? `
              <button onclick="openTelegramModal('${p.id}')" class="btn-icon !w-8 !h-8 !rounded-full !bg-red-50 dark:!bg-red-900/20 !text-red-500 hover:!bg-red-100 dark:hover:!bg-red-900/40 !border-red-200 dark:!border-red-800" title="Simular alerta Telegram">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path d="M8.25 9.75h4.5a4.5 4.5 0 010 9h-4.5m2.25-12.75h6m-6 3h6m-3-3v3m-6 0h6m-6 3h6m-3-3v3m-6 3h6m-6 3h6m-3-3v3"/>
                </svg>
              </button>
            ` : ''}
            <button onclick="deleteLot('${p.id}')" class="btn-icon !w-8 !h-8 !rounded-full !bg-gray-50 dark:!bg-gray-800/20 !text-gray-400 hover:!bg-red-50 dark:hover:!bg-red-900/20 hover:!text-red-500 !border-gray-200 dark:!border-gray-700" title="Excluir">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.innerHTML = html;
  updateCounts();
  renderZonaFilters();
}

// =============================================
// Filtro por Zona
// =============================================

function renderZonaFilters() {
  const container = document.getElementById('zona-filters');
  if (!container) return;

  const zonas = getZonas();

  let html = `
    <button class="zona-filter-tab px-2.5 py-1 text-xs font-medium rounded-md transition-all ${currentZonaFilter === 'todas' ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'}" onclick="setZonaFilter('todas')">
      🌐 Todas as zonas
    </button>
  `;

  zonas.forEach(z => {
    const count = getProducts().filter(p => p.zonaId === z.id).length;
    const cat = CATEGORIAS.find(c => c.id === z.categoria);
    const active = currentZonaFilter === z.id;
    html += `
      <button class="zona-filter-tab px-2.5 py-1 text-xs font-medium rounded-md transition-all ${active ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50'}" onclick="setZonaFilter('${z.id}')">
        ${cat?.icone || '📦'} ${z.nome} <span class="opacity-60">(${count})</span>
      </button>
    `;
  });

  container.innerHTML = html;
}

function setZonaFilter(zonaId) {
  currentZonaFilter = zonaId;
  renderTable(currentFilter, zonaId);
}

// =============================================
// Atualizar contadores
// =============================================

function updateCounts() {
  const products = getProducts();
  let baixo = 0, medio = 0, critico = 0;
  products.forEach(p => {
    const status = getRiskStatus(p.ecoScore || 0).label;
    if (status === 'Baixo') baixo++;
    else if (status === 'Médio') medio++;
    else critico++;
  });

  const el = (id) => document.getElementById(id);
  if (el('count-total')) el('count-total').textContent = products.length;
  if (el('count-baixo')) el('count-baixo').textContent = baixo;
  if (el('count-medio')) el('count-medio').textContent = medio;
  if (el('count-critico')) el('count-critico').textContent = critico;

  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.filter === currentFilter);
  });
}

function setFilter(filter) {
  renderTable(filter, currentZonaFilter);
}

// =============================================
// Excluir lote
// =============================================

function deleteLot(id) {
  const product = getProductById(id);
  if (!product) return;
  if (!confirm(`Excluir "${product.nome}" permanentemente?`)) return;

  deleteProduct(id);
  renderTable(currentFilter, currentZonaFilter);
  initCharts();
  renderZonas();
  showToast(`"${product.nome}" excluído.`, 'info');
}

// =============================================
// Modal Telegram (simulação de integração)
// =============================================

function openTelegramModal(productId) {
  const product = getProductById(productId);
  if (!product) return;

  const modal = document.getElementById('telegram-modal');
  const overlay = document.getElementById('telegram-overlay');
  const modalBox = document.getElementById('telegram-modal-box');
  if (!modal || !overlay || !modalBox) return;

  const eco = { score: product.ecoScore || 0 };

  modalBox.querySelector('[data-field="produto"]').textContent = product.nome;
  modalBox.querySelector('[data-field="lote"]').textContent = product.lote || 'N/A';
  modalBox.querySelector('[data-field="validade"]').textContent = formatDate(product.validade);
  modalBox.querySelector('[data-field="temperatura"]').textContent = product.temperatura != null ? `${product.temperatura}°C` : 'N/A';
  modalBox.querySelector('[data-field="risco"]').textContent = 'CRÍTICO';
  modalBox.querySelector('[data-field="ecoscore"]').textContent = `${eco.score}/100`;

  const now = new Date();
  modalBox.querySelector('[data-field="timestamp"]').textContent =
    now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');

  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    overlay.classList.add('opacity-100');
    modalBox.classList.remove('scale-95', 'opacity-0');
    modalBox.classList.add('scale-100', 'opacity-100');
  });
}

function closeTelegramModal() {
  const modal = document.getElementById('telegram-modal');
  const overlay = document.getElementById('telegram-overlay');
  const modalBox = document.getElementById('telegram-modal-box');
  if (overlay) { overlay.classList.remove('opacity-100'); overlay.classList.add('opacity-0'); }
  if (modalBox) { modalBox.classList.remove('scale-100', 'opacity-100'); modalBox.classList.add('scale-95', 'opacity-0'); }
  setTimeout(() => {
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
  }, 300);
}

// =============================================
// Zonas de Armazenamento — Modal
// =============================================

let zonaSimInterval = null;

function openZonaModal() {
  const modal = document.getElementById('zona-modal');
  const overlay = document.getElementById('zona-modal-overlay');
  const box = document.getElementById('zona-modal-box');
  if (!modal || !overlay || !box) return;

  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');

  requestAnimationFrame(() => {
    overlay.classList.remove('opacity-0');
    overlay.classList.add('opacity-100');
    box.classList.remove('scale-95', 'opacity-0');
    box.classList.add('scale-100', 'opacity-100');
  });
}

function closeZonaModal() {
  const modal = document.getElementById('zona-modal');
  const overlay = document.getElementById('zona-modal-overlay');
  const box = document.getElementById('zona-modal-box');
  if (overlay) { overlay.classList.remove('opacity-100'); overlay.classList.add('opacity-0'); }
  if (box) { box.classList.remove('scale-100', 'opacity-100'); box.classList.add('scale-95', 'opacity-0'); }
  setTimeout(() => {
    if (modal) modal.classList.add('hidden');
    if (overlay) overlay.classList.add('hidden');
  }, 300);
}

document.addEventListener('DOMContentLoaded', () => {
  const catSelect = document.getElementById('zona-categoria');
  if (catSelect) {
    catSelect.addEventListener('change', () => {
      const cat = CATEGORIAS.find(c => c.id === catSelect.value);
      if (cat) {
        document.getElementById('zona-nome').value = cat.nome;
        document.getElementById('zona-temp-ideal').value = cat.tempIdeal;
        document.getElementById('zona-temp-min').value = cat.tempMin;
        document.getElementById('zona-temp-max').value = cat.tempMax;
        document.getElementById('zona-umid-ideal').value = cat.umidIdeal;
        document.getElementById('zona-umid-min').value = cat.umidMin;
        document.getElementById('zona-umid-max').value = cat.umidMax;
      }
    });
  }

  const zonaForm = document.getElementById('zona-form');
  if (zonaForm) {
    zonaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = document.getElementById('zona-nome').value.trim();
      if (!nome) { showToast('Informe o nome da zona.', 'error'); return; }

      const zona = {
        nome,
        categoria: document.getElementById('zona-categoria').value || 'personalizado',
        tempIdeal: parseFloat(document.getElementById('zona-temp-ideal').value) || 0,
        tempMin: parseFloat(document.getElementById('zona-temp-min').value) || 0,
        tempMax: parseFloat(document.getElementById('zona-temp-max').value) || 0,
        umidIdeal: parseFloat(document.getElementById('zona-umid-ideal').value) || 0,
        umidMin: parseFloat(document.getElementById('zona-umid-min').value) || 0,
        umidMax: parseFloat(document.getElementById('zona-umid-max').value) || 0,
      };

      addZona(zona);
      showToast(`Zona "${zona.nome}" adicionada!`, 'success');
      zonaForm.reset();
      closeZonaModal();
      renderZonas();
      renderZonaFilters();
    });
  }
});

// =============================================
// Zonas de Armazenamento — Render
// =============================================

function renderZonas() {
  const grid = document.getElementById('zonas-grid');
  const empty = document.getElementById('zonas-empty');
  if (!grid) return;

  const zonas = getZonas();

  if (zonas.length === 0) {
    grid.innerHTML = '';
    if (empty) empty.classList.remove('hidden');
    return;
  }

  if (empty) empty.classList.add('hidden');

  grid.innerHTML = zonas.map(z => {
    const avaliacao = avaliarZona(z);
    const t = z.leituraAtual?.temperatura;
    const u = z.leituraAtual?.umidade;
    const cat = CATEGORIAS.find(c => c.id === z.categoria);
    const produtos = getProductsByZona(z.id);
    const qtd = produtos.length;

    const tempDiff = Math.abs(t - z.tempIdeal);
    const umidDiff = Math.abs(u - z.umidIdeal);
    const tempRange = Math.max(1, z.tempMax - z.tempMin);
    const umidRange = Math.max(1, z.umidMax - z.umidMin);
    const tempHealth = Math.max(0, 100 - (tempDiff / tempRange) * 100);
    const umidHealth = Math.max(0, 100 - (umidDiff / umidRange) * 100);
    const health = Math.round((tempHealth + umidHealth) / 2);

    let barColor, barBg;
    if (health >= 80) { barColor = 'bg-emerald-500'; barBg = 'bg-emerald-100 dark:bg-emerald-900/30'; }
    else if (health >= 50) { barColor = 'bg-yellow-500'; barBg = 'bg-yellow-100 dark:bg-yellow-900/30'; }
    else { barColor = 'bg-red-500'; barBg = 'bg-red-100 dark:bg-red-900/30'; }

    return `
      <div class="glass-card p-4 hover:translate-y-0 transition-all cursor-pointer" onclick="setZonaFilter('${z.id}')" data-zona-id="${z.id}">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span class="text-xl">${cat?.icone || '📦'}</span>
            <div>
              <p class="text-sm font-semibold text-gray-900 dark:text-white">${z.nome}</p>
              <p class="text-xs text-gray-400">${cat?.nome || 'Personalizado'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            ${qtd > 0 ? `<span class="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">${qtd} ${qtd === 1 ? 'item' : 'itens'}</span>` : ''}
            <button onclick="event.stopPropagation(); deleteZonaConfirm('${z.id}')" class="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mb-3">
          <div class="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 text-center">
            <p class="text-xs text-gray-400 mb-1">Temperatura</p>
            <p class="text-xl font-bold ${avaliacao.status === 'crítico' ? 'text-red-500' : avaliacao.status === 'alerta' ? 'text-yellow-500' : 'text-emerald-500'}">
              ${t != null ? t + '°' : '—'}
            </p>
            <p class="text-xs text-gray-400">Ideal: ${z.tempIdeal}°C</p>
          </div>
          <div class="bg-gray-50 dark:bg-gray-800/30 rounded-lg p-3 text-center">
            <p class="text-xs text-gray-400 mb-1">Umidade</p>
            <p class="text-xl font-bold ${avaliacao.status === 'crítico' ? 'text-red-500' : avaliacao.status === 'alerta' ? 'text-yellow-500' : 'text-emerald-500'}">
              ${u != null ? u + '%' : '—'}
            </p>
            <p class="text-xs text-gray-400">Ideal: ${z.umidIdeal}%</p>
          </div>
        </div>

        <div class="mb-2">
          <div class="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Saúde do ambiente</span>
            <span class="font-semibold ${health >= 80 ? 'text-emerald-500' : health >= 50 ? 'text-yellow-500' : 'text-red-500'}">${health}%</span>
          </div>
          <div class="h-1.5 ${barBg} rounded-full overflow-hidden">
            <div class="h-full ${barColor} rounded-full transition-all duration-700 ease-out" style="width: ${health}%"></div>
          </div>
        </div>

        <div class="flex items-center justify-between">
          <span class="badge ${avaliacao.color}">${avaliacao.label}</span>
          <span class="text-xs text-gray-400">
            ${z.tempMin}°C–${z.tempMax}°C · ${z.umidMin}%–${z.umidMax}%
          </span>
        </div>
      </div>
    `;
  }).join('');
}

function deleteZonaConfirm(id) {
  const zona = getZonaById(id);
  if (!zona) return;

  const produtos = getProductsByZona(id);
  let msg = `Excluir zona "${zona.nome}" permanentemente?`;
  if (produtos.length > 0) {
    msg = `Excluir "${zona.nome}"? ${produtos.length} ${produtos.length === 1 ? 'produto está' : 'produtos estão'} associado${produtos.length === 1 ? '' : 's'} a esta zona e ficará${produtos.length === 1 ? '' : 'ão'} sem zona definida.`;
  }

  if (!confirm(msg)) return;
  deleteZona(id);
  renderZonas();
  renderZonaFilters();
  if (currentZonaFilter === id) {
    setZonaFilter('todas');
  } else {
    renderTable(currentFilter, currentZonaFilter);
  }
  showToast(`Zona "${zona.nome}" excluída.`, 'info');
}

// =============================================
// Simulação de leituras (tempo real)
// =============================================

function startZonaSimulation() {
  if (zonaSimInterval) clearInterval(zonaSimInterval);

  zonaSimInterval = setInterval(() => {
    const zonas = getZonas();
    if (zonas.length === 0) return;

    let mudou = false;
    zonas.forEach(z => {
      simularLeitura(z);
      mudou = true;
    });

    if (mudou) {
      saveZonas(zonas);
      renderZonas();
    }
  }, 3000);
}

// =============================================
// Zonas mockadas iniciais
// =============================================

function seedZonas() {
  if (getZonas().length > 0) return;

  const defaults = [
    { nome: 'Freezer', categoria: 'freezer', tempIdeal: -18, tempMin: -22, tempMax: -5, umidIdeal: 30, umidMin: 20, umidMax: 40 },
    { nome: 'Geladeira Principal', categoria: 'geladeira', tempIdeal: 4, tempMin: 1, tempMax: 8, umidIdeal: 80, umidMin: 70, umidMax: 90 },
    { nome: 'Estoque Seco', categoria: 'estoque', tempIdeal: 25, tempMin: 20, tempMax: 30, umidIdeal: 60, umidMin: 45, umidMax: 75 },
  ];

  defaults.forEach(d => addZona(d));
}

// =============================================
// Inicialização
// =============================================

document.addEventListener('DOMContentLoaded', () => {
  seedZonas();
  renderZonas();
  startZonaSimulation();
  renderZonaFilters();
  initCharts();
  renderTable('todos');
});
